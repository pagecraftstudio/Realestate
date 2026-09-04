import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import type { CreateFloorInput, UpdateFloorInput } from './floors.schema.js'

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}
export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(msg: string) { super(msg); this.name = 'ConflictError' }
}

async function assertBuildingOwnership(organizationId: string, buildingId: string) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, organizationId },
    select: { id: true },
  })
  if (!building) throw new NotFoundError('Building not found')
}

export async function createFloor(actor: AuthUser, data: CreateFloorInput) {
  await assertBuildingOwnership(actor.organizationId, data.buildingId)

  try {
    return await prisma.floor.create({
      data: {
        buildingId: data.buildingId,
        floorNumber: data.floorNumber,
        label: data.label ?? `Floor ${data.floorNumber}`,
      },
      select: {
        id: true,
        buildingId: true,
        floorNumber: true,
        label: true,
        createdAt: true,
        _count: { select: { units: true } },
      },
    })
  } catch (e: any) {
    if (e.code === 'P2002') throw new ConflictError(`Floor ${data.floorNumber} already exists in this building`)
    throw e
  }
}

export async function listFloors(actor: AuthUser, buildingId: string) {
  // Verify ownership
  await assertBuildingOwnership(actor.organizationId, buildingId)

  return prisma.floor.findMany({
    where: { buildingId },
    select: {
      id: true,
      buildingId: true,
      floorNumber: true,
      label: true,
      createdAt: true,
      _count: { select: { units: true } },
    },
    orderBy: { floorNumber: 'asc' },
  })
}

export async function updateFloor(actor: AuthUser, floorId: string, data: UpdateFloorInput) {
  const floor = await prisma.floor.findFirst({
    where: { id: floorId, building: { organizationId: actor.organizationId } },
    select: { id: true },
  })
  if (!floor) throw new NotFoundError('Floor not found')

  return prisma.floor.update({
    where: { id: floorId },
    data,
    select: {
      id: true,
      buildingId: true,
      floorNumber: true,
      label: true,
      createdAt: true,
    },
  })
}

export async function deleteFloor(actor: AuthUser, floorId: string) {
  const floor = await prisma.floor.findFirst({
    where: { id: floorId, building: { organizationId: actor.organizationId } },
    select: { id: true, _count: { select: { units: true } } },
  })
  if (!floor) throw new NotFoundError('Floor not found')
  if (floor._count.units > 0) throw new ConflictError('Cannot delete floor with existing units')

  await prisma.floor.delete({ where: { id: floorId } })
  return { success: true }
}
