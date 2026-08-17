import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createPaymentPlan,
  getPaymentPlan,
  updatePaymentPlan,
  listInstallments,
  getInstallment,
  updateInstallment,
  recordPayment,
  listPayments,
  getPayment,
  voidPayment,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../payment-plans.service.js'
import { DealStatus, InstallmentStatus, UserRole } from '@prisma/client'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockTx = {
  paymentPlan:  { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  installment:  { createMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
  deal:         { findFirst: vi.fn(), update: vi.fn() },
  payment:      { create: vi.fn(), update: vi.fn() },
}

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((fn: any) => fn(mockTx)),
    paymentPlan: {
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
    },
    installment: {
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
      count:      vi.fn(),
      createMany: vi.fn(),
    },
    payment: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
      count:     vi.fn(),
    },
    deal: {
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from '../../../lib/prisma.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID   = 'org_1'
const DEAL_ID  = 'deal_1'
const PLAN_ID  = 'plan_1'
const INST_ID  = 'inst_1'
const PAY_ID   = 'pay_1'
const CUST_ID  = 'cust_1'

const adminActor     = { id: 'admin_1', userId: 'admin_1', supabaseUid: 'sb-test', organizationId: ORG_ID, role: UserRole.COMPANY_ADMIN }
const accountant     = { id: 'acc_1', userId: 'acc_1', supabaseUid: 'sb-test',   organizationId: ORG_ID, role: UserRole.ACCOUNTANT }
const agentActor     = { id: 'agent_1', userId: 'agent_1', supabaseUid: 'sb-test', organizationId: ORG_ID, role: UserRole.SALES_AGENT }

const baseDeal = {
  id:             DEAL_ID,
  organizationId: ORG_ID,
  status:         DealStatus.RESERVED,
  netSaleValue:   1_000_000,
  customerId:     CUST_ID,
}

const basePlan = {
  id:               PLAN_ID,
  dealId:           DEAL_ID,
  organizationId:   ORG_ID,
  totalAmount:      1_000_000,
  downPayment:      200_000,
  remainingAmount:  800_000,
  installmentCount: 8,
  installmentAmount: 100_000,
  handoverAmount:   0,
  frequencyMonths:  1,
  startDate:        new Date('2026-09-01'),
  notes:            null,
  createdAt:        new Date(),
  updatedAt:        new Date(),
  deal:             { id: DEAL_ID, dealNumber: 'DEAL-202608-00001', status: DealStatus.RESERVED },
  installments:     [],
}

const baseInstallment = {
  id:              INST_ID,
  paymentPlanId:   PLAN_ID,
  dealId:          DEAL_ID,
  organizationId:  ORG_ID,
  dueDate:         new Date('2026-09-01'),
  amount:          100_000,
  paidAmount:      0,
  remainingAmount: 100_000,
  status:          InstallmentStatus.UPCOMING,
  paidAt:          null,
  overdueDays:     0,
  notes:           null,
  createdAt:       new Date(),
  updatedAt:       new Date(),
  payments:        [],
}

const basePayment = {
  id:              PAY_ID,
  organizationId:  ORG_ID,
  dealId:          DEAL_ID,
  installmentId:   INST_ID,
  customerId:      CUST_ID,
  amount:          100_000,
  currency:        'AED',
  method:          'BANK_TRANSFER',
  status:          'COMPLETED',
  referenceNumber: 'REF-001',
  receiptUrl:      null,
  paidAt:          new Date(),
  notes:           null,
  createdAt:       new Date(),
  updatedAt:       new Date(),
  deal:            { id: DEAL_ID, dealNumber: 'DEAL-202608-00001' },
  installment:     { id: INST_ID, dueDate: new Date('2026-09-01'), amount: 100_000 },
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.values(mockTx).forEach((model) =>
    Object.values(model).forEach((fn: any) => fn.mockReset()),
  )
})

// ─── createPaymentPlan ────────────────────────────────────────────────────────

describe('createPaymentPlan', () => {
  it('creates plan and generates installments', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.paymentPlan.findUnique as any).mockResolvedValue(null)
    mockTx.paymentPlan.create.mockResolvedValue({ id: PLAN_ID })
    mockTx.installment.createMany.mockResolvedValue({ count: 8 })
    ;(prisma.paymentPlan.findUnique as any).mockResolvedValue(basePlan)

    const result = await createPaymentPlan(adminActor, {
      dealId:           DEAL_ID,
      totalAmount:      1_000_000,
      downPayment:      200_000,
      handoverAmount:   0,
      installmentCount: 8,
      frequencyMonths:  1,
      startDate:        '2026-09-01T00:00:00.000Z',
    })

    expect(mockTx.paymentPlan.create).toHaveBeenCalledOnce()
    expect(mockTx.installment.createMany).toHaveBeenCalledOnce()
    const createData = mockTx.installment.createMany.mock.calls[0][0].data
    expect(createData).toHaveLength(8)
    expect(result).toMatchObject({ id: PLAN_ID })
  })

  it('throws if deal not found', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(null)
    await expect(
      createPaymentPlan(adminActor, {
        dealId: DEAL_ID, totalAmount: 1_000_000, downPayment: 0,
        installmentCount: 4, frequencyMonths: 1, startDate: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ConflictError if plan already exists', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.paymentPlan.findUnique as any).mockResolvedValue({ id: PLAN_ID })
    await expect(
      createPaymentPlan(adminActor, {
        dealId: DEAL_ID, totalAmount: 1_000_000, downPayment: 0,
        installmentCount: 4, frequencyMonths: 1, startDate: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(ConflictError)
  })

  it('throws ValidationError if down+handover exceeds total', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.paymentPlan.findUnique as any).mockResolvedValue(null)
    await expect(
      createPaymentPlan(adminActor, {
        dealId: DEAL_ID, totalAmount: 1_000_000,
        downPayment: 700_000, handoverAmount: 400_000,
        installmentCount: 4, frequencyMonths: 1,
        startDate: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(ValidationError)
  })

  it('throws ConflictError if deal is CANCELLED', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue({ ...baseDeal, status: DealStatus.CANCELLED })
    ;(prisma.paymentPlan.findUnique as any).mockResolvedValue(null)
    await expect(
      createPaymentPlan(adminActor, {
        dealId: DEAL_ID, totalAmount: 1_000_000, downPayment: 0,
        installmentCount: 4, frequencyMonths: 1, startDate: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(ConflictError)
  })
})

// ─── getPaymentPlan ───────────────────────────────────────────────────────────

describe('getPaymentPlan', () => {
  it('returns plan by dealId', async () => {
    ;(prisma.paymentPlan.findFirst as any).mockResolvedValue(basePlan)
    const result = await getPaymentPlan(adminActor, DEAL_ID)
    expect(result).toMatchObject({ id: PLAN_ID })
  })

  it('throws if not found', async () => {
    ;(prisma.paymentPlan.findFirst as any).mockResolvedValue(null)
    await expect(getPaymentPlan(adminActor, DEAL_ID)).rejects.toThrow(NotFoundError)
  })
})

// ─── updateInstallment ────────────────────────────────────────────────────────

describe('updateInstallment', () => {
  it('updates installment', async () => {
    ;(prisma.installment.findFirst as any).mockResolvedValue(baseInstallment)
    ;(prisma.installment.update as any).mockResolvedValue({ ...baseInstallment, notes: 'updated' })
    const result = await updateInstallment(accountant, INST_ID, { notes: 'updated' })
    expect(result).toMatchObject({ notes: 'updated' })
  })

  it('throws ForbiddenError for SALES_AGENT', async () => {
    ;(prisma.installment.findFirst as any).mockResolvedValue(baseInstallment)
    await expect(
      updateInstallment(agentActor, INST_ID, { notes: 'x' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ConflictError if already PAID', async () => {
    ;(prisma.installment.findFirst as any).mockResolvedValue({
      ...baseInstallment, status: InstallmentStatus.PAID,
    })
    await expect(
      updateInstallment(accountant, INST_ID, { notes: 'x' }),
    ).rejects.toThrow(ConflictError)
  })
})

// ─── recordPayment ────────────────────────────────────────────────────────────

describe('recordPayment', () => {
  const input = {
    dealId:        DEAL_ID,
    installmentId: INST_ID,
    amount:        100_000,
    method:        'BANK_TRANSFER' as const,
    paidAt:        '2026-09-01T00:00:00.000Z',
  }

  it('records payment and marks installment PAID', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.installment.findFirst as any).mockResolvedValue({
      ...baseInstallment,
      amount: 100_000, paidAmount: 0, remainingAmount: 100_000,
    })
    mockTx.payment.create.mockResolvedValue(basePayment)
    mockTx.installment.update.mockResolvedValue({ ...baseInstallment, status: InstallmentStatus.PAID })
    mockTx.paymentPlan.findUnique.mockResolvedValue({ id: PLAN_ID })
    mockTx.installment.count.mockResolvedValue(0) // all paid
    mockTx.deal.update.mockResolvedValue({})

    const result = await recordPayment(accountant, input)
    expect(mockTx.payment.create).toHaveBeenCalledOnce()
    expect(mockTx.installment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InstallmentStatus.PAID }),
      }),
    )
    expect(result).toMatchObject({ id: PAY_ID })
  })

  it('marks deal COMPLETED when all installments paid', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.installment.findFirst as any).mockResolvedValue({
      ...baseInstallment, amount: 100_000, paidAmount: 0, remainingAmount: 100_000,
    })
    mockTx.payment.create.mockResolvedValue(basePayment)
    mockTx.installment.update.mockResolvedValue({})
    mockTx.paymentPlan.findUnique.mockResolvedValue({ id: PLAN_ID })
    mockTx.installment.count.mockResolvedValue(0)
    mockTx.deal.update.mockResolvedValue({})

    await recordPayment(accountant, input)
    expect(mockTx.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: DealStatus.COMPLETED }),
      }),
    )
  })

  it('throws if deal is CANCELLED', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue({ ...baseDeal, status: DealStatus.CANCELLED })
    await expect(recordPayment(accountant, input)).rejects.toThrow(ConflictError)
  })

  it('throws if installment already PAID', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.installment.findFirst as any).mockResolvedValue({
      ...baseInstallment,
      amount: 100_000, paidAmount: 100_000, remainingAmount: 0,
      status: InstallmentStatus.PAID,
    })
    await expect(recordPayment(accountant, input)).rejects.toThrow(ConflictError)
  })
})

