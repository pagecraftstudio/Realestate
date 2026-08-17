import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCommissionRule,
  listCommissionRules,
  getCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  calculateCommission,
  listCommissions,
  getCommission,
  updateCommissionStatus,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../commissions.service.js'
import { CommissionStatus, DealStatus, UserRole } from '../../lib/enums.js'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockTx = {
  commissionRule: { updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  commission:     {},
}

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((fn: any) => fn(mockTx)),
    commissionRule: {
      findFirst:  vi.fn(),
      findMany:   vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      updateMany: vi.fn(),
      delete:     vi.fn(),
      count:      vi.fn(),
    },
    commission: {
      findFirst: vi.fn(),
      findMany:  vi.fn(),
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
const RULE_ID  = 'rule_1'
const COMM_ID  = 'comm_1'
const AGENT_ID = 'agent_1'
const MGR_ID   = 'mgr_1'

const adminActor     = { id: MGR_ID, userId: MGR_ID, supabaseUid: 'sb-test',   organizationId: ORG_ID, role: UserRole.COMPANY_ADMIN }
const accountant     = { id: 'acc_1', userId: 'acc_1', supabaseUid: 'sb-test',  organizationId: ORG_ID, role: UserRole.ACCOUNTANT }
const agentActor     = { id: AGENT_ID, userId: AGENT_ID, supabaseUid: 'sb-test', organizationId: ORG_ID, role: UserRole.SALES_AGENT }

const baseRule = {
  id: RULE_ID, organizationId: ORG_ID,
  name: 'Standard', agentRate: 2.5, managerRate: 0.5,
  isDefault: true, conditions: {},
  createdAt: new Date(), updatedAt: new Date(),
}

const baseDeal = {
  id: DEAL_ID, organizationId: ORG_ID,
  status: DealStatus.CONTRACTED,
  netSaleValue: 1_000_000,
  agentId: AGENT_ID, managerId: MGR_ID,
}

const baseCommission = {
  id: COMM_ID, organizationId: ORG_ID,
  dealId: DEAL_ID, agentId: AGENT_ID, managerId: MGR_ID,
  agentRate: 2.5, managerRate: 0.5,
  agentAmount: 25_000, managerAmount: 5_000, totalAmount: 30_000,
  status: CommissionStatus.PENDING,
  approvedAt: null, paidAt: null, notes: null,
  createdAt: new Date(), updatedAt: new Date(),
  deal: { id: DEAL_ID, dealNumber: 'DEAL-202608-00001', netSaleValue: 1_000_000, status: DealStatus.CONTRACTED, unit: { id: 'u1', unitNumber: '101' } },
  agent: { id: AGENT_ID, profile: { firstName: 'Ali', lastName: 'Hassan' } },
  manager: { id: MGR_ID, profile: { firstName: 'Sara', lastName: 'Ahmed' } },
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.values(mockTx).forEach((model) =>
    Object.values(model).forEach((fn: any) => fn?.mockReset?.()),
  )
})

// ─── createCommissionRule ─────────────────────────────────────────────────────

describe('createCommissionRule', () => {
  it('creates rule and unsets previous default', async () => {
    mockTx.commissionRule.updateMany.mockResolvedValue({ count: 1 })
    mockTx.commissionRule.create.mockResolvedValue(baseRule)

    const result = await createCommissionRule(adminActor, {
      name: 'Standard', agentRate: 2.5, managerRate: 0.5, isDefault: true, conditions: {},
    })

    expect(mockTx.commissionRule.updateMany).toHaveBeenCalledOnce()
    expect(mockTx.commissionRule.create).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ id: RULE_ID })
  })

  it('skips unset-default when isDefault=false', async () => {
    mockTx.commissionRule.create.mockResolvedValue({ ...baseRule, isDefault: false })

    await createCommissionRule(adminActor, {
      name: 'Non-default', agentRate: 2, managerRate: 0, isDefault: false, conditions: {},
    })

    expect(mockTx.commissionRule.updateMany).not.toHaveBeenCalled()
  })

  it('throws ForbiddenError for SALES_AGENT', async () => {
    await expect(
      createCommissionRule(agentActor, {
        name: 'x', agentRate: 2, managerRate: 0, isDefault: false, conditions: {},
      }),
    ).rejects.toThrow(ForbiddenError)
  })
})

// ─── deleteCommissionRule ─────────────────────────────────────────────────────

describe('deleteCommissionRule', () => {
  it('deletes existing rule', async () => {
    ;(prisma.commissionRule.findFirst as any).mockResolvedValue(baseRule)
    ;(prisma.commissionRule.delete as any).mockResolvedValue({})
    const result = await deleteCommissionRule(adminActor, RULE_ID)
    expect(result).toMatchObject({ success: true })
  })

  it('throws NotFoundError if missing', async () => {
    ;(prisma.commissionRule.findFirst as any).mockResolvedValue(null)
    await expect(deleteCommissionRule(adminActor, RULE_ID)).rejects.toThrow(NotFoundError)
  })
})

// ─── calculateCommission ──────────────────────────────────────────────────────

