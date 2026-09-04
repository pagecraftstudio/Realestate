/**
 * Phase 16 — Analytics + Reports service
 *
 * All queries are scoped to organizationId. SALES_AGENTs only see their
 * own data (agentId filter applied automatically in agent-specific paths).
 *
 * Heavy aggregations run via Prisma groupBy + raw count queries.
 * Dates are stored in UTC; callers pass ISO-8601 datetimes.
 */

import { prisma } from '../../lib/prisma.js'
import { UserRole, DealStatus, LeadStatus, ViewingStatus, ReservationStatus, CommissionStatus, InstallmentStatus } from '@prisma/client'
import type { AuthUser } from '../../types/auth.js'
import type {
  DashboardQuery,
  FunnelQuery,
  RevenueChartQuery,
  LeadsOverTimeQuery,
  LeadSourceQuery,
  AgentPerformanceQuery,
  PropertyPerfQuery,
  FinancialSummaryQuery,
  PipelineQuery,
  AgentDashboardQuery,
} from './analytics.schema.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateFilter(from?: string, to?: string) {
  if (!from && !to) return undefined
  return {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to   ? { lte: new Date(to)   } : {}),
  }
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0
  const n = typeof val === 'object' ? Number(String(val)) : Number(val)
  return isNaN(n) ? 0 : n
}

const AGENT_ROLE = UserRole.SALES_AGENT

// ─── Dashboard KPIs (COMPANY_ADMIN / SALES_MANAGER) ──────────────────────────

export async function getDashboardKpis(actor: AuthUser, query: DashboardQuery) {
  const orgId = actor.organizationId
  const createdAt = dateFilter(query.from, query.to)

  const [
    totalLeads,
    newLeads,
    qualifiedLeads,
    scheduledViewings,
    completedViewings,
    activeReservations,
    closedDeals,
    totalDealValue,
    pendingInstallments,
    overdueInstallments,
    pendingCommissions,
    totalPaymentsAgg,
  ] = await Promise.all([
    prisma.lead.count({ where: { organizationId: orgId, ...(createdAt ? { createdAt } : {}) } }),

    prisma.lead.count({
      where: { organizationId: orgId, status: 'NEW', ...(createdAt ? { createdAt } : {}) },
    }),

    prisma.lead.count({
      where: { organizationId: orgId, status: 'QUALIFIED', ...(createdAt ? { createdAt } : {}) },
    }),

    prisma.viewing.count({
      where: {
        organizationId: orgId,
        status: 'SCHEDULED',
        ...(createdAt ? { scheduledAt: createdAt } : {}),
      },
    }),

    prisma.viewing.count({
      where: {
        organizationId: orgId,
        status: 'COMPLETED',
        ...(createdAt ? { scheduledAt: createdAt } : {}),
      },
    }),

    prisma.reservation.count({
      where: { organizationId: orgId, status: 'ACTIVE', ...(createdAt ? { createdAt } : {}) },
    }),

    prisma.deal.count({
      where: {
        organizationId: orgId,
        status: { in: [DealStatus.COMPLETED, DealStatus.CONTRACTED] },
        ...(createdAt ? { createdAt } : {}),
      },
    }),

    prisma.deal.aggregate({
      where: {
        organizationId: orgId,
        status: { in: [DealStatus.COMPLETED, DealStatus.CONTRACTED] },
        ...(createdAt ? { createdAt } : {}),
      },
      _sum: { netSaleValue: true },
    }),

    prisma.installment.aggregate({
      where: {
        organizationId: orgId,
        status: { in: [InstallmentStatus.DUE, InstallmentStatus.UPCOMING] },
      },
      _sum: { amount: true },
      _count: true,
    }),

    prisma.installment.aggregate({
      where: { organizationId: orgId, status: InstallmentStatus.OVERDUE },
      _sum: { amount: true },
      _count: true,
    }),

    prisma.commission.aggregate({
      where: {
        organizationId: orgId,
        status: { in: [CommissionStatus.PENDING, CommissionStatus.APPROVED, CommissionStatus.PAYABLE] },
      },
      _sum: { agentAmount: true, managerAmount: true },
    }),

    prisma.payment.aggregate({
      where: {
        organizationId: orgId,
        ...(createdAt ? { paidAt: createdAt } : {}),
      },
      _sum: { amount: true },
    }),
  ])

  // Pipeline value: sum of netSaleValue × probability for active deals
  const pipelineDeals = await prisma.deal.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: [DealStatus.COMPLETED, DealStatus.CANCELLED] },
    },
    select: { netSaleValue: true, probability: true },
  })

  const pipelineValue = pipelineDeals.reduce(
    (sum, d) => sum + toNumber(d.netSaleValue),
    0,
  )
  const weightedPipelineValue = pipelineDeals.reduce(
    (sum, d) => sum + toNumber(d.netSaleValue) * ((d.probability ?? 50) / 100),
    0,
  )

  // Conversion rate: qualified / total (non-zero guard)
  const conversionRate = totalLeads > 0
    ? Number(((closedDeals / totalLeads) * 100).toFixed(2))
    : 0

  // Average deal value
  const avgDealValue = closedDeals > 0
    ? toNumber(totalDealValue._sum.netSaleValue) / closedDeals
    : 0

  // Total commissions liability
  const totalCommissionLiability =
    toNumber(pendingCommissions._sum.agentAmount) +
    toNumber(pendingCommissions._sum.managerAmount)

  return {
    leads: {
      total:     totalLeads,
      new:       newLeads,
      qualified: qualifiedLeads,
    },
    viewings: {
      scheduled: scheduledViewings,
      completed: completedViewings,
    },
    reservations: {
      active: activeReservations,
    },
    deals: {
      closed:               closedDeals,
      totalRevenue:         toNumber(totalDealValue._sum.netSaleValue),
      totalPaymentsCollected: toNumber(totalPaymentsAgg._sum.amount),
      avgDealValue:         Number(avgDealValue.toFixed(2)),
      conversionRate,
    },
    pipeline: {
      value:         Number(pipelineValue.toFixed(2)),
      weightedValue: Number(weightedPipelineValue.toFixed(2)),
      dealCount:     pipelineDeals.length,
    },
    installments: {
      pendingCount:  pendingInstallments._count,
      pendingAmount: toNumber(pendingInstallments._sum.amount),
      overdueCount:  overdueInstallments._count,
      overdueAmount: toNumber(overdueInstallments._sum.amount),
    },
    commissions: {
      liabilityTotal: Number(totalCommissionLiability.toFixed(2)),
    },
  }
}

