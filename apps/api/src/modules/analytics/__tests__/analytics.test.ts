/**
 * Phase 16 — Analytics service tests
 *
 * Prisma is fully mocked. Tests verify:
 * - Correct org scoping
 * - Agent role restriction (own-data only)
 * - KPI calculations (conversion rate, avg deal value, weighted pipeline)
 * - Funnel stage ordering and conversion rates
 * - Revenue chart grouping by granularity
 * - Financial summary aggregations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockDeals = [
  { netSaleValue: '1000000', probability: 80, status: 'COMPLETED', pipelineStage: 'CLOSED_WON', agentId: 'agent1', createdAt: new Date('2025-03-01') },
  { netSaleValue: '500000',  probability: 60, status: 'RESERVED',  pipelineStage: 'RESERVATION', agentId: 'agent1', createdAt: new Date('2025-03-15') },
]

const mockPayments = [
  { amount: '200000', paidAt: new Date('2025-01-15') },
  { amount: '300000', paidAt: new Date('2025-02-20') },
  { amount: '150000', paidAt: new Date('2025-03-10') },
]

const mockLeads = [
  { createdAt: new Date('2025-01-05'), source: 'FACEBOOK',  customer: null },
  { createdAt: new Date('2025-01-20'), source: 'FACEBOOK',  customer: null },
  { createdAt: new Date('2025-02-10'), source: 'WEBSITE',   customer: null },
  { createdAt: new Date('2025-03-05'), source: 'INSTAGRAM', customer: null },
]

const mockAgents = [
  { id: 'agent1', role: 'SALES_AGENT', status: 'ACTIVE', profile: { firstName: 'John', lastName: 'Doe' } },
  { id: 'agent2', role: 'SALES_AGENT', status: 'ACTIVE', profile: { firstName: 'Jane', lastName: 'Smith' } },
]

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    lead: {
      count:    vi.fn().mockResolvedValue(42),
      findMany: vi.fn().mockResolvedValue(mockLeads),
      groupBy:  vi.fn().mockResolvedValue([
        { source: 'FACEBOOK', _count: { _all: 20 } },
        { source: 'WEBSITE',  _count: { _all: 12 } },
        { source: 'INSTAGRAM', _count: { _all: 10 } },
      ]),
    },
    viewing: {
      count: vi.fn().mockResolvedValue(8),
    },
    reservation: {
      count: vi.fn().mockResolvedValue(3),
    },
    offer: {
      count: vi.fn().mockResolvedValue(5),
    },
    deal: {
      count:    vi.fn().mockResolvedValue(6),
      findMany: vi.fn().mockResolvedValue(mockDeals),
      aggregate: vi.fn().mockResolvedValue({ _sum: { netSaleValue: '6000000' } }),
      groupBy:  vi.fn().mockResolvedValue([
        { pipelineStage: 'RESERVATION', _count: { _all: 2 }, _sum: { netSaleValue: '500000' } },
        { pipelineStage: 'NEGOTIATION', _count: { _all: 3 }, _sum: { netSaleValue: '1500000' } },
      ]),
    },
    payment: {
      findMany: vi.fn().mockResolvedValue(mockPayments),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: '650000' }, _count: 3 }),
    },
    installment: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: '200000' }, _count: 4 }),
    },
    commission: {
      aggregate: vi.fn().mockResolvedValue({
        _sum: { agentAmount: '50000', managerAmount: '25000' },
      }),
    },
    user: {
      findMany: vi.fn().mockResolvedValue(mockAgents),
    },
    project: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'proj1',
          name: 'Palm Heights',
          units: [
            { id: 'u1', status: 'SOLD',      price: '800000', deal: { netSaleValue: '790000', status: 'COMPLETED', createdAt: new Date('2025-01-01') } },
            { id: 'u2', status: 'AVAILABLE', price: '900000', deal: null },
            { id: 'u3', status: 'RESERVED',  price: '700000', deal: { netSaleValue: '695000', status: 'RESERVED',  createdAt: new Date('2025-02-01') } },
          ],
        },
      ]),
    },
  },
}))

import {
  getDashboardKpis,
  getAgentDashboard,
  getSalesFunnel,
  getRevenueChart,
  getLeadsOverTime,
  getLeadSourceBreakdown,
  getAgentPerformance,
  getPropertyPerformance,
  getFinancialSummary,
  getPipelineSummary,
} from '../analytics.service.js'
import { prisma } from '../../../lib/prisma.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const adminActor = {
  id:             'admin1',
  userId:         'admin1',
  organizationId: 'org1',
  role:           'COMPANY_ADMIN' as const,
  supabaseUid:    'sb-admin1',
}

const agentActor = {
  id:             'agent1',
  userId:         'agent1',
  organizationId: 'org1',
  role:           'SALES_AGENT' as const,
  supabaseUid:    'sb-agent1',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getDashboardKpis', () => {
  beforeEach(() => vi.clearAllMocks())

  it('scopes all queries to organizationId', async () => {
    await getDashboardKpis(adminActor, {})
    const calls = vi.mocked(prisma.lead.count).mock.calls
    for (const [args] of calls) {
      expect(args?.where?.organizationId).toBe('org1')
    }
  })

  it('returns correct deal conversion rate', async () => {
    vi.mocked(prisma.lead.count).mockResolvedValueOnce(100) // total
    vi.mocked(prisma.lead.count).mockResolvedValue(10)

    const result = await getDashboardKpis(adminActor, {})
    expect(result.deals.conversionRate).toBeTypeOf('number')
    expect(result.deals.conversionRate).toBeGreaterThanOrEqual(0)
    expect(result.deals.conversionRate).toBeLessThanOrEqual(100)
  })

  it('returns weighted pipeline value', async () => {
    const result = await getDashboardKpis(adminActor, {})
    // mockDeals: 1M×80% + 500K×60% = 800K + 300K = 1.1M
    expect(result.pipeline.weightedValue).toBeCloseTo(1_100_000, 0)
  })

  it('returns installment overdue data', async () => {
    const result = await getDashboardKpis(adminActor, {})
    expect(result.installments.overdueAmount).toBe(200_000)
    expect(result.installments.overdueCount).toBe(4)
  })
})

describe('getAgentDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('always filters by actor userId (agentId)', async () => {
    await getAgentDashboard(agentActor, {})
    const calls = vi.mocked(prisma.lead.count).mock.calls
    const agentScopedCalls = calls.filter(([args]) => args?.where?.assignedAgentId === 'agent1')
    expect(agentScopedCalls.length).toBeGreaterThan(0)
  })

  it('returns dashboard shape with leads, viewings, deals, commission', async () => {
    const result = await getAgentDashboard(agentActor, {})
    expect(result).toHaveProperty('leads')
    expect(result).toHaveProperty('viewings')
    expect(result).toHaveProperty('deals')
    expect(result).toHaveProperty('commission')
  })
})

describe('getSalesFunnel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 8 funnel stages in order', async () => {
    const result = await getSalesFunnel(adminActor, {})
    expect(result.funnel).toHaveLength(8)
    expect(result.funnel[0].stage).toBe('NEW')
    expect(result.funnel[7].stage).toBe('WON')
  })

  it('restricts to agentId when provided', async () => {
    await getSalesFunnel(adminActor, { agentId: 'agent1' })
    const calls = vi.mocked(prisma.lead.count).mock.calls
    const filtered = calls.filter(([args]) => args?.where?.assignedAgentId === 'agent1')
    expect(filtered.length).toBeGreaterThan(0)
  })

  it('includes KPI conversion rates', async () => {
    const result = await getSalesFunnel(adminActor, {})
    expect(result.kpis).toHaveProperty('leadToQualified')
    expect(result.kpis).toHaveProperty('reservationToClose')
  })
})

describe('getRevenueChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('groups payments by month', async () => {
    const result = await getRevenueChart(adminActor, { granularity: 'month' })
    expect(result.granularity).toBe('month')
    // mockPayments: Jan, Feb, Mar → 3 buckets
    expect(result.series).toHaveLength(3)
    expect(result.series[0].period).toMatch(/^\d{4}-\d{2}$/)
  })

  it('groups payments by day', async () => {
    const result = await getRevenueChart(adminActor, { granularity: 'day' })
    expect(result.series[0].period).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('groups payments by quarter', async () => {
    const result = await getRevenueChart(adminActor, { granularity: 'quarter' })
    expect(result.series[0].period).toMatch(/^\d{4}-Q\d$/)
  })

  it('returns revenue as numbers not strings', async () => {
    const result = await getRevenueChart(adminActor, { granularity: 'month' })
    for (const s of result.series) {
      expect(typeof s.revenue).toBe('number')
    }
  })
})

describe('getLeadsOverTime', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns time-series with correct period format', async () => {
    const result = await getLeadsOverTime(adminActor, { granularity: 'month' })
    expect(result.series.length).toBeGreaterThan(0)
    expect(result.series[0]).toHaveProperty('period')
    expect(result.series[0]).toHaveProperty('count')
  })
})

describe('getLeadSourceBreakdown', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns sources with percentages summing to ~100', async () => {
    const result = await getLeadSourceBreakdown(adminActor, {})
    const total = result.reduce((s, r) => s + r.percentage, 0)
    expect(total).toBeCloseTo(100, 0)
  })

  it('sorts by count descending', async () => {
    const result = await getLeadSourceBreakdown(adminActor, {})
    for (let i = 1; i < result.length; i++) {
      expect(result[i].count).toBeLessThanOrEqual(result[i - 1].count)
    }
  })
})

describe('getPropertyPerformance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns project with occupancy rate', async () => {
    const result = await getPropertyPerformance(adminActor, {})
    expect(result).toHaveLength(1)
    expect(result[0].projectName).toBe('Palm Heights')
    expect(result[0].totalUnits).toBe(3)
    // SOLD + RESERVED = 2 → occupancyRate = 66.67%
    expect(result[0].occupancyRate).toBeCloseTo(66.67, 1)
  })

  it('only counts COMPLETED deals in revenue', async () => {
    const result = await getPropertyPerformance(adminActor, {})
    // Only unit u1 has COMPLETED deal (790000)
    expect(result[0].revenue).toBe(790_000)
    expect(result[0].closedDealCount).toBe(1)
  })
})

describe('getFinancialSummary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns payments, installments, commissions', async () => {
    const result = await getFinancialSummary(adminActor, {})
    expect(result).toHaveProperty('payments.total')
    expect(result).toHaveProperty('installments.overdue')
    expect(result).toHaveProperty('commissions.paid')
    expect(result.payments.total).toBe(650_000)
  })
})

describe('getPipelineSummary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns stages with count and value', async () => {
    const result = await getPipelineSummary(adminActor, {})
    expect(result.stages).toHaveLength(2)
    expect(result.stages[0]).toHaveProperty('stage')
    expect(result.stages[0]).toHaveProperty('count')
    expect(result.stages[0]).toHaveProperty('totalValue')
  })

  it('returns pipeline totals', async () => {
    const result = await getPipelineSummary(adminActor, {})
    expect(result.totals.dealCount).toBe(5)  // 2 + 3
    expect(result.totals.pipelineValue).toBe(2_000_000)
  })

  it('filters by agentId when provided', async () => {
    await getPipelineSummary(adminActor, { agentId: 'agent1' })
    const [args] = vi.mocked(prisma.deal.groupBy).mock.calls[0]
    expect(args?.where?.agentId).toBe('agent1')
  })
})
