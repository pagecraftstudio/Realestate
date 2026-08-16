import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardKpis {
  leads:        { total: number; new: number; qualified: number }
  viewings:     { scheduled: number; completed: number }
  reservations: { active: number }
  deals:        { closed: number; totalRevenue: number; totalPaymentsCollected: number; avgDealValue: number; conversionRate: number }
  pipeline:     { value: number; weightedValue: number; dealCount: number }
  installments: { pendingCount: number; pendingAmount: number; overdueCount: number; overdueAmount: number }
  commissions:  { liabilityTotal: number }
}

export interface AgentDashboard {
  leads:      { total: number; new: number; overdueFollowups: number; dueToday: number }
  viewings:   { today: number; upcoming: number }
  deals:      { active: number; closed: number; revenue: number }
  commission: { total: number }
}

export interface FunnelStage {
  stage: string
  count: number
  conversionFromPrev: number | null
}

export interface SalesFunnel {
  funnel:           FunnelStage[]
  offerCount:       number
  reservationCount: number
  closedDealCount:  number
  kpis: {
    leadToQualified:    number
    qualifiedToViewing: number
    viewingToOffer:     number
    offerToReservation: number
    reservationToClose: number
  }
}

export interface RevenueSeries {
  granularity: string
  series:      { period: string; revenue: number }[]
}

export interface LeadsSeries {
  granularity: string
  series:      { period: string; count: number }[]
}

export interface LeadSource {
  source:     string
  count:      number
  percentage: number
}

export interface AgentPerf {
  agentId:     string
  name:        string
  leads:       number
  viewings:    number
  offers:      number
  deals:       number
  revenue:     number
  commission:  number
  conversionRate: number
}

export interface PipelineStage {
  stage:      string
  dealCount:  number
  totalValue: number
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function last30Days() {
  const to   = new Date()
  const from = new Date(Date.now() - 30 * 86400_000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function last90Days() {
  const to   = new Date()
  const from = new Date(Date.now() - 90 * 86400_000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function thisYear() {
  const to   = new Date()
  const from = new Date(new Date().getFullYear(), 0, 1)
  return { from: from.toISOString(), to: to.toISOString() }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDashboardKpis(params?: { from?: string; to?: string }) {
  return useQuery<DashboardKpis>({
    queryKey: ['analytics', 'dashboard', params],
    queryFn:  async () => {
      const res = await api.get('/api/v1/analytics/dashboard', { params })
      return res.data
    },
  })
}

export function useSalesFunnel(params?: { from?: string; to?: string }) {
  return useQuery<SalesFunnel>({
    queryKey: ['analytics', 'funnel', params],
    queryFn:  async () => {
      const res = await api.get('/api/v1/analytics/funnel', { params })
      return res.data
    },
  })
}

export function useRevenueChart(params?: { from?: string; to?: string; granularity?: string }) {
  return useQuery<RevenueSeries>({
    queryKey: ['analytics', 'revenue', params],
    queryFn:  async () => {
      const res = await api.get('/api/v1/analytics/revenue', { params })
      return res.data
    },
  })
}

export function useLeadsOverTime(params?: { from?: string; to?: string; granularity?: string }) {
  return useQuery<LeadsSeries>({
    queryKey: ['analytics', 'leads-over-time', params],
    queryFn:  async () => {
      const res = await api.get('/api/v1/analytics/leads/over-time', { params })
      return res.data
    },
  })
}

export function useLeadSources(params?: { from?: string; to?: string }) {
  return useQuery<LeadSource[]>({
    queryKey: ['analytics', 'lead-sources', params],
    queryFn:  async () => {
      const res = await api.get('/api/v1/analytics/leads/by-source', { params })
      return res.data
    },
  })
}

export function useAgentPerformance(params?: { from?: string; to?: string; agentId?: string }) {
  return useQuery<AgentPerf[]>({
    queryKey: ['analytics', 'agents', params],
    queryFn:  async () => {
      const res = await api.get('/api/v1/analytics/agents', { params })
      return res.data
    },
  })
}

export function usePipelineSummary() {
  return useQuery<PipelineStage[]>({
    queryKey: ['analytics', 'pipeline'],
    queryFn:  async () => {
      const res = await api.get('/api/v1/analytics/pipeline')
      return res.data
    },
  })
}

export type DateRange = { from: string; to: string }
