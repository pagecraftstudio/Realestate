import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  createCampaignSchema,
  updateCampaignSchema,
  listCampaignsQuerySchema,
} from './campaigns.schema.js'
import * as svc from './campaigns.service.js'

export async function campaignsRoutes(fastify: FastifyInstance) {
  // ─── List ────────────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('campaigns', 'read')],
  }, async (req) => {
    const query = listCampaignsQuerySchema.parse(req.query)
    return svc.listCampaigns(req.authUser!, query)
  })

  // ─── Create ──────────────────────────────────────────────────────────────
  fastify.post('/', {
    preHandler: [authenticate, requirePermission('campaigns', 'create')],
  }, async (req, reply) => {
    const input = createCampaignSchema.parse(req.body)
    const campaign = await svc.createCampaign(req.authUser!, input)
    return reply.status(201).send(campaign)
  })

  // ─── Get one ─────────────────────────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [authenticate, requirePermission('campaigns', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getCampaign(req.authUser!, id)
  })

  // ─── Stats ───────────────────────────────────────────────────────────────
  fastify.get('/:id/stats', {
    preHandler: [authenticate, requirePermission('campaigns', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getCampaignStats(req.authUser!, id)
  })

  // ─── Update ──────────────────────────────────────────────────────────────
  fastify.patch('/:id', {
    preHandler: [authenticate, requirePermission('campaigns', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateCampaignSchema.parse(req.body)
    return svc.updateCampaign(req.authUser!, id, input)
  })

  // ─── Delete ──────────────────────────────────────────────────────────────
  fastify.delete('/:id', {
    preHandler: [authenticate, requirePermission('campaigns', 'delete')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.deleteCampaign(req.authUser!, id)
  })
}