// ─── Agent dashboard (SALES_AGENT self-view) ─────────────────────────────────

export async function getAgentDashboard(actor: AuthUser, query: AgentDashboardQuery) {
  const orgId   = actor.organizationId
  const agentId = actor.userId
  const createdAt = dateFilter(query.from, query.to)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000)

  const [
    myLeads,
    newLeads,
    overdueFollowups,
    dueFollowups,
    todayViewings,
    upcomingViewings,
    myActiveDeals,
    myClosedDeals,
    myRevenueAgg,
    myCommissionAgg,
  ] = await Promise.all([
    prisma.lead.count({ where: { organizationId: orgId, assignedAgentId: agentId } }),

    prisma.lead.count({
      where: { organizationId: orgId, assignedAgentId: agentId, status: 'NEW' },
    }),

    prisma.lead.count({
      where: {
        organizationId: orgId,
        assignedAgentId: agentId,
        nextFollowupAt: { lt: now },
        status: { notIn: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.UNQUALIFIED] },
      },
    }),

    prisma.lead.count({
      where: {
        organizationId: orgId,
        assignedAgentId: agentId,
        nextFollowupAt: { gte: todayStart, lt: todayEnd },
      },
    }),

    prisma.viewing.count({
      where: {
        organizationId: orgId,
        agentId,
        scheduledAt: { gte: todayStart, lt: todayEnd },
      },
    }),

    prisma.viewing.count({
      where: {
        organizationId: orgId,
        agentId,
        scheduledAt: { gte: now },
        status: { in: [ViewingStatus.SCHEDULED, ViewingStatus.CONFIRMED] },
      },
    }),

    prisma.deal.count({
      where: {
        organizationId: orgId,
        agentId,
        status: { notIn: [DealStatus.COMPLETED, DealStatus.CANCELLED] },
      },
    }),

    prisma.deal.count({
      where: { organizationId: orgId, agentId, status: DealStatus.COMPLETED },
    }),

    prisma.deal.aggregate({
      where: { organizationId: orgId, agentId, status: DealStatus.COMPLETED },
      _sum: { netSaleValue: true },
    }),

    prisma.commission.aggregate({
      where: { organizationId: orgId, agentId },
      _sum: { agentAmount: true },
    }),
  ])

  return {
    leads: {
      total:           myLeads,
      new:             newLeads,
      overdueFollowups,
      dueToday:        dueFollowups,
    },
    viewings: {
      today:    todayViewings,
      upcoming: upcomingViewings,
    },
    deals: {
      active:  myActiveDeals,
      closed:  myClosedDeals,
      revenue: toNumber(myRevenueAgg._sum.netSaleValue),
    },
    commission: {
      total: toNumber(myCommissionAgg._sum.agentAmount),
    },
  }
}

