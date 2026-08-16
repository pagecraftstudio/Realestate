import { prisma } from '../../lib/prisma.js'
import { DealStatus, InstallmentStatus, UserRole } from '@prisma/client'
import type { AuthUser } from '../../types/auth.js'
import type {
  CreatePaymentPlanInput,
  UpdatePaymentPlanInput,
  UpdateInstallmentInput,
  ListInstallmentsQuery,
  RecordPaymentInput,
  ListPaymentsQuery,
} from './payment-plans.schema.js'

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

export class ValidationError extends Error {
  readonly statusCode = 422
  constructor(msg: string) { super(msg); this.name = 'ValidationError' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAccountant(actor: AuthUser) {
  return actor.role === UserRole.ACCOUNTANT
}

function isAdminOrManager(actor: AuthUser) {
  return [
    UserRole.COMPANY_ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SUPER_ADMIN,
  ].includes(actor.role as UserRole)
}

/**
 * Generate installment schedule from payment plan params.
 * Down payment + installments + optional handover = totalAmount.
 */
function generateInstallmentDates(
  startDate: Date,
  count: number,
  frequencyMonths: number,
): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + i * frequencyMonths)
    dates.push(d)
  }
  return dates
}

// ─── Selects ──────────────────────────────────────────────────────────────────

function planSelect() {
  return {
    id: true,
    dealId: true,
    organizationId: true,
    totalAmount: true,
    downPayment: true,
    remainingAmount: true,
    installmentCount: true,
    installmentAmount: true,
    handoverAmount: true,
    frequencyMonths: true,
    startDate: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    deal: {
      select: {
        id: true, dealNumber: true, status: true,
        customer: { select: { id: true, fullName: true } },
        unit: { select: { id: true, unitNumber: true } },
      },
    },
    installments: {
      select: {
        id: true, dueDate: true, amount: true, paidAmount: true,
        remainingAmount: true, status: true, paidAt: true, overdueDays: true, notes: true,
      },
      orderBy: { dueDate: 'asc' as const },
    },
  }
}

function installmentSelect() {
  return {
    id: true,
    paymentPlanId: true,
    dealId: true,
    organizationId: true,
    dueDate: true,
    amount: true,
    paidAmount: true,
    remainingAmount: true,
    status: true,
    paidAt: true,
    overdueDays: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    payments: {
      select: {
        id: true, amount: true, method: true, status: true,
        referenceNumber: true, receiptUrl: true, paidAt: true,
      },
      orderBy: { paidAt: 'desc' as const },
    },
  }
}

function paymentSelect() {
  return {
    id: true,
    organizationId: true,
    dealId: true,
    installmentId: true,
    customerId: true,
    amount: true,
    currency: true,
    method: true,
    status: true,
    referenceNumber: true,
    receiptUrl: true,
    paidAt: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    deal: { select: { id: true, dealNumber: true } },
    installment: { select: { id: true, dueDate: true, amount: true } },
  }
}

// ─── Payment Plan ─────────────────────────────────────────────────────────────

export async function createPaymentPlan(
  actor: AuthUser,
  input: CreatePaymentPlanInput,
) {
  // Verify deal exists + org
  const deal = await prisma.deal.findFirst({
    where: { id: input.dealId, organizationId: actor.organizationId },
    select: { id: true, status: true, netSaleValue: true, customerId: true },
  })
  if (!deal) throw new NotFoundError('Deal not found')

  if (
    deal.status === DealStatus.CANCELLED ||
    deal.status === DealStatus.COMPLETED
  ) {
    throw new ConflictError(`Deal is ${deal.status}; cannot create payment plan`)
  }

  // Only one payment plan per deal
  const existing = await prisma.paymentPlan.findUnique({
    where: { dealId: input.dealId },
    select: { id: true },
  })
  if (existing) throw new ConflictError('Payment plan already exists for this deal')

  // Validate amounts
  const total = input.totalAmount
  const down  = input.downPayment
  const handover = input.handoverAmount ?? 0

  if (down + handover > total) {
    throw new ValidationError(
      'downPayment + handoverAmount cannot exceed totalAmount',
    )
  }

  const remaining = total - down - handover
  const instAmount = input.installmentCount > 0
    ? remaining / input.installmentCount
    : 0

  const startDate = new Date(input.startDate)
  const dates = generateInstallmentDates(
    startDate,
    input.installmentCount,
    input.frequencyMonths,
  )

  // Create plan + installments in transaction
  const plan = await prisma.$transaction(async (tx) => {
    const p = await tx.paymentPlan.create({
      data: {
        dealId:           input.dealId,
        organizationId:   actor.organizationId,
        totalAmount:      total,
        downPayment:      down,
        remainingAmount:  remaining,
        installmentCount: input.installmentCount,
        installmentAmount: instAmount,
        handoverAmount:   handover,
        frequencyMonths:  input.frequencyMonths,
        startDate,
        notes:            input.notes,
      },
      select: { id: true },
    })

    if (dates.length > 0) {
      await tx.installment.createMany({
        data: dates.map((dueDate) => ({
          paymentPlanId:   p.id,
          dealId:          input.dealId,
          organizationId:  actor.organizationId,
          dueDate,
          amount:          instAmount,
          remainingAmount: instAmount,
          status:          InstallmentStatus.UPCOMING,
        })),
      })
    }

    return p
  })

  return prisma.paymentPlan.findUnique({
    where: { id: plan.id },
    select: planSelect(),
  })
}

