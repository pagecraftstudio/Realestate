import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  runMatchSchema,
  shortlistUnitSchema,
  listMatchRequestsQuerySchema,
} from './property-matching.schema.js'
import * as svc from './property-matching.service.js'

export async function propertyMatchingRoutes(fastify: FastifyInstance) {
  // ─── Run a new match ─────────────────────────────────────────────────────
  fastify.post('/run', {
    preHandler: [authenticate, requirePermission('units', 'read')],
  }, async (req, reply) => {
    const input = runMatchSchema.parse(req.body)
    const result = await svc.runMatch(req.authUser!, input)
    return reply.status(201).send(result)
  })

  // ─── List match requests ─────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('units', 'read')],
  }, async (req) => {
    const query = listMatchRequestsQuerySchema.parse(req.query)
    return svc.listMatchRequests(req.authUser!, query)
  })

  // ─── Get one ─────────────────────────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [authenticate, requirePermission('units', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getMatchRequest(req.authUser!, id)
  })

  // ─── Shortlist a unit in a match request ─────────────────────────────────
  fastify.patch('/:id/shortlist', {
    preHandler: [authenticate, requirePermission('units', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = shortlistUnitSchema.parse(req.body)
    return svc.shortlistUnit(req.authUser!, id, input)
  })
}
