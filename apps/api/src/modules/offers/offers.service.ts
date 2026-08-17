import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { OfferStatus, UserRole, UnitStatus } from '../../lib/enums.js'
import type {
  CreateOfferInput,
  UpdateOfferInput,
  UpdateOfferStatusInput,
  ListOffersQuery,
} from './offers.schema.js'

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

export class BadRequestError extends Error {
  readonly statusCode = 400
  constructor(msg: string) { super(msg); this.name = 'BadRequestError' }
}

// ─── Guards ───────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES: OfferStatus[] = [
  OfferStatus.ACCEPTED,
  OfferStatus.REJECTED,
  OfferStatus.EXPIRED,
  OfferStatus.WITHDRAWN,
]

function assertEditable(status: OfferStatus) {
  if (TERMINAL_STATUSES.includes(status)) {
    throw new ConflictError(`Offer is ${status} and cannot be modified.`)
  }
}

function agentScope(actor: AuthUser) {
  return actor.role === UserRole.SALES_AGENT ? { agentId: actor.id } : {}
}

// ─── Select shape ─────────────────────────────────────────────────────────────

function offerSelect() {
  return {
    id:               true,
    organizationId:   true,
    leadId:           true,
    customerId:       true,
    unitId:           true,
    agentId:          true,
    originalPrice:    true,
    offeredPrice:     true,
    discount:         true,
    discountPct:      true,
    downPayment:      true,
    installmentCount: true,
    paymentNotes:     true,
    status:           true,
    expiresAt:        true,
    notes:            true,
    createdAt:        true,
    updatedAt:        true,
    lead: {
      select: { id: true, fullName: true, phone: true, email: true },
    },
    customer: {
      select: { id: true, fullName: true, phone: true, email: true },
    },
    unit: {
      select: {
        id: true,
        unitNumber: true,
        unitType: true,
        status: true,
        price: true,
        area: true,
        bedrooms: true,
        project: { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
      },
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

export async function createOffer(
  actor: AuthUser,
  input: CreateOfferInput,
) {
  // Verify unit exists + belongs to org
  const unit = await prisma.unit.findFirst({
    where: { id: input.unitId, organizationId: actor.organizationId },
  })
  if (!unit) throw new NotFoundError('Unit not found')

  if (unit.status === UnitStatus.SOLD) {
    throw new ConflictError('Unit is already SOLD.')
  }

  // Compute discount
  const original = Number(unit.price)
  const offered  = input.offeredPrice
  const discount = Math.max(0, original - offered)
  const discountPct = original > 0 ? (discount / original) * 100 : 0

  // Verify lead/customer belongs to org
  if (input.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, organizationId: actor.organizationId },
    })
    if (!lead) throw new NotFoundError('Lead not found')
  }

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, organizationId: actor.organizationId },
    })
    if (!customer) throw new NotFoundError('Customer not found')
  }

  const offer = await prisma.offer.create({
    data: {
      organizationId:   actor.organizationId,
      leadId:           input.leadId,
      customerId:       input.customerId,
      unitId:           input.unitId,
      agentId:          actor.id,
      originalPrice:    original,
      offeredPrice:     offered,
      discount,
      discountPct,
      downPayment:      input.downPayment,
      installmentCount: input.installmentCount,
      paymentNotes:     input.paymentNotes,
      expiresAt:        input.expiresAt ? new Date(input.expiresAt) : undefined,
      notes:            input.notes,
      status:           OfferStatus.DRAFT,
    },
    select: offerSelect(),
  })

  return offer
}

export async function listOffers(
  actor: AuthUser,
  query: ListOffersQuery,
) {
  const scope = agentScope(actor)
  const { page, limit, ...filters } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...scope,
    ...(filters.leadId     && { leadId: filters.leadId }),
    ...(filters.customerId && { customerId: filters.customerId }),
    ...(filters.unitId     && { unitId: filters.unitId }),
    ...(filters.agentId    && { agentId: filters.agentId }),
    ...(filters.status     && { status: filters.status as OfferStatus }),
  }

  const [items, total] = await Promise.all([
    prisma.offer.findMany({ where, select: offerSelect(), skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.offer.count({ where }),
  ])

  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getOffer(actor: AuthUser, id: string) {
  const scope = agentScope(actor)
  const offer = await prisma.offer.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
    select: offerSelect(),
  })
  if (!offer) throw new NotFoundError('Offer not found')
  return offer
}

export async function updateOffer(
  actor: AuthUser,
  id: string,
  input: UpdateOfferInput,
) {
  const scope = agentScope(actor)
  const existing = await prisma.offer.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
  })
  if (!existing) throw new NotFoundError('Offer not found')
  assertEditable(existing.status)

  // Recompute discount if price changed
  let discount   = Number(existing.discount)
  let discountPct = Number(existing.discountPct)
  if (input.offeredPrice !== undefined) {
    const original = Number(existing.originalPrice)
    discount    = Math.max(0, original - input.offeredPrice)
    discountPct = original > 0 ? (discount / original) * 100 : 0
  }

  return prisma.offer.update({
    where: { id },
    data: {
      ...(input.offeredPrice     !== undefined && { offeredPrice: input.offeredPrice, discount, discountPct }),
      ...(input.downPayment      !== undefined && { downPayment: input.downPayment }),
      ...(input.installmentCount !== undefined && { installmentCount: input.installmentCount }),
      ...(input.paymentNotes     !== undefined && { paymentNotes: input.paymentNotes }),
      ...(input.expiresAt        !== undefined && { expiresAt: new Date(input.expiresAt) }),
      ...(input.notes            !== undefined && { notes: input.notes }),
    },
    select: offerSelect(),
  })
}

export async function updateOfferStatus(
  actor: AuthUser,
  id: string,
  input: UpdateOfferStatusInput,
) {
  // Agents cannot accept/reject their own offers — managers/admins do
  const scope = actor.role === UserRole.SALES_AGENT && input.status === 'SENT'
    ? { agentId: actor.id }
    : {}

  const existing = await prisma.offer.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
  })
  if (!existing) throw new NotFoundError('Offer not found')

  // Agents can only move DRAFT → SENT
  if (actor.role === UserRole.SALES_AGENT && input.status !== 'SENT') {
    throw new ForbiddenError('Agents may only submit offers (DRAFT → SENT).')
  }

  assertEditable(existing.status)

  return prisma.offer.update({
    where: { id },
    data: { status: input.status as OfferStatus },
    select: offerSelect(),
  })
}

export async function deleteOffer(actor: AuthUser, id: string) {
  const scope = agentScope(actor)
  const existing = await prisma.offer.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
  })
  if (!existing) throw new NotFoundError('Offer not found')

  if (existing.status !== OfferStatus.DRAFT) {
    throw new ConflictError('Only DRAFT offers can be deleted.')
  }

  await prisma.offer.delete({ where: { id } })
  return { success: true }
}