export async function getPaymentPlan(actor: AuthUser, dealId: string) {
  const plan = await prisma.paymentPlan.findFirst({
    where: { dealId, organizationId: actor.organizationId },
    select: planSelect(),
  })
  if (!plan) throw new NotFoundError('Payment plan not found for this deal')
  return plan
}

export async function updatePaymentPlan(
  actor: AuthUser,
  planId: string,
  input: UpdatePaymentPlanInput,
) {
  const plan = await prisma.paymentPlan.findFirst({
    where: { id: planId, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!plan) throw new NotFoundError('Payment plan not found')

  if (!isAccountant(actor) && !isAdminOrManager(actor)) {
    throw new ForbiddenError('Insufficient permissions')
  }

  return prisma.paymentPlan.update({
    where: { id: planId },
    data: input,
    select: planSelect(),
  })
}

// ─── Installments ─────────────────────────────────────────────────────────────

export async function listInstallments(
  actor: AuthUser,
  query: ListInstallmentsQuery,
) {
  const where: Record<string, unknown> = { organizationId: actor.organizationId }
  if (query.dealId) where['dealId'] = query.dealId
  if (query.status) where['status'] = query.status

  const skip = (query.page - 1) * query.limit
  const [items, total] = await Promise.all([
    prisma.installment.findMany({
      where,
      select: installmentSelect(),
      orderBy: { dueDate: 'asc' },
      skip,
      take: query.limit,
    }),
    prisma.installment.count({ where }),
  ])

  return { data: items, total, page: query.page, limit: query.limit }
}

export async function getInstallment(actor: AuthUser, id: string) {
  const inst = await prisma.installment.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: installmentSelect(),
  })
  if (!inst) throw new NotFoundError('Installment not found')
  return inst
}

export async function updateInstallment(
  actor: AuthUser,
  id: string,
  input: UpdateInstallmentInput,
) {
  const inst = await prisma.installment.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true, status: true },
  })
  if (!inst) throw new NotFoundError('Installment not found')

  if (!isAccountant(actor) && !isAdminOrManager(actor)) {
    throw new ForbiddenError('Insufficient permissions')
  }

  if (inst.status === InstallmentStatus.PAID) {
    throw new ConflictError('Cannot modify a fully paid installment')
  }

  return prisma.installment.update({
    where: { id },
    data: input,
    select: installmentSelect(),
  })
}

/**
 * Recalculate overdue days for all UPCOMING/DUE/PARTIALLY_PAID installments.
 * Called via cron/queue — not exposed as HTTP route.
 */
