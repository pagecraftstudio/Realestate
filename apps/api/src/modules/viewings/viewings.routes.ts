import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  CreateViewingSchema,
  UpdateViewingSchema,
  CompleteViewingSchema,
  ListViewingsQuerySchema,
} from './viewings.schema.js'
import {
  createViewing,
  listViewings,
  getViewing,
  updateViewing,
  completeViewing,
  cancelViewing,
  deleteViewing,
  upcomingViewings,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from './viewings.service.js'
import type { AuthUser } from '../../types/auth.js'

function auth(request: Parameters<typeof authenticate>[0]): AuthUser {
  return (request as typeof request & { authUser: AuthUser }).authUser
}

export async function viewingsRoutes(fastify: FastifyInstance): Promise<void> {
  const preRead   = [authenticate, requirePermission('viewings', 'read')]
  const preCreate = [authenticate, requirePermission('viewings', 'create')]
  const preUpdate = [authenticate, requirePermission('viewings', 'update')]
  const preDelete = [authenticate, requirePermission('viewings', 'delete')]

  // ─── GET /viewings ──────────────────────────────────────────────────────
  fastify.get('/', { preHandler: preRead }, async (request, reply) => {
    const query = ListViewingsQuerySchema.parse(request.query)
    return reply.send(await listViewings(auth(request), query))
  })

  // ─── GET /viewings/upcoming ─────────────────────────────────────────────
  fastify.get('/upcoming', { preHandler: preRead }, async (request, reply) => {
    const { limit } = (request.query as { limit?: string })
    return reply.send(await upcomingViewings(auth(request), limit ? Number(limit) : 10))
  })

  // ─── POST /viewings ─────────────────────────────────────────────────────
  fastify.post('/', { preHandler: preCreate }, async (request, reply) => {
    const input = CreateViewingSchema.parse(request.body)
    try {
      return reply.status(201).send(await createViewing(auth(request), input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  // ─── GET /viewings/:id ──────────────────────────────────────────────────
  fastify.get('/:id', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getViewing(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  // ─── PATCH /viewings/:id ────────────────────────────────────────────────
  fastify.patch('/:id', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = UpdateViewingSchema.parse(request.body)
    try {
      return reply.send(await updateViewing(auth(request), id, input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
      if (e instanceof ForbiddenError) return reply.status(403).send({ message: e.message })
      throw e
    }
  })

  // ─── POST /viewings/:id/complete ────────────────────────────────────────
  fastify.post('/:id/complete', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = CompleteViewingSchema.parse(request.body)
    try {
      return reply.send(await completeViewing(auth(request), id, input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
      throw e
    }
  })

  // ─── POST /viewings/:id/cancel ──────────────────────────────────────────
  fastify.post('/:id/cancel', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await cancelViewing(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
      throw e
    }
  })

  // ─── DELETE /viewings/:id ───────────────────────────────────────────────
  fastify.delete('/:id', { preHandler: preDelete }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await deleteViewing(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
      throw e
    }
  })
}
