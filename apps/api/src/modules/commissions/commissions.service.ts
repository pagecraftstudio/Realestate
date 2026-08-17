import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { CommissionStatus, DealStatus, UserRole} from '../../lib/enums.js'
import type { AuthUser } from '../../types/auth.js'
import type {
  CreateCommissionRuleInput,
  UpdateCommissionRuleInput,
  CalculateCommissionInput,
  UpdateCommissionInput,
  UpdateCommissionStatusInput,
  ListCommissionsQuery,
  ListCommissionRulesQuery,
} from './commissions.schema.js'

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

const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.SALES_MANAGER]

function assertAdmin(actor: AuthUser) {
  if (!ADMIN_ROLES.includes(actor.role as UserRole) && actor.role !== UserRole.ACCOUNTANT) {
    throw new ForbiddenError('Insufficient permissions')
  }
}

function assertApproverOrAdmin(actor: AuthUser) {
  if (!ADMIN_ROLES.includes(actor.role as UserRole) && actor.role !== UserRole.ACCOUNTANT) {
    throw new ForbiddenError('Only admins or accountants can change commission status')
  }
}

/** Valid status transitions */
const TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
  PENDING:   ['APPROVED', 'CANCELLED'],
  APPROVED:  ['PAYABLE', 'CANCELLED'],
  PAYABLE:   ['PAID', 'CANCELLED'],
  PAID:      [],
  CANCELLED: [],
}

function assertTransition(from: CommissionStatus, to: CommissionStatus) {
  if (!TRANSITIONS[from].includes(to)) {
    throw new ConflictError(`Cannot transition commission from ${from} to ${to}`)
  }
}

// ─── Selects ──────────────────────────────────────────────────────────────────

function commissionSelect() {
  return {
    id:            true,
    organizationId: true,
    dealId:        true,
    agentId:       true,
    managerId:     true,
    agentRate:     true,
    managerRate:   true,
    agentAmount:   true,
    managerAmount: true,
    totalAmount:   true,
    status:        true,
    approvedAt:    true,
    paidAt:        true,
    notes:         true,
    createdAt:     true,
    updatedAt:     true,
    deal: {
      select: {
        id: true, dealNumber: true, netSaleValue: true, status: true,
        unit: { select: { id: true, unitNumber: true } },
      },
    },
    agent: {
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
    manager: {
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
  }
}

function ruleSelect() {
  return {
    id:            true,
    organizationId: true,
    name:          true,
    agentRate:     true,
    managerRate:   true,
    isDefault:     true,
    conditions:    true,
    createdAt:     true,
    updatedAt:     true,
  }
}

// ─── Commission Rules ─────────────────────────────────────────────────────────

export async function createCommissionRule(
  actor: AuthUser,
  input: CreateCommissionRuleInput,
) {
  assertAdmin(actor)

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // If new rule is default, unset current default
    if (input.isDefault) {
      await tx.commissionRule.updateMany({
        where: { organizationId: actor.organizationId, isDefault: true },
        data:  { isDefault: false },
      })
    }

    const { conditions: rawConditions, ...restInput } = input
    return tx.commissionRule.create({
      data: { ...restInput, organizationId: actor.organizationId, conditions: (rawConditions ?? {}) as unknown },
      select: ruleSelect(),
    })
  })
}

export async function listCommissionRules(
  actor: AuthUser,
  query: ListCommissionRulesQuery,
) {
  const skip = (query.page - 1) * query.limit
  const where = { organizationId: actor.organizationId }
  const [items, total] = await Promise.all([
    prisma.commissionRule.findMany({
      where,
      select: ruleSelect(),
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      skip,
      take: query.limit,
    }),
    prisma.commissionRule.count({ where }),
  ])
  return { data: items, total, page: query.page, limit: query.limit }
}

export async function getCommissionRule(actor: AuthUser, id: string) {
  const rule = await prisma.commissionRule.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: ruleSelect(),
  })
  if (!rule) throw new NotFoundError('Commission rule not found')
  return rule
}

export async function updateCommissionRule(
  actor: AuthUser,
  id: string,
  input: UpdateCommissionRuleInput,
) {
  assertAdmin(actor)

  const rule = await prisma.commissionRule.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!rule) throw new NotFoundError('Commission rule not found')

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (input.isDefault) {
      await tx.commissionRule.updateMany({
        where: { organizationId: actor.organizationId, isDefault: true, id: { not: id } },
        data:  { isDefault: false },
      })
    }
    const { conditions: updConditions, ...restUpdate } = input
    return tx.commissionRule.update({
      where: { id },
      data: updConditions !== undefined ? { ...restUpdate, conditions: updConditions as unknown } : restUpdate,
      select: ruleSelect(),
    })
  })
}

