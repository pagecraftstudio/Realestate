import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import { CreateFloorSchema, UpdateFloorSchema } from './floors.schema.js'
import {
  createFloor,
  listFloors,
  updateFloor,
  deleteFloor,
  NotFoundError,
  ConflictError,
} from './floors.service.js'
import type { AuthUser } from '../../types/auth.js'

function auth(request: Parameters<typeof authenticate>[0]): AuthUser {
  return (request as typeof request & { authUser: AuthUser }).authUser
}

export async function floorsRoutes(fastify: FastifyInstance): Promise<void> {
  const preRead = [authenticate, requirePermission('floors', 'read')]
  const preCreate = [authenticate, requirePermission('floors', 'create')]
  const preUpdate = [authenticate, requirePermission('floors', 'update')]
  const preDelete = [authenticate, requirePermission('floors', 'delete')]

  // GET /floors?buildingId=xxx
  fastify.get('/', { preHandler: preRead }, async (request, reply) => {
    const { buildingId } = request.query as { buildingId?: string }
    if (!buildingId) return reply.status(400).send({ message: 'buildingId is required' })
    try {
      return reply.send(await listFloors(auth(request), buildingId))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  fastify.post('/', { preHandler: preCreate }, async (request, reply) => {
    const input = CreateFloorSchema.parse(request.body)
    try {
      return reply.status(201).send(await createFloor(auth(request), input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
      throw e
    }
  })

  fastify.patch('/:id', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = UpdateFloorSchema.parse(request.body)
    try {
      return reply.send(await updateFloor(auth(request), id, input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  fastify.delete('/:id', { preHandler: preDelete }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await deleteFloor(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
      throw e
    }
  })
}
