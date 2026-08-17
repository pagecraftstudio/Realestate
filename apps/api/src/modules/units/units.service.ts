import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { UnitStatus } from '../../lib/enums.js'
import type {
  CreateUnitInput,
  UpdateUnitInput,
  ListUnitsQuery,
  BulkUpdateStatusInput,
} from './units.schema.js'

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}
export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(msg: string) { super(msg); this.name = 'ConflictError' }
}

// ─── Immutable status transitions ────────────────────────────────────────────
// A sold/contracted unit cannot be made available via a simple status update.
// Those transitions must go through deal/reservation cancellation flows.

const BLOCKED_DIRECT_TRANSITIONS = new Map<UnitStatus, UnitStatus[]>([
  [UnitStatus.SOLD, [UnitStatus.AVAILABLE, UnitStatus.ON_HOLD]],
  [UnitStatus.CONTRACTED, [UnitStatus.AVAILABLE, UnitStatus.ON_HOLD]],
])

function assertStatusTransition(from: UnitStatus, to: UnitStatus) {
  const blocked = BLOCKED_DIRECT_TRANSITIONS.get(from)
  if (blocked?.includes(to)) {
    throw new ConflictError(
      `Cannot change unit status from ${from} to ${to} directly. Cancel the deal/reservation first.`,
    )
  }
}

// ─── Select shape ─────────────────────────────────────────────────────────────

function unitSelect() {
  return {
    id: true,
    organizationId: true,
    projectId: true,
    buildingId: true,
    floorId: true,
    unitNumber: true,
    unitType: true,
    propertyType: true,
    status: true,
    area: true,
    builtUpArea: true,
    bedrooms: true,
    bathrooms: true,
    parking: true,
    view: true,
    orientation: true,
    finishing: true,
    price: true,
    pricePerMeter: true,
    serviceCharge: true,
    imageUrls: true,
    deliveryDate: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    project: { select: { id: true, name: true } },
    building: { select: { id: true, name: true } },
    floor: { select: { id: true, floorNumber: true, label: true } },
  } as const
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createUnit(actor: AuthUser, data: CreateUnitInput) {
  // Verify project belongs to org
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!project) throw new NotFoundError('Project not found')

  // Verify building if provided
  if (data.buildingId) {
    const building = await prisma.building.findFirst({
      where: { id: data.buildingId, organizationId: actor.organizationId },
      select: { id: true },
    })
    if (!building) throw new NotFoundError('Building not found')
  }

  // Verify floor if provided
  if (data.floorId) {
    const floor = await prisma.floor.findFirst({
      where: {
        id: data.floorId,
        building: { organizationId: actor.organizationId },
      },
      select: { id: true },
    })
    if (!floor) throw new NotFoundError('Floor not found')
  }

  return prisma.unit.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      buildingId: data.buildingId,
      floorId: data.floorId,
      unitNumber: data.unitNumber,
      unitType: data.unitType,
      propertyType: data.propertyType,
      area: data.area,
      builtUpArea: data.builtUpArea,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      parking: data.parking,
      view: data.view,
      orientation: data.orientation,
      finishing: data.finishing,
      price: data.price,
      pricePerMeter: data.pricePerMeter,
      serviceCharge: data.serviceCharge,
      imageUrls: data.imageUrls,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      notes: data.notes,
    },
    select: unitSelect(),
  })
}

