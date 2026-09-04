import { z } from 'zod'

// ─── Date range (shared) ──────────────────────────────────────────────────────

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to:   z.string().datetime().optional(),
})

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export const dashboardQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to:   z.string().datetime().optional(),
})

// ─── Sales funnel ─────────────────────────────────────────────────────────────

export const funnelQuerySchema = z.object({
  from:    z.string().datetime().optional(),
  to:      z.string().datetime().optional(),
  agentId: z.string().cuid().optional(),
})

// ─── Revenue chart ────────────────────────────────────────────────────────────

export const revenueChartQuerySchema = z.object({
  from:        z.string().datetime().optional(),
  to:          z.string().datetime().optional(),
  granularity: z.enum(['day', 'week', 'month', 'quarter']).default('month'),
})

// ─── Leads over time ──────────────────────────────────────────────────────────

export const leadsOverTimeQuerySchema = z.object({
  from:        z.string().datetime().optional(),
  to:          z.string().datetime().optional(),
  granularity: z.enum(['day', 'week', 'month']).default('month'),
})

// ─── Lead source breakdown ────────────────────────────────────────────────────

export const leadSourceQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to:   z.string().datetime().optional(),
})

// ─── Agent performance ────────────────────────────────────────────────────────

export const agentPerformanceQuerySchema = z.object({
  from:    z.string().datetime().optional(),
  to:      z.string().datetime().optional(),
  agentId: z.string().cuid().optional(),
})

// ─── Property / project performance ──────────────────────────────────────────

export const propertyPerformanceQuerySchema = z.object({
  from:      z.string().datetime().optional(),
  to:        z.string().datetime().optional(),
  projectId: z.string().cuid().optional(),
})

// ─── Financial summary ────────────────────────────────────────────────────────

export const financialSummaryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to:   z.string().datetime().optional(),
})

// ─── Pipeline summary ─────────────────────────────────────────────────────────

export const pipelineQuerySchema = z.object({
  agentId: z.string().cuid().optional(),
})

// ─── Agent dashboard (self) ───────────────────────────────────────────────────

export const agentDashboardQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to:   z.string().datetime().optional(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardQuery          = z.infer<typeof dashboardQuerySchema>
export type FunnelQuery             = z.infer<typeof funnelQuerySchema>
export type RevenueChartQuery       = z.infer<typeof revenueChartQuerySchema>
export type LeadsOverTimeQuery      = z.infer<typeof leadsOverTimeQuerySchema>
export type LeadSourceQuery         = z.infer<typeof leadSourceQuerySchema>
export type AgentPerformanceQuery   = z.infer<typeof agentPerformanceQuerySchema>
export type PropertyPerfQuery       = z.infer<typeof propertyPerformanceQuerySchema>
export type FinancialSummaryQuery   = z.infer<typeof financialSummaryQuerySchema>
export type PipelineQuery           = z.infer<typeof pipelineQuerySchema>
export type AgentDashboardQuery     = z.infer<typeof agentDashboardQuerySchema>