export async function recalcOverdue(orgId: string) {
  const now = new Date()
  const overdue = await prisma.installment.findMany({
    where: {
      organizationId: orgId,
      status: { in: [InstallmentStatus.UPCOMING, InstallmentStatus.DUE, InstallmentStatus.PARTIALLY_PAID] },
      dueDate: { lt: now },
    },
    select: { id: true, dueDate: true },
  })

  for (const inst of overdue) {
    const days = Math.floor(
      (now.getTime() - inst.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    )
    await prisma.installment.update({
      where: { id: inst.id },
      data: { overdueDays: days, status: InstallmentStatus.OVERDUE },
    })
  }

  return { updated: overdue.length }
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function recordPayment(actor: AuthUser, input: RecordPaymentInput) {
  // Verify deal
  const deal = await prisma.deal.findFirst({
    where: { id: input.dealId, organizationId: actor.organizationId },
    select: { id: true, status: true, customerId: true },
  })
  if (!deal) throw new NotFoundError('Deal not found')
  if (deal.status === DealStatus.CANCELLED) {
    throw new ConflictError('Cannot record payment on a cancelled deal')
  }

  // Verify installment if provided
  let installment: {
    id: string; amount: number; paidAmount: number; remainingAmount: number; status: InstallmentStatus
  } | null = null

  if (input.installmentId) {
    const raw = await prisma.installment.findFirst({
      where: { id: input.installmentId, dealId: input.dealId, organizationId: actor.organizationId },
      select: { id: true, amount: true, paidAmount: true, remainingAmount: true, status: true },
    })
    if (!raw) throw new NotFoundError('Installment not found')
    if (raw.status === InstallmentStatus.PAID) {
      throw new ConflictError('Installment is already fully paid')
    }
    if (raw.status === InstallmentStatus.CANCELLED) {
      throw new ConflictError('Installment is cancelled')
    }
    installment = {
      ...raw,
      amount: Number(raw.amount),
      paidAmount: Number(raw.paidAmount),
      remainingAmount: Number(raw.remainingAmount),
    }
  }

  return prisma.$transaction(async (tx) => {
    // Record payment
    const payment = await tx.payment.create({
      data: {
        organizationId:  actor.organizationId,
        dealId:          input.dealId,
        installmentId:   input.installmentId,
        customerId:      deal.customerId,
        amount:          input.amount,
        method:          input.method,
        status:          'COMPLETED',
        referenceNumber: input.referenceNumber,
        receiptUrl:      input.receiptUrl,
        paidAt:          new Date(input.paidAt),
        notes:           input.notes,
      },
      select: paymentSelect(),
    })

    // Update installment if linked
    if (installment) {
      const newPaid      = installment.paidAmount + input.amount
      const newRemaining = Math.max(0, installment.remainingAmount - input.amount)
      const newStatus: InstallmentStatus =
        newRemaining === 0
          ? InstallmentStatus.PAID
          : InstallmentStatus.PARTIALLY_PAID

      await tx.installment.update({
        where: { id: installment.id },
        data: {
          paidAmount:      newPaid,
          remainingAmount: newRemaining,
          status:          newStatus,
          paidAt:          newRemaining === 0 ? new Date(input.paidAt) : undefined,
          overdueDays:     newRemaining === 0 ? 0 : undefined,
        },
      })
    }

    // Update deal status if plan is fully paid
    await _checkAndCompleteDeal(tx, input.dealId, actor.organizationId)

    return payment
  })
}

/**
 * If all installments are PAID (and there are some), mark deal COMPLETED.
 */
async function _checkAndCompleteDeal(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  dealId: string,
  orgId: string,
) {
  const plan = await tx.paymentPlan.findUnique({
    where: { dealId },
    select: { id: true },
  })
  if (!plan) return

  const unpaid = await tx.installment.count({
    where: {
      dealId,
      organizationId: orgId,
      status: { notIn: [InstallmentStatus.PAID, InstallmentStatus.CANCELLED] },
    },
  })

  if (unpaid === 0) {
    await tx.deal.update({
      where: { id: dealId },
      data: { status: DealStatus.COMPLETED, closingDate: new Date() },
    })
  }
}

export async function listPayments(actor: AuthUser, query: ListPaymentsQuery) {
  const where: Record<string, unknown> = { organizationId: actor.organizationId }
  if (query.dealId) where['dealId'] = query.dealId
  if (query.installmentId) where['installmentId'] = query.installmentId
  if (query.status) where['status'] = query.status

  const skip = (query.page - 1) * query.limit
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: paymentSelect(),
      orderBy: { paidAt: 'desc' },
      skip,
      take: query.limit,
    }),
    prisma.payment.count({ where }),
  ])

  return { data: items, total, page: query.page, limit: query.limit }
}

export async function getPayment(actor: AuthUser, id: string) {
  const p = await prisma.payment.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: paymentSelect(),
  })
  if (!p) throw new NotFoundError('Payment not found')
  return p
}

export async function voidPayment(actor: AuthUser, id: string, reason: string) {
  if (!isAccountant(actor) && !isAdminOrManager(actor)) {
    throw new ForbiddenError('Insufficient permissions')
  }

  const payment = await prisma.payment.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true, status: true, amount: true, installmentId: true },
  })
  if (!payment) throw new NotFoundError('Payment not found')
  if (payment.status !== 'COMPLETED') {
    throw new ConflictError('Only COMPLETED payments can be voided')
  }

  return prisma.$transaction(async (tx) => {
    // Mark payment refunded
    const updated = await tx.payment.update({
      where: { id },
      data: { status: 'REFUNDED', notes: reason },
      select: paymentSelect(),
    })

    // Reverse installment update if linked
    if (payment.installmentId) {
      const inst = await tx.installment.findUnique({
        where: { id: payment.installmentId },
        select: { paidAmount: true, amount: true },
      })
      if (inst) {
        const newPaid      = Math.max(0, Number(inst.paidAmount) - Number(payment.amount))
        const newRemaining = Number(inst.amount) - newPaid
        await tx.installment.update({
          where: { id: payment.installmentId },
          data: {
            paidAmount:      newPaid,
            remainingAmount: newRemaining,
            status:
              newPaid === 0
                ? InstallmentStatus.UPCOMING
                : InstallmentStatus.PARTIALLY_PAID,
            paidAt: null,
          },
        })
      }
    }

    return updated
  })
}