// ─── Sales funnel ─────────────────────────────────────────────────────────────

export async function getSalesFunnel(actor: AuthUser, query: FunnelQuery) {
  const orgId = actor.organizationId
  const agentFilter = query.agentId ? { assignedAgentId: query.agentId } : {}
  const createdAt = dateFilter(query.from, query.to)

  const stages: LeadStatus[] = [
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'VIEWING_SCHEDULED',
    'VIEWING_COMPLETED',
    'NEGOTIATION',
    'RESERVED',
    'WON',
  ]

  const counts = await Promise.all(
    stages.map((status) =>
      prisma.lead.count({
        where: {
          organizationId: orgId,
          status,
          ...agentFilter,
          ...(createdAt ? { createdAt } : {}),
        },
      }),
    ),
  )

  const funnel = stages.map((stage, i) => ({
    stage,
    count: counts[i] ?? 0,
    conversionFromPrev: i === 0 || (counts[i - 1] ?? 0) === 0
      ? null
      : Number((((counts[i] ?? 0) / (counts[i - 1] ?? 1)) * 100).toFixed(2)),
  }))

  // Viewing → Offer → Reservation → Deal conversion rates
  const [totalOffers, totalReservations, closedDeals] = await Promise.all([
    prisma.offer.count({ where: { organizationId: orgId, ...(createdAt ? { createdAt } : {}) } }),
    prisma.reservation.count({ where: { organizationId: orgId, ...(createdAt ? { createdAt } : {}) } }),
    prisma.deal.count({
      where: { organizationId: orgId, status: DealStatus.COMPLETED, ...(createdAt ? { createdAt } : {}) },
    }),
  ])

  return {
    funnel,
    offerCount:       totalOffers,
    reservationCount: totalReservations,
    closedDealCount:  closedDeals,
    kpis: {
      leadToQualified:       (funnel[0]?.count ?? 0) > 0 ? Number((((funnel[2]?.count ?? 0) / (funnel[0]?.count ?? 1)) * 100).toFixed(2)) : 0,
      qualifiedToViewing:    (funnel[2]?.count ?? 0) > 0 ? Number((((funnel[3]?.count ?? 0) / (funnel[2]?.count ?? 1)) * 100).toFixed(2)) : 0,
      viewingToOffer:        (funnel[4]?.count ?? 0) > 0 ? Number(((totalOffers              / (funnel[4]?.count ?? 1)) * 100).toFixed(2)) : 0,
      offerToReservation:    totalOffers > 0       ? Number(((totalReservations / totalOffers)       * 100).toFixed(2)) : 0,
      reservationToClose:    totalReservations > 0 ? Number(((closedDeals       / totalReservations) * 100).toFixed(2)) : 0,
    },
  }
}

// ─── Revenue chart (time-series) ──────────────────────────────────────────────

