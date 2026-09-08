import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { UserRole, ViewingStatus } from '@prisma/client'
import type {
  CreateViewingInput,
  UpdateViewingInput,
  CompleteViewingInput,
  ListViewingsQuery,
} from './viewings.schema.js'

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

// ─── Scope guard ──────────────────────────────────────────────────────────────
// SALES_AGENT can only read/modify viewings they are assigned to.

function agentScope(actor: AuthUser) {
  if (actor.role === UserRole.SALES_AGENT) {
    return { agentId: actor.id }
  }
  return {}
}

// ─── Terminal status guard ────────────────────────────────────────────────────

const TERMINAL: ViewingStatus[] = [ViewingStatus.COMPLETED, ViewingStatus.CANCELLED]

function assertNotTerminal(status: ViewingStatus, label = 'Viewing') {
  if (TERMINAL.includes(status)) {
    throw new ConflictError(`${label} is already ${status} and cannot be modified.`)
  }
}

// ─── Select shape ─────────────────────────────────────────────────────────────

function viewingSelect() {
  return {
    id:               true,
    organizationId:   true,
    leadId:           true,
    customerId:       true,
    unitId:           true,
    agentId:          true,
    scheduledAt:      true,
    endAt:            true,
    location:         true,
    status:           true,
    notes:            true,
    customerFeedback: true,
    agentFeedback:    true,
    outcome:          true,
    nextAction:       true,
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
        price: true,
        project: { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
        floor:    { select: { id: true, floorNumber: true, label: true } },
      },
    },
    agent: {
      select: {
        id:      true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
  } as const
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertLeadBelongsToOrg(orgId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: orgId },
    select: { id: true },
  })
  if (!lead) throw new NotFoundError('Lead not found')
}

async function assertCustomerBelongsToOrg(orgId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
    select: { id: true },
  })
  if (!customer) throw new NotFoundError('Customer not found')
}

async function assertUnitBelongsToOrg(orgId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, organizationId: orgId },
    select: { id: true },
  })
  if (!unit) throw new NotFoundError('Unit not found')
}

