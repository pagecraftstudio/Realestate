import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  createDealSchema,
  updateDealSchema,
  updateDealStatusSchema,
  updatePipelineStageSchema,
  listDealsQuerySchema,
} from './deals.schema.js'
import * as svc from './deals.service.js'

export async function dealsRoutes(fastify: FastifyInstance) {
  // ─── List ────────────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('deals', 'read')],
  }, async (req) => {
    const query = listDealsQuerySchema.parse(req.query)
    return svc.listDeals(req.authUser!, query)
  })

  // ─── Create ──────────────────────────────────────────────────────────────
  fastify.post('/', {
    preHandler: [authenticate, requirePermission('deals', 'create')],
  }, async (req, reply) => {
    const input = createDealSchema.parse(req.body)
    const deal = await svc.createDeal(req.authUser!, input)
    return reply.status(201).send(deal)
  })

  // ─── Get one ─────────────────────────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [authenticate, requirePermission('deals', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getDeal(req.authUser!, id)
  })

  // ─── Update ──────────────────────────────────────────────────────────────
  fastify.patch('/:id', {
    preHandler: [authenticate, requirePermission('deals', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateDealSchema.parse(req.body)
    return svc.updateDeal(req.authUser!, id, input)
  })

  // ─── Status transition ───────────────────────────────────────────────────
  fastify.patch('/:id/status', {
    preHandler: [authenticate, requirePermission('deals', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateDealStatusSchema.parse(req.body)
    return svc.updateDealStatus(req.authUser!, id, input)
  })

  // ─── Pipeline stage ──────────────────────────────────────────────────────
  fastify.patch('/:id/pipeline', {
    preHandler: [authenticate, requirePermission('deals', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updatePipelineStageSchema.parse(req.body)
    return svc.updatePipelineStage(req.authUser!, id, input)
  })
}