export async function getRevenueChart(actor: AuthUser, query: RevenueChartQuery) {
  const orgId = actor.organizationId

  // Get payments grouped — use raw aggregation via Prisma
  const payments = await prisma.payment.findMany({
    where: {
      organizationId: orgId,
      ...(query.from || query.to
        ? { paidAt: (dateFilter(query.from, query.to) ?? undefined) }
        : {}),
    },
    select: { amount: true, paidAt: true },
    orderBy: { paidAt: 'asc' },
  })

  // Group by granularity in JS (avoids DB-specific date_trunc)
  const grouped = new Map<string, number>()

  for (const p of payments) {
    if (!p.paidAt) continue
    const key = bucketDate(p.paidAt, query.granularity)
    grouped.set(key, (grouped.get(key) ?? 0) + toNumber(p.amount))
  }

  const series = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, revenue]) => ({ period, revenue: Number(revenue.toFixed(2)) }))

  return { granularity: query.granularity, series }
}

// ─── Leads over time ──────────────────────────────────────────────────────────

export async function getLeadsOverTime(actor: AuthUser, query: LeadsOverTimeQuery) {
  const orgId = actor.organizationId

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      ...(query.from || query.to ? { createdAt: dateFilter(query.from, query.to) } : {}),
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const grouped = new Map<string, number>()
  for (const l of leads) {
    const key = bucketDate(l.createdAt, query.granularity)
    grouped.set(key, (grouped.get(key) ?? 0) + 1)
  }

  const series = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }))

  return { granularity: query.granularity, series }
}

// ─── Lead source breakdown ────────────────────────────────────────────────────

export async function getLeadSourceBreakdown(actor: AuthUser, query: LeadSourceQuery) {
  const orgId = actor.organizationId

  const groups = await prisma.lead.groupBy({
    by: ['source'],
    where: {
      organizationId: orgId,
      ...(query.from || query.to ? { createdAt: dateFilter(query.from, query.to) } : {}),
    },
    _count: { id: true },
    orderBy: { _count: { source: 'desc' } },
  })

  const total = groups.reduce((s, g) => s + (g._count?.id ?? 0), 0)

  return groups.map((g) => ({
    source:     g.source,
    count:      g._count.id,
    percentage: total > 0 ? Number(((g._count.id / total) * 100).toFixed(2)) : 0,
  }))
}

// ─── Agent performance / leaderboard ─────────────────────────────────────────

