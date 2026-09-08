import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  createContractSchema,
  updateContractSchema,
  updateContractStatusSchema,
  listContractsQuerySchema,
} from './contracts.schema.js'
import * as svc from './contracts.service.js'

export async function contractsRoutes(fastify: FastifyInstance) {
  // ─── List ────────────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('contracts', 'read')],
  }, async (req) => {
    const query = listContractsQuerySchema.parse(req.query)
    return svc.listContracts(req.authUser!, query)
  })

  // ─── Create ──────────────────────────────────────────────────────────────
  fastify.post('/', {
    preHandler: [authenticate, requirePermission('contracts', 'create')],
  }, async (req, reply) => {
    const input = createContractSchema.parse(req.body)
    const contract = await svc.createContract(req.authUser!, input)
    return reply.status(201).send(contract)
  })

  // ─── Get one ─────────────────────────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [authenticate, requirePermission('contracts', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getContract(req.authUser!, id)
  })

  // ─── Update ──────────────────────────────────────────────────────────────
  fastify.patch('/:id', {
    preHandler: [authenticate, requirePermission('contracts', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateContractSchema.parse(req.body)
    return svc.updateContract(req.authUser!, id, input)
  })

  // ─── Status transition ───────────────────────────────────────────────────
  fastify.patch('/:id/status', {
    preHandler: [authenticate, requirePermission('contracts', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateContractStatusSchema.parse(req.body)
    return svc.updateContractStatus(req.authUser!, id, input)
  })

  // ─── Delete ──────────────────────────────────────────────────────────────
  fastify.delete('/:id', {
    preHandler: [authenticate, requirePermission('contracts', 'delete')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.deleteContract(req.authUser!, id)
  })
}
