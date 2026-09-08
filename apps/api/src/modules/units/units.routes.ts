import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  CreateUnitSchema,
  UpdateUnitSchema,
  ListUnitsQuerySchema,
  BulkUpdateStatusSchema,
} from './units.schema.js'
import {
  createUnit,
  listUnits,
  getUnit,
  updateUnit,
  deleteUnit,
  bulkUpdateStatus,
  checkAvailability,
  NotFoundError,
  ConflictError,
} from './units.service.js'
import type { AuthUser } from '../../types/auth.js'

function auth(request: Parameters<typeof authenticate>[0]): AuthUser {
  return (request as typeof request & { authUser: AuthUser }).authUser
}

export async function unitsRoutes(fastify: FastifyInstance): Promise<void> {
  const preRead = [authenticate, requirePermission('units', 'read')]
  const preCreate = [authenticate, requirePermission('units', 'create')]
  const preUpdate = [authenticate, requirePermission('units', 'update')]
  const preDelete = [authenticate, requirePermission('units', 'delete')]

  // ─── GET /units ──────────────────────────────────────────────────────────
  fastify.get('/', { preHandler: preRead }, async (request, reply) => {
    const query = ListUnitsQuerySchema.parse(request.query)
    return reply.send(await listUnits(auth(request), query))
  })

  // ─── POST /units ─────────────────────────────────────────────────────────
  fastify.post('/', { preHandler: preCreate }, async (request, reply) => {
    const input = CreateUnitSchema.parse(request.body)
    try {
      return reply.status(201).send(await createUnit(auth(request), input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  // ─── POST /units/bulk-status ──────────────────────────────────────────────
  fastify.post('/bulk-status', { preHandler: preUpdate }, async (request, reply) => {
    const input = BulkUpdateStatusSchema.parse(request.body)
    try {
      return reply.send(await bulkUpdateStatus(auth(request), input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
      throw e
    }
  })

  // ─── GET /units/:id ───────────────────────────────────────────────────────
  fastify.get('/:id', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getUnit(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  // ─── GET /units/:id/availability ──────────────────────────────────────────
  fastify.get('/:id/availability', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await checkAvailability(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  // ─── PATCH /units/:id ─────────────────────────────────────────────────────
  fastify.patch('/:id', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = UpdateUnitSchema.parse(request.body)
    try {
      return reply.send(await updateUnit(auth(request), id, input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
      throw e
    }
  })

  // ─── DELETE /units/:id ────────────────────────────────────────────────────
  fastify.delete('/:id', { preHandler: preDelete }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await deleteUnit(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
      throw e
    }
  })
}