export async function listUnits(actor: AuthUser, query: ListUnitsQuery) {
  const {
    page, limit,
    projectId, buildingId, floorId,
    status, unitType, propertyType, finishing,
    search, minPrice, maxPrice, minArea, maxArea, bedrooms,
  } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...(projectId && { projectId }),
    ...(buildingId && { buildingId }),
    ...(floorId && { floorId }),
    ...(status && { status }),
    ...(unitType && { unitType }),
    ...(propertyType && { propertyType }),
    ...(finishing && { finishing }),
    ...(bedrooms !== undefined && { bedrooms }),
    ...(minPrice || maxPrice
      ? {
          price: {
            ...(minPrice && { gte: minPrice }),
            ...(maxPrice && { lte: maxPrice }),
          },
        }
      : {}),
    ...(minArea || maxArea
      ? {
          area: {
            ...(minArea && { gte: minArea }),
            ...(maxArea && { lte: maxArea }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { unitNumber: { contains: search, mode: 'insensitive' as const } },
        { view: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [units, total] = await Promise.all([
    prisma.unit.findMany({
      where,
      select: unitSelect(),
      orderBy: [{ building: { name: 'asc' } }, { unitNumber: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.unit.count({ where }),
  ])

  return { data: units, meta: { page, limit, total, pages: Math.ceil(total / limit) } }
}

export async function getUnit(actor: AuthUser, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, organizationId: actor.organizationId },
    select: {
      ...unitSelect(),
      reservation: {
        select: {
          id: true,
          status: true,
          reservationDate: true,
          expiresAt: true,
          customer: { select: { id: true, fullName: true, phone: true } },
        },
      },
      deal: {
        select: {
          id: true,
          status: true,
          netSaleValue: true,
          pipelineStage: true,
          customer: { select: { id: true, fullName: true } },
          agent: {
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
      viewings: {
        where: { status: { not: 'CANCELLED' } },
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          outcome: true,
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      },
    },
  })
  if (!unit) throw new NotFoundError('Unit not found')
  return unit
}

export async function updateUnit(actor: AuthUser, unitId: string, data: UpdateUnitInput) {
  const existing = await prisma.unit.findFirst({
    where: { id: unitId, organizationId: actor.organizationId },
    select: { id: true, status: true },
  })
  if (!existing) throw new NotFoundError('Unit not found')

  if (data.status) {
    assertStatusTransition(existing.status, data.status)
  }

  return prisma.unit.update({
    where: { id: unitId },
    data: {
      ...data,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
    },
    select: unitSelect(),
  })
}

export async function deleteUnit(actor: AuthUser, unitId: string) {
  const existing = await prisma.unit.findFirst({
    where: { id: unitId, organizationId: actor.organizationId },
    select: {
      id: true,
      status: true,
      reservation: { select: { id: true } },
      deal: { select: { id: true } },
    },
  })
  if (!existing) throw new NotFoundError('Unit not found')

  if (existing.reservation || existing.deal) {
    throw new ConflictError('Cannot delete unit with active reservation or deal.')
  }

  if (([UnitStatus.RESERVED, UnitStatus.SOLD, UnitStatus.CONTRACTED, UnitStatus.ON_HOLD] as string[]).includes(existing.status)) {
    throw new ConflictError('Cannot delete reserved, contracted, or sold unit.')
  }

  await prisma.unit.delete({ where: { id: unitId } })
  return { success: true }
}

export async function bulkUpdateStatus(actor: AuthUser, data: BulkUpdateStatusInput) {
  // All units must belong to org
  const units = await prisma.unit.findMany({
    where: {
      id: { in: data.unitIds },
      organizationId: actor.organizationId,
    },
    select: { id: true, status: true },
  })

  if (units.length !== data.unitIds.length) {
    throw new NotFoundError('One or more units not found or not accessible.')
  }

  // Validate all transitions
  for (const unit of units) {
    assertStatusTransition(unit.status, data.status)
  }

  const updated = await prisma.unit.updateMany({
    where: {
      id: { in: data.unitIds },
      organizationId: actor.organizationId,
    },
    data: { status: data.status },
  })

  return { updated: updated.count }
}

// ─── Availability check ───────────────────────────────────────────────────────

export async function checkAvailability(actor: AuthUser, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, organizationId: actor.organizationId },
    select: {
      id: true,
      unitNumber: true,
      status: true,
      price: true,
      reservation: {
        where: { status: 'ACTIVE' },
        select: { id: true, expiresAt: true },
      },
    },
  })
  if (!unit) throw new NotFoundError('Unit not found')

  return {
    unitId: unit.id,
    unitNumber: unit.unitNumber,
    status: unit.status,
    price: unit.price,
    isAvailable: unit.status === UnitStatus.AVAILABLE,
    activeReservation: unit.reservation ?? null,
  }
}