async function assertAgentBelongsToOrg(orgId: string, agentId: string) {
  const agent = await prisma.user.findFirst({
    where: { id: agentId, organizationId: orgId },
    select: { id: true },
  })
  if (!agent) throw new NotFoundError('Agent not found')
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createViewing(actor: AuthUser, data: CreateViewingInput) {
  const orgId = actor.organizationId

  // Validate referenced entities
  if (data.leadId)     await assertLeadBelongsToOrg(orgId, data.leadId)
  if (data.customerId) await assertCustomerBelongsToOrg(orgId, data.customerId)
  if (data.unitId)     await assertUnitBelongsToOrg(orgId, data.unitId)
  await assertAgentBelongsToOrg(orgId, data.agentId)

  const viewing = await prisma.viewing.create({
    data: {
      organizationId: orgId,
      leadId:         data.leadId,
      customerId:     data.customerId,
      unitId:         data.unitId,
      agentId:        data.agentId,
      scheduledAt:    new Date(data.scheduledAt),
      endAt:          data.endAt ? new Date(data.endAt) : undefined,
      location:       data.location,
      notes:          data.notes,
      status:         ViewingStatus.SCHEDULED,
    },
    select: viewingSelect(),
  })

  // Append activity to lead timeline if lead-linked
  if (data.leadId) {
    await prisma.leadActivity.create({
      data: {
        organizationId: orgId,
        leadId:   data.leadId,
        actorId:  actor.id,
        type:     'VIEWING_SCHEDULED',
        payload:  {
          viewingId:   viewing.id,
          scheduledAt: data.scheduledAt,
          unitId:      data.unitId ?? null,
        },
      },
    })
  }

  return viewing
}

// ─── List / calendar ──────────────────────────────────────────────────────────

export async function listViewings(actor: AuthUser, query: ListViewingsQuery) {
  const {
    page, limit,
    agentId, leadId, customerId, unitId, status,
    from, to, calendar,
  } = query

  const where = {
    organizationId: actor.organizationId,
    ...agentScope(actor),
    ...(agentId    && { agentId }),
    ...(leadId     && { leadId }),
    ...(customerId && { customerId }),
    ...(unitId     && { unitId }),
    ...(status     && { status }),
    ...(from || to
      ? {
          scheduledAt: {
            ...(from && { gte: new Date(from) }),
            ...(to   && { lte: new Date(to) }),
          },
        }
      : {}),
  }

  if (calendar) {
    // Return flat list for calendar rendering (no pagination)
    const viewings = await prisma.viewing.findMany({
      where,
      select: viewingSelect(),
      orderBy: { scheduledAt: 'asc' },
    })
    return { data: viewings }
  }

  const skip = (page - 1) * limit
  const [viewings, total] = await Promise.all([
    prisma.viewing.findMany({
      where,
      select: viewingSelect(),
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.viewing.count({ where }),
  ])

  return {
    data: viewings,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

// ─── Get one ──────────────────────────────────────────────────────────────────

export async function getViewing(actor: AuthUser, viewingId: string) {
  const viewing = await prisma.viewing.findFirst({
    where: {
      id:             viewingId,
      organizationId: actor.organizationId,
      ...agentScope(actor),
    },
    select: viewingSelect(),
  })
  if (!viewing) throw new NotFoundError('Viewing not found')
  return viewing
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateViewing(
  actor: AuthUser,
  viewingId: string,
  data: UpdateViewingInput,
) {
  const existing = await prisma.viewing.findFirst({
    where: {
      id:             viewingId,
      organizationId: actor.organizationId,
      ...agentScope(actor),
    },
    select: { id: true, status: true, leadId: true },
  })
  if (!existing) throw new NotFoundError('Viewing not found')

  // Prevent editing already-terminal viewings (unless the update itself is a status change
  // to CANCELLED — allow agents to cancel a scheduled viewing)
  const isOnlyCancelling =
    data.status === ViewingStatus.CANCELLED &&
    Object.keys(data).length === 1
  if (!isOnlyCancelling) {
    assertNotTerminal(existing.status)
  }

  // Validate new refs if supplied
  if (data.unitId)  await assertUnitBelongsToOrg(actor.organizationId, data.unitId)
  if (data.agentId) await assertAgentBelongsToOrg(actor.organizationId, data.agentId)

  const updated = await prisma.viewing.update({
    where: { id: viewingId },
    data: {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      endAt:       data.endAt       ? new Date(data.endAt)       : undefined,
    },
    select: viewingSelect(),
  })

  // Log rescheduled activity on lead timeline
  if (
    data.scheduledAt &&
    existing.leadId &&
    (data.status === ViewingStatus.RESCHEDULED || !data.status)
  ) {
    await prisma.leadActivity.create({
      data: {
        organizationId: actor.organizationId,
        leadId:  existing.leadId,
        actorId: actor.id,
        type:    'VIEWING_RESCHEDULED',
        payload: { viewingId, scheduledAt: data.scheduledAt },
      },
    })
  }

  return updated
}

// ─── Complete (convenience) ───────────────────────────────────────────────────

export async function completeViewing(
  actor: AuthUser,
  viewingId: string,
  data: CompleteViewingInput,
) {
  const existing = await prisma.viewing.findFirst({
    where: {
      id:             viewingId,
      organizationId: actor.organizationId,
      ...agentScope(actor),
    },
    select: { id: true, status: true, leadId: true },
  })
  if (!existing) throw new NotFoundError('Viewing not found')
  assertNotTerminal(existing.status)

  const updated = await prisma.viewing.update({
    where: { id: viewingId },
    data: {
      status:           ViewingStatus.COMPLETED,
      outcome:          data.outcome,
      nextAction:       data.nextAction,
      agentFeedback:    data.agentFeedback,
      customerFeedback: data.customerFeedback,
    },
    select: viewingSelect(),
  })

  // Log on lead timeline
  if (existing.leadId) {
    await prisma.leadActivity.create({
      data: {
        organizationId: actor.organizationId,
        leadId:  existing.leadId,
        actorId: actor.id,
        type:    'VIEWING_COMPLETED',
        payload: {
          viewingId,
          outcome:    data.outcome,
          nextAction: data.nextAction ?? null,
        },
      },
    })
  }

  return updated
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelViewing(actor: AuthUser, viewingId: string) {
  const existing = await prisma.viewing.findFirst({
    where: {
      id:             viewingId,
      organizationId: actor.organizationId,
      ...agentScope(actor),
    },
    select: { id: true, status: true, leadId: true },
  })
  if (!existing) throw new NotFoundError('Viewing not found')
  assertNotTerminal(existing.status)

  const updated = await prisma.viewing.update({
    where: { id: viewingId },
    data:  { status: ViewingStatus.CANCELLED },
    select: viewingSelect(),
  })

  if (existing.leadId) {
    await prisma.leadActivity.create({
      data: {
        organizationId: actor.organizationId,
        leadId:  existing.leadId,
        actorId: actor.id,
        type:    'VIEWING_CANCELLED',
        payload: { viewingId },
      },
    })
  }

  return updated
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteViewing(actor: AuthUser, viewingId: string) {
  const existing = await prisma.viewing.findFirst({
    where: {
      id:             viewingId,
      organizationId: actor.organizationId,
    },
    select: { id: true, status: true },
  })
  if (!existing) throw new NotFoundError('Viewing not found')

  if (existing.status === ViewingStatus.COMPLETED) {
    throw new ConflictError('Cannot delete a completed viewing.')
  }

  await prisma.viewing.delete({ where: { id: viewingId } })
  return { success: true }
}

// ─── Upcoming (dashboard widget) ──────────────────────────────────────────────

export async function upcomingViewings(actor: AuthUser, limitN = 10) {
  return prisma.viewing.findMany({
    where: {
      organizationId: actor.organizationId,
      ...agentScope(actor),
      scheduledAt: { gte: new Date() },
      status: { in: [ViewingStatus.SCHEDULED, ViewingStatus.CONFIRMED] },
    },
    select: viewingSelect(),
    orderBy: { scheduledAt: 'asc' },
    take: limitN,
  })
}