export async function getAgentPerformance(actor: AuthUser, query: AgentPerformanceQuery) {
  const orgId = actor.organizationId
  const createdAt = dateFilter(query.from, query.to)

  // Get all agents in org
  const agents = await prisma.user.findMany({
    where: { organizationId: orgId, role: AGENT_ROLE, status: 'ACTIVE' },
    select: {
      id: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  })

  const agentIds = query.agentId
    ? agents.filter((a) => a.id === query.agentId).map((a) => a.id)
    : agents.map((a) => a.id)

  const results = await Promise.all(
    agentIds.map(async (agentId) => {
      const agent = agents.find((a) => a.id === agentId)!

      const [leads, viewings, offers, deals, revenue, commission] = await Promise.all([
        prisma.lead.count({
          where: { organizationId: orgId, assignedAgentId: agentId, ...(createdAt ? { createdAt } : {}) },
        }),
        prisma.viewing.count({
          where: { organizationId: orgId, agentId, ...(createdAt ? { scheduledAt: createdAt } : {}) },
        }),
        prisma.offer.count({
          where: { organizationId: orgId, agentId, ...(createdAt ? { createdAt } : {}) },
        }),
        prisma.deal.count({
          where: {
            organizationId: orgId,
            agentId,
            status: DealStatus.COMPLETED,
            ...(createdAt ? { createdAt } : {}),
          },
        }),
        prisma.deal.aggregate({
          where: {
            organizationId: orgId,
            agentId,
            status: DealStatus.COMPLETED,
            ...(createdAt ? { createdAt } : {}),
          },
          _sum: { netSaleValue: true },
        }),
        prisma.commission.aggregate({
          where: { organizationId: orgId, agentId },
          _sum: { agentAmount: true },
        }),
      ])

      return {
        agentId,
        name: agent.profile
          ? `${agent.profile.firstName} ${agent.profile.lastName}`
          : agentId,
        leads,
        viewings,
        offers,
        closedDeals: deals,
        revenue:     toNumber(revenue._sum.netSaleValue),
        commission:  toNumber(commission._sum.agentAmount),
        conversionRate: leads > 0 ? Number(((deals / leads) * 100).toFixed(2)) : 0,
      }
    }),
  )

  // Sort by revenue descending (leaderboard)
  results.sort((a, b) => b.revenue - a.revenue)
  return results.map((r, i) => ({ rank: i + 1, ...r }))
}

// ─── Property / project performance ──────────────────────────────────────────

export async function getPropertyPerformance(actor: AuthUser, query: PropertyPerfQuery) {
  const orgId = actor.organizationId
  const createdAt = dateFilter(query.from, query.to)

  const projects = await prisma.project.findMany({
    where: {
      organizationId: orgId,
      ...(query.projectId ? { id: query.projectId } : {}),
    },
    select: {
      id:   true,
      name: true,
      units: {
        select: {
          id:     true,
          status: true,
          price:  true,
          deal:   {
            select: {
              netSaleValue: true,
              status:       true,
              createdAt:    true,
            },
          },
        },
      },
    },
  })

  return projects.map((project) => {
    const units = project.units
    const totalUnits     = units.length
    const soldUnits      = units.filter((u) => u.status === 'SOLD' || u.status === 'CONTRACTED').length
    const availableUnits = units.filter((u) => u.status === 'AVAILABLE').length
    const reservedUnits  = units.filter((u) => u.status === 'RESERVED').length

    const closedDeals = units
      .map((u) => u.deal)
      .filter((d) => d && d.status === DealStatus.COMPLETED)
      .filter((d) => {
        if (!createdAt || !d) return true
        const t = d.createdAt.getTime()
        const from = createdAt.gte ? createdAt.gte.getTime() : -Infinity
        const to   = createdAt.lte ? createdAt.lte.getTime() :  Infinity
        return t >= from && t <= to
      })

    const revenue = closedDeals.reduce(
      (s, d) => s + toNumber(d?.netSaleValue),
      0,
    )

    const occupancyRate = totalUnits > 0
      ? Number((((soldUnits + reservedUnits) / totalUnits) * 100).toFixed(2))
      : 0

    return {
      projectId:     project.id,
      projectName:   project.name,
      totalUnits,
      availableUnits,
      reservedUnits,
      soldUnits,
      closedDealCount: closedDeals.length,
      revenue:         Number(revenue.toFixed(2)),
      occupancyRate,
    }
  })
}

// ─── Financial summary ────────────────────────────────────────────────────────

export async function getFinancialSummary(actor: AuthUser, query: FinancialSummaryQuery) {
  const orgId = actor.organizationId
  const paidAt = dateFilter(query.from, query.to)

  const [
    totalPayments,
    overdueInstallments,
    upcomingInstallments,
    paidCommissions,
    pendingCommissions,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { organizationId: orgId, ...(paidAt ? { paidAt } : {}) },
      _sum: { amount: true },
      _count: true,
    }),

    prisma.installment.aggregate({
      where: { organizationId: orgId, status: InstallmentStatus.OVERDUE },
      _sum: { amount: true },
      _count: true,
    }),

    prisma.installment.aggregate({
      where: {
        organizationId: orgId,
        status: { in: [InstallmentStatus.UPCOMING, InstallmentStatus.DUE] },
      },
      _sum: { amount: true },
      _count: true,
    }),

    prisma.commission.aggregate({
      where: { organizationId: orgId, status: CommissionStatus.PAID },
      _sum: { agentAmount: true, managerAmount: true },
    }),

    prisma.commission.aggregate({
      where: {
        organizationId: orgId,
        status: { in: [CommissionStatus.PENDING, CommissionStatus.APPROVED, CommissionStatus.PAYABLE] },
      },
      _sum: { agentAmount: true, managerAmount: true },
    }),
  ])

  const paidCommTotal    = toNumber(paidCommissions._sum.agentAmount) + toNumber(paidCommissions._sum.managerAmount)
  const pendingCommTotal = toNumber(pendingCommissions._sum.agentAmount) + toNumber(pendingCommissions._sum.managerAmount)

  return {
    payments: {
      total:  toNumber(totalPayments._sum.amount),
      count:  totalPayments._count,
    },
    installments: {
      overdue: {
        amount: toNumber(overdueInstallments._sum.amount),
        count:  overdueInstallments._count,
      },
      upcoming: {
        amount: toNumber(upcomingInstallments._sum.amount),
        count:  upcomingInstallments._count,
      },
    },
    commissions: {
      paid:    Number(paidCommTotal.toFixed(2)),
      pending: Number(pendingCommTotal.toFixed(2)),
    },
  }
}

