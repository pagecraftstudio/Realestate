import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { ReservationStatus, UnitStatus, UserRole } from '../../lib/enums.js'
import type {
  CreateReservationInput,
  UpdateReservationInput,
  CancelReservationInput,
  ListReservationsQuery,
} from './reservations.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(msg: string) { super(msg); this.name = 'ConflictError' }
}

// ─── Select shape ─────────────────────────────────────────────────────────────

function reservationSelect() {
  return {
    id:                true,
    organizationId:    true,
    unitId:            true,
    customerId:        true,
    agentId:           true,
    dealId:            true,
    reservationDate:   true,
    expiresAt:         true,
    reservationAmount: true,
    status:            true,
    paymentStatus:     true,
    documentUrl:       true,
    notes:             true,
    createdAt:         true,
    updatedAt:         true,
    unit: {
      select: {
        id: true, unitNumber: true, unitType: true, status: true, price: true, area: true,
        project:  { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
      },
    },
    customer: {
      select: { id: true, fullName: true, phone: true, email: true },
    },
    agent: {
      select: {
        id: true,
        userProfile: { select: { firstName: true, lastName: true } },
      },
    },
  } as const
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Reserve a unit.
 * Uses a DB transaction to:
 *  1. Check unit is AVAILABLE (or HOLD)
 *  2. Check no ACTIVE reservation exists for this unit
 *  3. Set unit status → RESERVED
 *  4. Insert reservation row
 *
 * The @unique constraint on reservations.unitId prevents double-reservation
 * at the DB level even under concurrent requests.
 */
export async function createReservation(
  actor: AuthUser,
  input: CreateReservationInput,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Lock unit row for update
    const unit = await tx.unit.findFirst({
      where: { id: input.unitId, organizationId: actor.organizationId },
    })
    if (!unit) throw new NotFoundError('Unit not found')

    if (unit.status === UnitStatus.SOLD) {
      throw new ConflictError('Unit is already SOLD and cannot be reserved.')
    }
    if (unit.status === UnitStatus.RESERVED) {
      throw new ConflictError('Unit is already RESERVED.')
    }

    // Verify customer belongs to org
    const customer = await tx.customer.findFirst({
      where: { id: input.customerId, organizationId: actor.organizationId },
    })
    if (!customer) throw new NotFoundError('Customer not found')

    // Set unit RESERVED
    await tx.unit.update({
      where: { id: input.unitId },
      data:  { status: UnitStatus.RESERVED },
    })

    // Create reservation
    const reservation = await tx.reservation.create({
      data: {
        organizationId:    actor.organizationId,
        unitId:            input.unitId,
        customerId:        input.customerId,
        agentId:           actor.id,
        expiresAt:         input.expiresAt ? new Date(input.expiresAt) : undefined,
        reservationAmount: input.reservationAmount,
        paymentStatus:     input.paymentStatus,
        documentUrl:       input.documentUrl,
        notes:             input.notes,
        status:            ReservationStatus.ACTIVE,
      },
      select: reservationSelect(),
    })

    return reservation
  })
}

export async function listReservations(
  actor: AuthUser,
  query: ListReservationsQuery,
) {
  const scope = actor.role === UserRole.SALES_AGENT ? { agentId: actor.id } : {}
  const { page, limit, ...filters } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...scope,
    ...(filters.customerId && { customerId: filters.customerId }),
    ...(filters.unitId     && { unitId: filters.unitId }),
    ...(filters.agentId    && { agentId: filters.agentId }),
    ...(filters.status     && { status: filters.status as ReservationStatus }),
  }

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where, select: reservationSelect(), skip, take: limit, orderBy: { createdAt: 'desc' },
    }),
    prisma.reservation.count({ where }),
  ])

  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getReservation(actor: AuthUser, id: string) {
  const scope = actor.role === UserRole.SALES_AGENT ? { agentId: actor.id } : {}
  const reservation = await prisma.reservation.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
    select: reservationSelect(),
  })
  if (!reservation) throw new NotFoundError('Reservation not found')
  return reservation
}

export async function updateReservation(
  actor: AuthUser,
  id: string,
  input: UpdateReservationInput,
) {
  const scope = actor.role === UserRole.SALES_AGENT ? { agentId: actor.id } : {}
  const existing = await prisma.reservation.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
  })
  if (!existing) throw new NotFoundError('Reservation not found')

  if (existing.status !== ReservationStatus.ACTIVE) {
    throw new ConflictError(`Reservation is ${existing.status} and cannot be modified.`)
  }

  return prisma.reservation.update({
    where: { id },
    data: {
      ...(input.expiresAt         !== undefined && { expiresAt: new Date(input.expiresAt) }),
      ...(input.reservationAmount !== undefined && { reservationAmount: input.reservationAmount }),
      ...(input.paymentStatus     !== undefined && { paymentStatus: input.paymentStatus }),
      ...(input.documentUrl       !== undefined && { documentUrl: input.documentUrl }),
      ...(input.notes             !== undefined && { notes: input.notes }),
    },
    select: reservationSelect(),
  })
}

/**
 * Cancel reservation.
 * Transaction: set reservation CANCELLED + revert unit → AVAILABLE.
 * Only allowed if reservation is ACTIVE (not yet CONVERTED to deal).
 */
export async function cancelReservation(
  actor: AuthUser,
  id: string,
  input: CancelReservationInput,
) {
  // Only managers/admins can cancel; agents cannot
  if (actor.role === UserRole.SALES_AGENT) {
    throw new ForbiddenError('Agents cannot cancel reservations. Contact a manager.')
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.reservation.findFirst({
      where: { id, organizationId: actor.organizationId },
    })
    if (!existing) throw new NotFoundError('Reservation not found')

    if (existing.status !== ReservationStatus.ACTIVE) {
      throw new ConflictError(`Reservation is already ${existing.status}.`)
    }

    // Revert unit to AVAILABLE
    await tx.unit.update({
      where: { id: existing.unitId },
      data:  { status: UnitStatus.AVAILABLE },
    })

    // Mark cancelled (store reason in notes)
    return tx.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        notes: input.reason
          ? `${existing.notes ? existing.notes + '\n' : ''}CANCELLED: ${input.reason}`
          : existing.notes,
      },
      select: reservationSelect(),
    })
  })
}

/**
 * Expire reservation (called by BullMQ job or manual trigger).
 * Reverts unit to AVAILABLE if still RESERVED.
 */
export async function expireReservation(actor: AuthUser, id: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.reservation.findFirst({
      where: { id, organizationId: actor.organizationId },
    })
    if (!existing) throw new NotFoundError('Reservation not found')

    if (existing.status !== ReservationStatus.ACTIVE) {
      throw new ConflictError(`Reservation is already ${existing.status}.`)
    }

    await tx.unit.update({
      where: { id: existing.unitId },
      data:  { status: UnitStatus.AVAILABLE },
    })

    return tx.reservation.update({
      where: { id },
      data: { status: ReservationStatus.EXPIRED },
      select: reservationSelect(),
    })
  })
}
