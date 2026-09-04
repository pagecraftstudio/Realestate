/**
 * Phase 16 — Analytics + Reports routes
 *
 * Routes:
 *   GET /analytics/dashboard           — role-aware KPI dashboard
 *   GET /analytics/funnel              — sales funnel stages
 *   GET /analytics/revenue             — revenue time-series chart
 *   GET /analytics/leads/over-time     — leads over time
 *   GET /analytics/leads/by-source     — lead source breakdown
 *   GET /analytics/agents              — agent leaderboard / performance
 *   GET /analytics/properties          — project/property performance
 *   GET /analytics/pipeline            — pipeline by stage
 *   GET /analytics/financial           — financial summary
 *   GET /analytics/reports/sales/by-agent   — sales report by agent
 *   GET /analytics/reports/sales/by-source  — sales report by source
 */

import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import { UserRole } from '@prisma/client'
import {
  dashboardQuerySchema,
  funnelQuerySchema,
  revenueChartQuerySchema,
  leadsOverTimeQuerySchema,
  leadSourceQuerySchema,
  agentPerformanceQuerySchema,
  propertyPerformanceQuerySchema,
  financialSummaryQuerySchema,
  pipelineQuerySchema,
  agentDashboardQuerySchema,
  dateRangeSchema,
} from './analytics.schema.js'
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
  getSalesByAgent,
  getSalesBySource,
} from './analytics.service.js'
import type { AuthUser } from '../../types/auth.js'

const AGENT_ROLE = UserRole.SALES_AGENT

export async function analyticsRoutes(fastify: FastifyInstance) {
  // ── GET /analytics/dashboard ──────────────────────────────────────────────
  // Role-aware: SALES_AGENT gets their own view; everyone else gets org-wide KPIs
  fastify.get(
    '/dashboard',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser

      if (actor.role === AGENT_ROLE) {
        const query = agentDashboardQuerySchema.parse(request.query)
        return getAgentDashboard(actor, query)
      }

      const query = dashboardQuerySchema.parse(request.query)
      return getDashboardKpis(actor, query)
    },
  )

  // ── GET /analytics/funnel ─────────────────────────────────────────────────
  fastify.get(
    '/funnel',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = funnelQuerySchema.parse(request.query)

      // Agents can only see their own funnel
      if (actor.role === AGENT_ROLE) {
        query.agentId = actor.userId
      }

      return getSalesFunnel(actor, query)
    },
  )

  // ── GET /analytics/revenue ────────────────────────────────────────────────
  fastify.get(
    '/revenue',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = revenueChartQuerySchema.parse(request.query)
      return getRevenueChart(actor, query)
    },
  )

  // ── GET /analytics/leads/over-time ────────────────────────────────────────
  fastify.get(
    '/leads/over-time',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = leadsOverTimeQuerySchema.parse(request.query)
      return getLeadsOverTime(actor, query)
    },
  )

  // ── GET /analytics/leads/by-source ───────────────────────────────────────
  fastify.get(
    '/leads/by-source',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = leadSourceQuerySchema.parse(request.query)
      return getLeadSourceBreakdown(actor, query)
    },
  )

  // ── GET /analytics/agents ─────────────────────────────────────────────────
  fastify.get(
    '/agents',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser

      // SALES_AGENT can only query their own performance
      const rawQuery = agentPerformanceQuerySchema.parse(request.query)
      if (actor.role === AGENT_ROLE) {
        rawQuery.agentId = actor.userId
      }

      return getAgentPerformance(actor, rawQuery)
    },
  )

  // ── GET /analytics/properties ─────────────────────────────────────────────
  fastify.get(
    '/properties',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = propertyPerformanceQuerySchema.parse(request.query)
      return getPropertyPerformance(actor, query)
    },
  )

  // ── GET /analytics/pipeline ───────────────────────────────────────────────
  fastify.get(
    '/pipeline',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const rawQuery = pipelineQuerySchema.parse(request.query)

      if (actor.role === AGENT_ROLE) {
        rawQuery.agentId = actor.userId
      }

      return getPipelineSummary(actor, rawQuery)
    },
  )

  // ── GET /analytics/financial ──────────────────────────────────────────────
  fastify.get(
    '/financial',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = financialSummaryQuerySchema.parse(request.query)
      return getFinancialSummary(actor, query)
    },
  )

  // ── Reports ───────────────────────────────────────────────────────────────

  fastify.get(
    '/reports/sales/by-agent',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = dateRangeSchema.parse(request.query)
      return getSalesByAgent(actor, query)
    },
  )

  fastify.get(
    '/reports/sales/by-source',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = dateRangeSchema.parse(request.query)
      return getSalesBySource(actor, query)
    },
  )
}
