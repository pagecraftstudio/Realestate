import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'
import { UserRole, UserStatus } from '@prisma/client'
import type {
  InviteUserInput,
  UpdateUserInput,
  UpdateMyProfileInput,
  ListUsersQuery,
} from './users.schema.js'
import type { AuthUser } from '../../types/auth.js'

const BCRYPT_ROUNDS = 12

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function userSelect() {
  return {
    id: true,
    email: true,
    role: true,
    status: true,
    organizationId: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    profile: {
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        whatsapp: true,
        avatarUrl: true,
        title: true,
        bio: true,
      },
    },
    teamMemberships: {
      select: {
        isLead: true,
        team: { select: { id: true, name: true } },
      },
    },
    _count: {
      select: {
        assignedLeads: true,
        agentDeals:    true,
        agentViewings: true,
      },
    },
  } as const
}

function assertSameOrg(actor: AuthUser, targetOrgId: string): void {
  if (actor.organizationId !== targetOrgId) {
    throw new ForbiddenError('Cross-tenant access denied')
  }
}

// ─── List Users ───────────────────────────────────────────────────────────────

export async function listUsers(actor: AuthUser, query: ListUsersQuery) {
  const { page, limit, role, status, search, teamId } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(teamId
      ? { teamMemberships: { some: { teamId } } }
      : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            {
              profile: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' as const } },
                  { lastName: { contains: search, mode: 'insensitive' as const } },
                ],
              },
            },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect(),
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: users,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Get User ─────────────────────────────────────────────────────────────────

export async function getUser(actor: AuthUser, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect(),
  })
  if (!user) throw new NotFoundError('User not found')
  assertSameOrg(actor, user.organizationId)
  return user
}

// ─── Invite User ──────────────────────────────────────────────────────────────

export async function inviteUser(actor: AuthUser, input: InviteUserInput) {
  // Only COMPANY_ADMIN can invite users
  if (
    actor.role !== UserRole.COMPANY_ADMIN &&
    actor.role !== UserRole.SUPER_ADMIN
  ) {
    throw new ForbiddenError('Only COMPANY_ADMIN can invite users')
  }

  // Check email unique within org
  const existing = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase(), organizationId: actor.organizationId },
    select: { id: true, organizationId: true },
  })
  if (existing) {
    throw new ConflictError('Email already registered')
  }

  const passwordHash = await bcrypt.hash(input.temporaryPassword, BCRYPT_ROUNDS)

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        organizationId: actor.organizationId,
        email: input.email,
        passwordHash,
        role: input.role,
        status: UserStatus.INVITED,
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone ?? null,
            title: input.title ?? null,
          },
        },
      },
      select: userSelect(),
    })

    if (input.teamId) {
      // Verify team belongs to org
      const team = await tx.team.findUnique({
        where: { id: input.teamId },
        select: { organizationId: true },
      })
      if (!team || team.organizationId !== actor.organizationId) {
        throw new NotFoundError('Team not found')
      }
      await tx.teamMember.create({
        data: { teamId: input.teamId, userId: newUser.id, isLead: false },
      })
    }

    return newUser
  })

  return user
}

// ─── Update User (admin) ──────────────────────────────────────────────────────

export async function updateUser(
  actor: AuthUser,
  userId: string,
  input: UpdateUserInput,
) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, role: true },
  })
  if (!target) throw new NotFoundError('User not found')
  assertSameOrg(actor, target.organizationId)

  // Prevent downgrading another COMPANY_ADMIN unless you are one
  if (
    target.role === UserRole.COMPANY_ADMIN &&
    actor.role !== UserRole.COMPANY_ADMIN &&
    actor.role !== UserRole.SUPER_ADMIN
  ) {
    throw new ForbiddenError('Cannot modify another COMPANY_ADMIN')
  }

  // Prevent self-demotion (company admin only check)
  if (
    actor.userId === userId &&
    input.role &&
    input.role !== UserRole.COMPANY_ADMIN &&
    actor.role === UserRole.COMPANY_ADMIN
  ) {
    throw new ForbiddenError('Cannot demote yourself')
  }

  const { firstName, lastName, phone, whatsapp, title, bio, ...userFields } = input

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...userFields,
      profile: {
        update: {
          ...(firstName !== undefined ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(whatsapp !== undefined ? { whatsapp } : {}),
          ...(title !== undefined ? { title } : {}),
          ...(bio !== undefined ? { bio } : {}),
        },
      },
    },
    select: userSelect(),
  })

  return updated
}

// ─── Update My Profile ────────────────────────────────────────────────────────

export async function updateMyProfile(
  actor: AuthUser,
  input: UpdateMyProfileInput,
) {
  const { firstName, lastName, phone, whatsapp, title, bio } = input

  const updated = await prisma.user.update({
    where: { id: actor.userId },
    data: {
      profile: {
        update: {
          ...(firstName !== undefined ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(whatsapp !== undefined ? { whatsapp } : {}),
          ...(title !== undefined ? { title } : {}),
          ...(bio !== undefined ? { bio } : {}),
        },
      },
    },
    select: userSelect(),
  })

  return updated
}

// ─── Deactivate / Reactivate ──────────────────────────────────────────────────

export async function setUserStatus(
  actor: AuthUser,
  userId: string,
  status: UserStatus,
) {
  if (actor.userId === userId) {
    throw new ForbiddenError('Cannot change your own status')
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true },
  })
  if (!target) throw new NotFoundError('User not found')
  assertSameOrg(actor, target.organizationId)

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: userSelect(),
  })
}

// ─── Reset Password (admin) ───────────────────────────────────────────────────

export async function adminResetPassword(
  actor: AuthUser,
  userId: string,
  newPassword: string,
) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true },
  })
  if (!target) throw new NotFoundError('User not found')
  assertSameOrg(actor, target.organizationId)

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash, status: UserStatus.ACTIVE },
  })
}
