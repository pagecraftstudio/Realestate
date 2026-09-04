import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  createOfferSchema,
  updateOfferSchema,
  updateOfferStatusSchema,
  listOffersQuerySchema,
} from './offers.schema.js'
import * as svc from './offers.service.js'

export async function offersRoutes(fastify: FastifyInstance) {
  // ─── List ────────────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('offers', 'read')],
  }, async (req, reply) => {
    const query = listOffersQuerySchema.parse(req.query)
    return svc.listOffers(req.authUser!, query)
  })

  // ─── Create ──────────────────────────────────────────────────────────────
  fastify.post('/', {
    preHandler: [authenticate, requirePermission('offers', 'create')],
  }, async (req, reply) => {
    const input = createOfferSchema.parse(req.body)
    const offer = await svc.createOffer(req.authUser!, input)
    return reply.status(201).send(offer)
  })

  // ─── Get one ─────────────────────────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [authenticate, requirePermission('offers', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getOffer(req.authUser!, id)
  })

  // ─── Update ──────────────────────────────────────────────────────────────
  fastify.patch('/:id', {
    preHandler: [authenticate, requirePermission('offers', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateOfferSchema.parse(req.body)
    return svc.updateOffer(req.authUser!, id, input)
  })

  // ─── Status transition ───────────────────────────────────────────────────
  fastify.patch('/:id/status', {
    preHandler: [authenticate, requirePermission('offers', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateOfferStatusSchema.parse(req.body)
    return svc.updateOfferStatus(req.authUser!, id, input)
  })

  // ─── Delete ──────────────────────────────────────────────────────────────
  fastify.delete('/:id', {
    preHandler: [authenticate, requirePermission('offers', 'delete')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await svc.deleteOffer(req.authUser!, id)
    return reply.status(204).send()
  })
}