describe('calculateCommission', () => {
  it('calculates from default rule', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.commission.findFirst as any).mockResolvedValue(null)
    ;(prisma.commissionRule.findFirst as any).mockResolvedValue(baseRule)
    ;(prisma.commission.create as any).mockResolvedValue(baseCommission)

    const result = await calculateCommission(adminActor, { dealId: DEAL_ID })

    expect(prisma.commission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentAmount:   25_000,
          managerAmount: 5_000,
          totalAmount:   30_000,
        }),
      }),
    )
    expect(result).toMatchObject({ id: COMM_ID })
  })

  it('calculates from manual rates', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.commission.findFirst as any).mockResolvedValue(null)
    ;(prisma.commission.create as any).mockResolvedValue({
      ...baseCommission, agentAmount: 30_000, managerAmount: 0, totalAmount: 30_000,
    })

    await calculateCommission(adminActor, {
      dealId: DEAL_ID, agentRate: 3, managerRate: 0,
    })

    expect(prisma.commission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ agentRate: 3, managerRate: 0 }),
      }),
    )
    // commissionRule should NOT be queried
    expect(prisma.commissionRule.findFirst).not.toHaveBeenCalled()
  })

  it('throws ConflictError if commission already exists', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.commission.findFirst as any).mockResolvedValue({ id: COMM_ID })
    await expect(calculateCommission(adminActor, { dealId: DEAL_ID })).rejects.toThrow(ConflictError)
  })

  it('throws NotFoundError if no default rule and no manual rate', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue(baseDeal)
    ;(prisma.commission.findFirst as any).mockResolvedValue(null)
    ;(prisma.commissionRule.findFirst as any).mockResolvedValue(null)
    await expect(calculateCommission(adminActor, { dealId: DEAL_ID })).rejects.toThrow(NotFoundError)
  })

  it('throws ConflictError if deal is CANCELLED', async () => {
    ;(prisma.deal.findFirst as any).mockResolvedValue({ ...baseDeal, status: DealStatus.CANCELLED })
    ;(prisma.commission.findFirst as any).mockResolvedValue(null)
    await expect(calculateCommission(adminActor, { dealId: DEAL_ID })).rejects.toThrow(ConflictError)
  })

  it('throws ForbiddenError for SALES_AGENT', async () => {
    await expect(calculateCommission(agentActor, { dealId: DEAL_ID })).rejects.toThrow(ForbiddenError)
  })
})

// ─── listCommissions ──────────────────────────────────────────────────────────

describe('listCommissions', () => {
  it('returns all for admin', async () => {
    ;(prisma.commission.findMany as any).mockResolvedValue([baseCommission])
    ;(prisma.commission.count as any).mockResolvedValue(1)
    const result = await listCommissions(adminActor, { page: 1, limit: 20 })
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    // No agentId filter for admin
    expect(prisma.commission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ agentId: adminActor.id }),
      }),
    )
  })

  it('filters by own agentId for SALES_AGENT', async () => {
    ;(prisma.commission.findMany as any).mockResolvedValue([])
    ;(prisma.commission.count as any).mockResolvedValue(0)
    await listCommissions(agentActor, { page: 1, limit: 20 })
    expect(prisma.commission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ agentId: AGENT_ID }),
      }),
    )
  })
})

// ─── updateCommissionStatus ───────────────────────────────────────────────────

describe('updateCommissionStatus', () => {
  it('transitions PENDING→APPROVED and sets approvedAt', async () => {
    ;(prisma.commission.findFirst as any).mockResolvedValue({ id: COMM_ID, status: CommissionStatus.PENDING })
    ;(prisma.commission.update as any).mockResolvedValue({
      ...baseCommission, status: CommissionStatus.APPROVED,
    })

    const result = await updateCommissionStatus(accountant, COMM_ID, { status: 'APPROVED' })
    expect(result).toMatchObject({ status: CommissionStatus.APPROVED })
    expect(prisma.commission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approvedAt: expect.any(Date) }),
      }),
    )
  })

  it('transitions PAYABLE→PAID and sets paidAt', async () => {
    ;(prisma.commission.findFirst as any).mockResolvedValue({ id: COMM_ID, status: CommissionStatus.PAYABLE })
    ;(prisma.commission.update as any).mockResolvedValue({
      ...baseCommission, status: CommissionStatus.PAID,
    })

    await updateCommissionStatus(accountant, COMM_ID, { status: 'PAID' })
    expect(prisma.commission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paidAt: expect.any(Date) }),
      }),
    )
  })

  it('throws ConflictError on invalid transition PENDING→PAID', async () => {
    ;(prisma.commission.findFirst as any).mockResolvedValue({ id: COMM_ID, status: CommissionStatus.PENDING })
    await expect(
      updateCommissionStatus(accountant, COMM_ID, { status: 'PAID' }),
    ).rejects.toThrow(ConflictError)
  })

  it('throws ConflictError on transition from PAID', async () => {
    ;(prisma.commission.findFirst as any).mockResolvedValue({ id: COMM_ID, status: CommissionStatus.PAID })
    await expect(
      updateCommissionStatus(accountant, COMM_ID, { status: 'CANCELLED' }),
    ).rejects.toThrow(ConflictError)
  })

  it('throws ForbiddenError for SALES_AGENT', async () => {
    await expect(
      updateCommissionStatus(agentActor, COMM_ID, { status: 'APPROVED' }),
    ).rejects.toThrow(ForbiddenError)
  })
})