// ─── voidPayment ──────────────────────────────────────────────────────────────

describe('voidPayment', () => {
  it('voids a COMPLETED payment and reverses installment', async () => {
    ;(prisma.payment.findFirst as any).mockResolvedValue({
      id: PAY_ID, status: 'COMPLETED', amount: 100_000, installmentId: INST_ID,
    })
    mockTx.payment.update.mockResolvedValue({ ...basePayment, status: 'REFUNDED' })
    mockTx.installment.findUnique.mockResolvedValue({
      paidAmount: 100_000, amount: 100_000,
    })
    mockTx.installment.update.mockResolvedValue({})

    const result = await voidPayment(accountant, PAY_ID, 'error')
    expect(result).toMatchObject({ status: 'REFUNDED' })
    expect(mockTx.installment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InstallmentStatus.UPCOMING }),
      }),
    )
  })

  it('throws if payment is not COMPLETED', async () => {
    ;(prisma.payment.findFirst as any).mockResolvedValue({
      id: PAY_ID, status: 'REFUNDED', amount: 100_000, installmentId: null,
    })
    await expect(voidPayment(accountant, PAY_ID, 'x')).rejects.toThrow(ConflictError)
  })

  it('throws ForbiddenError for SALES_AGENT', async () => {
    ;(prisma.payment.findFirst as any).mockResolvedValue({
      id: PAY_ID, status: 'COMPLETED', amount: 100_000, installmentId: null,
    })
    await expect(voidPayment(agentActor, PAY_ID, 'x')).rejects.toThrow(ForbiddenError)
  })
})

// ─── listPayments ─────────────────────────────────────────────────────────────

describe('listPayments', () => {
  it('returns paginated results', async () => {
    ;(prisma.payment.findMany as any).mockResolvedValue([basePayment])
    ;(prisma.payment.count as any).mockResolvedValue(1)
    const result = await listPayments(accountant, { page: 1, limit: 20 })
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
  })
})
