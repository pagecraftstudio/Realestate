import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  createCommissionRuleSchema,
  updateCommissionRuleSchema,
  calculateCommissionSchema,
  updateCommissionSchema,
  updateCommissionStatusSchema,
  listCommissionsQuerySchema,
  listCommissionRulesQuerySchema,
} from './commissions.schema.js'
import * as svc from './commissions.service.js'

export async function commissionsRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMISSION RULES
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/commission-rules', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req) => {
    const query = listCommissionRulesQuerySchema.parse(req.query)
    return svc.listCommissionRules(req.authUser!, query)
  })

  fastify.post('/commission-rules', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req, reply) => {
    const input = createCommissionRuleSchema.parse(req.body)
    const rule = await svc.createCommissionRule(req.authUser!, input)
    return reply.status(201).send(rule)
  })

  fastify.get('/commission-rules/:id', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getCommissionRule(req.authUser!, id)
  })

  fastify.patch('/commission-rules/:id', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateCommissionRuleSchema.parse(req.body)
    return svc.updateCommissionRule(req.authUser!, id, input)
  })

  fastify.delete('/commission-rules/:id', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await svc.deleteCommissionRule(req.authUser!, id)
    return reply.status(204).send()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Calculate + create commission for a deal
  fastify.post('/commissions/calculate', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req, reply) => {
    const input = calculateCommissionSchema.parse(req.body)
    const commission = await svc.calculateCommission(req.authUser!, input)
    return reply.status(201).send(commission)
  })

  fastify.get('/commissions', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req) => {
    const query = listCommissionsQuerySchema.parse(req.query)
    return svc.listCommissions(req.authUser!, query)
  })

  fastify.get('/commissions/:id', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getCommission(req.authUser!, id)
  })

  fastify.patch('/commissions/:id', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateCommissionSchema.parse(req.body)
    return svc.updateCommission(req.authUser!, id, input)
  })

  // Status transition: PENDING→APPROVED→PAYABLE→PAID / any→CANCELLED
  fastify.patch('/commissions/:id/status', {
    preHandler: [authenticate, requirePermission('commissions', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateCommissionStatusSchema.parse(req.body)
    return svc.updateCommissionStatus(req.authUser!, id, input)
  })
}
