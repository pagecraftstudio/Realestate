import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import type {
  CreateBuildingInput,
  UpdateBuildingInput,
  ListBuildingsQuery,
} from './buildings.schema.js'

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

function buildingSelect() {
  return {
    id: true,
    organizationId: true,
    projectId: true,
    name: true,
    buildingNumber: true,
    floorsCount: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    project: { select: { id: true, name: true } },
    _count: { select: { floors: true, units: true } },
  } as const
}

async function assertProjectOwnership(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  })
  if (!project) throw new NotFoundError('Project not found')
}

export async function createBuilding(actor: AuthUser, data: CreateBuildingInput) {
  await assertProjectOwnership(actor.organizationId, data.projectId)

  // Auto-create floors when building is created
  const building = await prisma.building.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      name: data.name,
      buildingNumber: data.buildingNumber,
      floorsCount: data.floorsCount,
      description: data.description,
      floors: {
        create: Array.from({ length: data.floorsCount }, (_, i) => ({
          floorNumber: i + 1,
          label: i === 0 ? 'Ground Floor' : `Floor ${i + 1}`,
        })),
      },
    },
    select: buildingSelect(),
  })
  return building
}

export async function listBuildings(actor: AuthUser, query: ListBuildingsQuery) {
  const { page, limit, projectId, search } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...(projectId && { projectId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { buildingNumber: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [buildings, total] = await Promise.all([
    prisma.building.findMany({
      where,
      select: buildingSelect(),
      orderBy: [{ project: { name: 'asc' } }, { name: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.building.count({ where }),
  ])

  return { data: buildings, meta: { page, limit, total, pages: Math.ceil(total / limit) } }
}

export async function getBuilding(actor: AuthUser, buildingId: string) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, organizationId: actor.organizationId },
    select: {
      ...buildingSelect(),
      floors: {
        select: {
          id: true,
          floorNumber: true,
          label: true,
          _count: { select: { units: true } },
        },
        orderBy: { floorNumber: 'asc' },
      },
    },
  })
  if (!building) throw new NotFoundError('Building not found')
  return building
}

export async function updateBuilding(
  actor: AuthUser,
  buildingId: string,
  data: UpdateBuildingInput,
) {
  const existing = await prisma.building.findFirst({
    where: { id: buildingId, organizationId: actor.organizationId },
    select: { id: true, floorsCount: true },
  })
  if (!existing) throw new NotFoundError('Building not found')

  // If floorsCount increased, create new floors
  const updates: Promise<unknown>[] = [
    prisma.building.update({
      where: { id: buildingId },
      data,
      select: buildingSelect(),
    }),
  ]

  if (data.floorsCount && data.floorsCount > existing.floorsCount) {
    for (let i = existing.floorsCount + 1; i <= data.floorsCount; i++) {
      updates.push(
        prisma.floor.upsert({
          where: { buildingId_floorNumber: { buildingId, floorNumber: i } },
          create: { buildingId, floorNumber: i, label: `Floor ${i}` },
          update: {},
        }),
      )
    }
  }

  const [updatedBuilding] = await Promise.all(updates)
  return updatedBuilding
}

export async function deleteBuilding(actor: AuthUser, buildingId: string) {
  const existing = await prisma.building.findFirst({
    where: { id: buildingId, organizationId: actor.organizationId },
    select: { id: true, _count: { select: { units: true } } },
  })
  if (!existing) throw new NotFoundError('Building not found')

  if (existing._count.units > 0) {
    const err = new Error('Cannot delete building with existing units.')
    ;(err as any).statusCode = 409
    throw err
  }

  await prisma.building.delete({ where: { id: buildingId } })
  return { success: true }
}