export async function deleteCommissionRule(actor: AuthUser, id: string) {
  assertAdmin(actor)

  const rule = await prisma.commissionRule.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!rule) throw new NotFoundError('Commission rule not found')

  await prisma.commissionRule.delete({ where: { id } })
  return { success: true }
}

// ─── Commissions ──────────────────────────────────────────────────────────────

/**
 * Calculate and create a commission record for a deal.
 * Uses provided rates, a named rule, or the org default rule (in that priority).
 */
export async function calculateCommission(
  actor: AuthUser,
  input: CalculateCommissionInput,
) {
  assertAdmin(actor)

  // Verify deal
  const deal = await prisma.deal.findFirst({
    where: { id: input.dealId, organizationId: actor.organizationId },
    select: {
      id: true, status: true, netSaleValue: true,
      agentId: true, managerId: true,
    },
  })
  if (!deal) throw new NotFoundError('Deal not found')
  if (deal.status === DealStatus.CANCELLED) {
    throw new ConflictError('Cannot calculate commission for a cancelled deal')
  }

  // One commission per deal
  const existing = await prisma.commission.findFirst({
    where: { dealId: input.dealId, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (existing) throw new ConflictError('Commission already exists for this deal')

  // Determine rates
  let agentRate   = input.agentRate
  let managerRate = input.managerRate ?? 0

  if (agentRate === undefined) {
    // Try named rule first, then default
    const ruleWhere = input.commissionRuleId
      ? { id: input.commissionRuleId, organizationId: actor.organizationId }
      : { organizationId: actor.organizationId, isDefault: true }

    const rule = await prisma.commissionRule.findFirst({
      where: ruleWhere,
      select: { agentRate: true, managerRate: true },
    })

    if (!rule) throw new NotFoundError('No commission rule found — specify rates manually or create a default rule')

    agentRate   = Number(rule.agentRate)
    managerRate = Number(rule.managerRate)
  }

  const netValue    = Number(deal.netSaleValue)
  const agentAmt    = (netValue * agentRate) / 100
  const managerAmt  = (netValue * managerRate) / 100
  const totalAmt    = agentAmt + managerAmt

  return prisma.commission.create({
    data: {
      organizationId: actor.organizationId,
      dealId:         input.dealId,
      agentId:        deal.agentId,
      managerId:      deal.managerId ?? null,
      agentRate,
      managerRate,
      agentAmount:    agentAmt,
      managerAmount:  managerAmt,
      totalAmount:    totalAmt,
      notes:          input.notes ?? null,
    },
    select: commissionSelect(),
  })
}

export async function listCommissions(actor: AuthUser, query: ListCommissionsQuery) {
  const where: Record<string, unknown> = { organizationId: actor.organizationId }

  // Agents see only their own
  if (actor.role === UserRole.SALES_AGENT) {
    where['agentId'] = actor.id
  } else {
    if (query.agentId) where['agentId'] = query.agentId
  }

  if (query.dealId)  where['dealId']  = query.dealId
  if (query.status)  where['status']  = query.status

  const skip = (query.page - 1) * query.limit
  const [items, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      select: commissionSelect(),
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
    }),
    prisma.commission.count({ where }),
  ])

  return { data: items, total, page: query.page, limit: query.limit }
}

export async function getCommission(actor: AuthUser, id: string) {
  const where: Record<string, unknown> = { id, organizationId: actor.organizationId }
  if (actor.role === UserRole.SALES_AGENT) where['agentId'] = actor.id

  const c = await prisma.commission.findFirst({ where, select: commissionSelect() })
  if (!c) throw new NotFoundError('Commission not found')
  return c
}

export async function updateCommission(
  actor: AuthUser,
  id: string,
  input: UpdateCommissionInput,
) {
  assertAdmin(actor)
  const c = await prisma.commission.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true, status: true },
  })
  if (!c) throw new NotFoundError('Commission not found')
  if (c.status === CommissionStatus.PAID || c.status === CommissionStatus.CANCELLED) {
    throw new ConflictError(`Commission is ${c.status} and cannot be modified`)
  }

  return prisma.commission.update({
    where: { id },
    data: input,
    select: commissionSelect(),
  })
}

export async function updateCommissionStatus(
  actor: AuthUser,
  id: string,
  input: UpdateCommissionStatusInput,
) {
  assertApproverOrAdmin(actor)

  const c = await prisma.commission.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true, status: true },
  })
  if (!c) throw new NotFoundError('Commission not found')

  assertTransition(c.status, input.status as CommissionStatus)

  const now = new Date()
  const extraData: Record<string, unknown> = {}
  if (input.status === 'APPROVED') extraData['approvedAt'] = now
  if (input.status === 'PAID')     extraData['paidAt']     = now

  return prisma.commission.update({
    where: { id },
    data: {
      status: input.status as CommissionStatus,
      notes:  input.notes ?? null,
      ...extraData,
    },
    select: commissionSelect(),
  })
}
