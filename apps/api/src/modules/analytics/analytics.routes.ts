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
        try {
          return getAgentDashboard(actor, query)
        } catch (err) {
          console.error('[analytics/getAgentDashboard] error:', err)
          throw err
        }
      }

      const query = dashboardQuerySchema.parse(request.query)
      try {
        return getDashboardKpis(actor, query)
      } catch (err) {
        console.error('[analytics/getDashboardKpis] error:', err)
        throw err
      }
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

      try {
        return getSalesFunnel(actor, query)
      } catch (err) {
        console.error('[analytics/getSalesFunnel] error:', err)
        throw err
      }
    },
  )

  // ── GET /analytics/revenue ────────────────────────────────────────────────
  fastify.get(
    '/revenue',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = revenueChartQuerySchema.parse(request.query)
      try {
        return getRevenueChart(actor, query)
      } catch (err) {
        console.error('[analytics/getRevenueChart] error:', err)
        throw err
      }
    },
  )

  // ── GET /analytics/leads/over-time ────────────────────────────────────────
  fastify.get(
    '/leads/over-time',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = leadsOverTimeQuerySchema.parse(request.query)
      try {
        return getLeadsOverTime(actor, query)
      } catch (err) {
        console.error('[analytics/getLeadsOverTime] error:', err)
        throw err
      }
    },
  )

  // ── GET /analytics/leads/by-source ───────────────────────────────────────
  fastify.get(
    '/leads/by-source',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = leadSourceQuerySchema.parse(request.query)
      try {
        return getLeadSourceBreakdown(actor, query)
      } catch (err) {
        console.error('[analytics/getLeadSourceBreakdown] error:', err)
        throw err
      }
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

      try {
        return getAgentPerformance(actor, rawQuery)
      } catch (err) {
        console.error('[analytics/getAgentPerformance] error:', err)
        throw err
      }
    },
  )

  // ── GET /analytics/properties ─────────────────────────────────────────────
  fastify.get(
    '/properties',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = propertyPerformanceQuerySchema.parse(request.query)
      try {
        return getPropertyPerformance(actor, query)
      } catch (err) {
        console.error('[analytics/getPropertyPerformance] error:', err)
        throw err
      }
    },
  )

  // ── GET /analytics/pipeline ───────────────────────────────────────────────
  fastify.get(
    '/pipeline',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      try {
        const actor = (request as typeof request & { authUser: AuthUser }).authUser
        const rawQuery = pipelineQuerySchema.parse(request.query)

        if (actor.role === AGENT_ROLE) {
          rawQuery.agentId = actor.userId
        }

        try {
          return getPipelineSummary(actor, rawQuery)
        } catch (err) {
          console.error('[analytics/getPipelineSummary] error:', err)
          throw err
        }
      } catch (err) {
        console.error('[analytics/pipeline] error:', err)
        throw err
      }
    },
  )

  // ── GET /analytics/financial ──────────────────────────────────────────────
  fastify.get(
    '/financial',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = financialSummaryQuerySchema.parse(request.query)
      try {
        return getFinancialSummary(actor, query)
      } catch (err) {
        console.error('[analytics/getFinancialSummary] error:', err)
        throw err
      }
    },
  )

  // ── Reports ───────────────────────────────────────────────────────────────

  fastify.get(
    '/reports/sales/by-agent',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = dateRangeSchema.parse(request.query)
      try {
        return getSalesByAgent(actor, query)
      } catch (err) {
        console.error('[analytics/getSalesByAgent] error:', err)
        throw err
      }
    },
  )

  fastify.get(
    '/reports/sales/by-source',
    { preHandler: [authenticate, requirePermission('analytics', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = dateRangeSchema.parse(request.query)
      try {
        return getSalesBySource(actor, query)
      } catch (err) {
        console.error('[analytics/getSalesBySource] error:', err)
        throw err
      }
    },
  )
}
