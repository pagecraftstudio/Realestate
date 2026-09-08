import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import type {
  CreateTeamInput,
  UpdateTeamInput,
  AddTeamMemberInput,
  ListTeamsQuery,
} from './teams.schema.js'

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}
export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(msg: string) { super(msg); this.name = 'ConflictError' }
}
export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

function teamSelect() {
  return {
    id: true,
    name: true,
    description: true,
    organizationId: true,
    createdAt: true,
    updatedAt: true,
    members: {
      select: {
        id: true,
        isLead: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                title: true,
              },
            },
          },
        },
      },
    },
    _count: { select: { members: true, leads: true } },
  } as const
}

async function assertTeamOwnership(
  teamId: string,
  organizationId: string,
): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { organizationId: true },
  })
  if (!team) throw new NotFoundError('Team not found')
  if (team.organizationId !== organizationId) {
    throw new ForbiddenError('Cross-tenant access denied')
  }
}

// ─── List Teams ───────────────────────────────────────────────────────────────

export async function listTeams(actor: AuthUser, query: ListTeamsQuery) {
  const { page, limit, search } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...(search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {}),
  }

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      select: teamSelect(),
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.team.count({ where }),
  ])

  return {
    data: teams,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Get Team ─────────────────────────────────────────────────────────────────

export async function getTeam(actor: AuthUser, teamId: string) {
  await assertTeamOwnership(teamId, actor.organizationId)
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: teamSelect(),
  })
  if (!team) throw new NotFoundError('Team not found')
  return team
}

// ─── Create Team ──────────────────────────────────────────────────────────────

export async function createTeam(actor: AuthUser, input: CreateTeamInput) {
  // Check name unique within org
  const existing = await prisma.team.findFirst({
    where: {
      organizationId: actor.organizationId,
      name: { equals: input.name, mode: 'insensitive' },
    },
    select: { id: true },
  })
  if (existing) throw new ConflictError('Team name already exists in this organization')

  return prisma.team.create({
    data: {
      organizationId: actor.organizationId,
      name: input.name,
      description: input.description ?? null,
    },
    select: teamSelect(),
  })
}

// ─── Update Team ──────────────────────────────────────────────────────────────

export async function updateTeam(
  actor: AuthUser,
  teamId: string,
  input: UpdateTeamInput,
) {
  await assertTeamOwnership(teamId, actor.organizationId)

  if (input.name) {
    const conflict = await prisma.team.findFirst({
      where: {
        organizationId: actor.organizationId,
        name: { equals: input.name, mode: 'insensitive' },
        id: { not: teamId },
      },
      select: { id: true },
    })
    if (conflict) throw new ConflictError('Team name already in use')
  }

  return prisma.team.update({
    where: { id: teamId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    select: teamSelect(),
  })
}

// ─── Delete Team ──────────────────────────────────────────────────────────────

export async function deleteTeam(actor: AuthUser, teamId: string) {
  await assertTeamOwnership(teamId, actor.organizationId)
  await prisma.team.delete({ where: { id: teamId } })
}

// ─── Add Member ───────────────────────────────────────────────────────────────

export async function addTeamMember(
  actor: AuthUser,
  teamId: string,
  input: AddTeamMemberInput,
) {
  await assertTeamOwnership(teamId, actor.organizationId)

  // Verify user belongs to same org
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, organizationId: true },
  })
  if (!user) throw new NotFoundError('User not found')
  if (user.organizationId !== actor.organizationId) {
    throw new ForbiddenError('User is not in your organization')
  }

  // Check already member
  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: input.userId } },
  })
  if (existing) throw new ConflictError('User is already a team member')

  // If setting as lead, unset previous lead first
  if (input.isLead) {
    await prisma.teamMember.updateMany({
      where: { teamId, isLead: true },
      data: { isLead: false },
    })
  }

  const member = await prisma.teamMember.create({
    data: { teamId, userId: input.userId, isLead: input.isLead },
    select: {
      id: true,
      isLead: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
  })

  return member
}

// ─── Remove Member ────────────────────────────────────────────────────────────

export async function removeTeamMember(
  actor: AuthUser,
  teamId: string,
  userId: string,
) {
  await assertTeamOwnership(teamId, actor.organizationId)

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })
  if (!member) throw new NotFoundError('Member not found in team')

  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  })
}

// ─── Set Team Lead ────────────────────────────────────────────────────────────

export async function setTeamLead(
  actor: AuthUser,
  teamId: string,
  userId: string,
) {
  await assertTeamOwnership(teamId, actor.organizationId)

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })
  if (!member) throw new NotFoundError('User is not a member of this team')

  // Unset all leads, then set new one
  await prisma.$transaction([
    prisma.teamMember.updateMany({
      where: { teamId, isLead: true },
      data: { isLead: false },
    }),
    prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { isLead: true },
    }),
  ])

  return getTeam(actor, teamId)
}