// ─── Pipeline summary (per stage) ────────────────────────────────────────────

export async function getPipelineSummary(actor: AuthUser, query: PipelineQuery) {
  const orgId = actor.organizationId
  const agentFilter = query.agentId ? { agentId: query.agentId } : {}

  const groups = await prisma.deal.groupBy({
    by: ['pipelineStage'],
    where: {
      organizationId: orgId,
      status: { notIn: [DealStatus.COMPLETED, DealStatus.CANCELLED] },
      ...agentFilter,
    },
    _count: { id: true },
    _sum:   { netSaleValue: true },
  })

  const totalValue = groups.reduce((s, g) => s + toNumber(g._sum.netSaleValue), 0)
  const totalCount = groups.reduce((s, g) => s + (g._count?.id ?? 0), 0)

  return {
    stages: groups.map((g) => ({
      stage:      g.pipelineStage,
      count:      g._count?.id ?? 0,
      totalValue: toNumber(g._sum.netSaleValue),
    })),
    totals: {
      dealCount:     totalCount,
      pipelineValue: Number(totalValue.toFixed(2)),
    },
  }
}

// ─── Sales by X reports ───────────────────────────────────────────────────────

export async function getSalesByAgent(actor: AuthUser, query: { from?: string; to?: string }) {
  return getAgentPerformance(actor, query)
}

export async function getSalesBySource(actor: AuthUser, query: { from?: string; to?: string }) {
  const orgId = actor.organizationId
  const createdAt = dateFilter(query.from, query.to)

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      ...(createdAt ? { createdAt } : {}),
    },
    select: { source: true, customer: { select: { deals: { select: { netSaleValue: true, status: true } } } } },
  })

  const bySource = new Map<string, { leads: number; deals: number; revenue: number }>()

  for (const l of leads) {
    const entry = bySource.get(l.source) ?? { leads: 0, deals: 0, revenue: 0 }
    entry.leads++
    const closedDeals = (l.customer?.deals ?? []).filter((d) => d.status === DealStatus.COMPLETED)
    entry.deals   += closedDeals.length
    entry.revenue += closedDeals.reduce((s, d) => s + toNumber(d.netSaleValue), 0)
    bySource.set(l.source, entry)
  }

  return [...bySource.entries()]
    .map(([source, data]) => ({
      source,
      leadCount:       data.leads,
      dealCount:       data.deals,
      revenue:         Number(data.revenue.toFixed(2)),
      conversionRate:  data.leads > 0 ? Number(((data.deals / data.leads) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ─── Utility: bucket a date by granularity ────────────────────────────────────

function bucketDate(date: Date, granularity: 'day' | 'week' | 'month' | 'quarter'): string {
  const d = new Date(date)
  switch (granularity) {
    case 'day':
      return d.toISOString().slice(0, 10)
    case 'week': {
      // ISO week: Monday as first day
      const day = d.getDay() || 7
      d.setDate(d.getDate() - day + 1)
      return d.toISOString().slice(0, 10)
    }
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    case 'quarter': {
      const q = Math.floor(d.getMonth() / 3) + 1
      return `${d.getFullYear()}-Q${q}`
    }
  }
}
