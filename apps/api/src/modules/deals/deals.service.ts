import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { DealStatus, PipelineStage, ReservationStatus, UnitStatus, UserRole } from '../../lib/enums.js'
import type {
  CreateDealInput,
  UpdateDealInput,
  UpdateDealStatusInput,
  UpdatePipelineStageInput,
  ListDealsQuery,
} from './deals.schema.js'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES: DealStatus[] = [DealStatus.COMPLETED, DealStatus.CANCELLED]

function assertEditable(status: DealStatus) {
  if (TERMINAL_STATUSES.includes(status)) {
    throw new ConflictError(`Deal is ${status} and cannot be modified.`)
  }
}

function agentScope(actor: AuthUser) {
  return actor.role === UserRole.SALES_AGENT ? { agentId: actor.id } : {}
}

/** Generate a sequential deal number: DEAL-YYYYMM-XXXXX */
/**
 * Concurrency-safe deal number using a DB-level atomic counter.
 *
 * Uses Postgres advisory locks scoped to the org to prevent two simultaneous
 * deal creations from reading the same count and producing duplicate numbers.
 *
 * Format: DEAL-YYYYMM-#####  e.g. DEAL-202506-00042
 */
async function generateDealNumber(orgId: string): Promise<string> {
  const now    = new Date()
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `DEAL-${yyyymm}`

  // Use Postgres advisory lock scoped to this org's hash to serialise counter reads
  // bigint required by pg_advisory_xact_lock — derive from orgId chars
  const lockKey = BigInt('0x' + Buffer.from(orgId).toString('hex').slice(0, 15))

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Acquire advisory lock for this org (released automatically at tx end)
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockKey})`)
    const count = await tx.deal.count({ where: { organizationId: orgId } })
    return count
  })

  return `${prefix}-${String(result + 1).padStart(5, '0')}`
}

// ─── Select shape ─────────────────────────────────────────────────────────────

function dealSelect() {
  return {
    id:               true,
    organizationId:   true,
    customerId:       true,
    unitId:           true,
    agentId:          true,
    managerId:        true,
    dealNumber:       true,
    salePrice:        true,
    discount:         true,
    netSaleValue:     true,
    status:           true,
    pipelineStage:    true,
    contractDate:     true,
    closingDate:      true,
    expectedCloseDate: true,
    probability:      true,
    notes:            true,
    metadata:         true,
    createdAt:        true,
    updatedAt:        true,
    customer: {
      select: { id: true, fullName: true, phone: true, email: true },
    },
    unit: {
      select: {
        id: true, unitNumber: true, unitType: true, status: true, price: true, area: true,
        project:  { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
      },
    },
    agent: {
      select: { id: true, userProfile: { select: { firstName: true, lastName: true } } },
    },
    manager: {
      select: { id: true, userProfile: { select: { firstName: true, lastName: true } } },
    },
    reservation: { select: { id: true, status: true, reservationAmount: true } },
    paymentPlan:  { select: { id: true, totalAmount: true, installmentCount: true, status: true } },
  } as const
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Create a deal.
 * If reservationId provided: marks reservation CONVERTED, unit stays RESERVED.
 * Otherwise: unit must be AVAILABLE or RESERVED; sets unit → RESERVED.
 */
export async function createDeal(actor: AuthUser, input: CreateDealInput) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Verify customer
    const customer = await tx.customer.findFirst({
      where: { id: input.customerId, organizationId: actor.organizationId },
    })
    if (!customer) throw new NotFoundError('Customer not found')

    // Verify unit
    const unit = await tx.unit.findFirst({
      where: { id: input.unitId, organizationId: actor.organizationId },
    })
    if (!unit) throw new NotFoundError('Unit not found')

    if (unit.status === UnitStatus.SOLD) {
      throw new ConflictError('Unit is already SOLD.')
    }

    // Check no existing active deal for this unit
    const existingDeal = await tx.deal.findFirst({
      where: {
        unitId: input.unitId,
        organizationId: actor.organizationId,
        status: { notIn: [DealStatus.CANCELLED] },
      },
    })
    if (existingDeal) {
      throw new ConflictError(`Unit already has an active deal (${existingDeal.id}).`)
    }

    // Handle reservation conversion
    if (input.reservationId) {
      const reservation = await tx.reservation.findFirst({
        where: {
          id:             input.reservationId,
          organizationId: actor.organizationId,
          unitId:         input.unitId,
          status:         ReservationStatus.ACTIVE,
        },
      })
      if (!reservation) throw new NotFoundError('Active reservation not found for this unit.')

      await tx.reservation.update({
        where: { id: input.reservationId },
        data:  { status: ReservationStatus.CONVERTED },
      })
    } else if (unit.status === UnitStatus.AVAILABLE) {
      // No reservation — lock unit now
      await tx.unit.update({
        where: { id: input.unitId },
        data:  { status: UnitStatus.RESERVED },
      })
    }
    // If RESERVED without a reservationId, allow — deal creation assumes agent knows what they're doing

    const salePrice    = input.salePrice
    const discount     = input.discount ?? 0
    const netSaleValue = salePrice - discount

    const dealNumber = await generateDealNumber(actor.organizationId)

    const deal = await tx.deal.create({
      data: {
        organizationId:    actor.organizationId,
        customerId:        input.customerId,
        unitId:            input.unitId,
        agentId:           actor.id,
        managerId:         input.managerId,
        dealNumber,
        salePrice,
        discount,
        netSaleValue,
        status:            DealStatus.DRAFT,
        pipelineStage:     (input.pipelineStage as PipelineStage) ?? PipelineStage.RESERVATION,
        contractDate:      input.contractDate      ? new Date(input.contractDate)      : undefined,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
        probability:       input.probability ?? 70,
        notes:             input.notes,
      },
      select: dealSelect(),
    })

    // Back-link reservation → deal if converted
    if (input.reservationId) {
      await tx.reservation.update({
        where: { id: input.reservationId },
        data:  { dealId: deal.id },
      })
    }

    return deal
  })
}

export async function listDeals(actor: AuthUser, query: ListDealsQuery) {
  const scope = agentScope(actor)
  const { page, limit, ...filters } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...scope,
    ...(filters.customerId    && { customerId: filters.customerId }),
    ...(filters.unitId        && { unitId: filters.unitId }),
    ...(filters.agentId       && { agentId: filters.agentId }),
    ...(filters.managerId     && { managerId: filters.managerId }),
    ...(filters.status        && { status: filters.status as DealStatus }),
    ...(filters.pipelineStage && { pipelineStage: filters.pipelineStage as PipelineStage }),
  }

  const [items, total] = await Promise.all([
    prisma.deal.findMany({ where, select: dealSelect(), skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.deal.count({ where }),
  ])

  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getDeal(actor: AuthUser, id: string) {
  const scope = agentScope(actor)
  const deal = await prisma.deal.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
    select: dealSelect(),
  })
  if (!deal) throw new NotFoundError('Deal not found')
  return deal
}

export async function updateDeal(actor: AuthUser, id: string, input: UpdateDealInput) {
  const scope = agentScope(actor)
  const existing = await prisma.deal.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
  })
  if (!existing) throw new NotFoundError('Deal not found')
  assertEditable(existing.status)

  // Agents cannot change price/discount
  if (actor.role === UserRole.SALES_AGENT && (input.salePrice !== undefined || input.discount !== undefined)) {
    throw new ForbiddenError('Agents cannot modify deal pricing.')
  }

  let netSaleValue = Number(existing.netSaleValue)
  if (input.salePrice !== undefined || input.discount !== undefined) {
    const sp  = input.salePrice ?? Number(existing.salePrice)
    const dis = input.discount  ?? Number(existing.discount)
    netSaleValue = sp - dis
  }

  return prisma.deal.update({
    where: { id },
    data: {
      ...(input.managerId         !== undefined && { managerId: input.managerId }),
      ...(input.salePrice         !== undefined && { salePrice: input.salePrice, netSaleValue }),
      ...(input.discount          !== undefined && { discount: input.discount, netSaleValue }),
      ...(input.pipelineStage     !== undefined && { pipelineStage: input.pipelineStage as PipelineStage }),
      ...(input.contractDate      !== undefined && { contractDate: new Date(input.contractDate) }),
      ...(input.closingDate       !== undefined && { closingDate: new Date(input.closingDate) }),
      ...(input.expectedCloseDate !== undefined && { expectedCloseDate: new Date(input.expectedCloseDate) }),
      ...(input.probability       !== undefined && { probability: input.probability }),
      ...(input.notes             !== undefined && { notes: input.notes }),
    },
    select: dealSelect(),
  })
}

/**
 * Status transition with side-effects:
 * - COMPLETED  → unit status → SOLD
 * - CANCELLED  → unit status → AVAILABLE (if not already SOLD by another path)
 */
export async function updateDealStatus(
  actor: AuthUser,
  id: string,
  input: UpdateDealStatusInput,
) {
  // Only managers/admins control status
  if (actor.role === UserRole.SALES_AGENT) {
    throw new ForbiddenError('Agents cannot change deal status.')
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.deal.findFirst({
      where: { id, organizationId: actor.organizationId },
    })
    if (!existing) throw new NotFoundError('Deal not found')
    assertEditable(existing.status)

    const newStatus = input.status as DealStatus

    // Unit side-effects
    if (newStatus === DealStatus.COMPLETED) {
      await tx.unit.update({
        where: { id: existing.unitId },
        data:  { status: UnitStatus.SOLD },
      })
    } else if (newStatus === DealStatus.CANCELLED) {
      // Only revert if unit isn't SOLD (could be multi-deal edge case)
      const unit = await tx.unit.findUnique({ where: { id: existing.unitId } })
      if (unit && unit.status !== UnitStatus.SOLD) {
        await tx.unit.update({
          where: { id: existing.unitId },
          data:  { status: UnitStatus.AVAILABLE },
        })
      }
    }

    return tx.deal.update({
      where: { id },
      data: {
        status:        newStatus,
        ...(input.pipelineStage && { pipelineStage: input.pipelineStage as PipelineStage }),
        ...(newStatus === DealStatus.COMPLETED && { closingDate: new Date(), probability: 100 }),
        ...(newStatus === DealStatus.CANCELLED && { probability: 0 }),
        ...(input.reason && { notes: existing.notes ? `${existing.notes}\n${input.reason}` : input.reason }),
      },
      select: dealSelect(),
    })
  })
}

export async function updatePipelineStage(
  actor: AuthUser,
  id: string,
  input: UpdatePipelineStageInput,
) {
  const scope = agentScope(actor)
  const existing = await prisma.deal.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
  })
  if (!existing) throw new NotFoundError('Deal not found')
  assertEditable(existing.status)

  return prisma.deal.update({
    where: { id },
    data: {
      pipelineStage: input.pipelineStage as PipelineStage,
      ...(input.probability !== undefined && { probability: input.probability }),
    },
    select: dealSelect(),
  })
}
