import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  CreateBuildingSchema,
  UpdateBuildingSchema,
  ListBuildingsQuerySchema,
} from './buildings.schema.js'
import {
  createBuilding,
  listBuildings,
  getBuilding,
  updateBuilding,
  deleteBuilding,
  NotFoundError,
} from './buildings.service.js'
import type { AuthUser } from '../../types/auth.js'

function auth(request: Parameters<typeof authenticate>[0]): AuthUser {
  return (request as typeof request & { authUser: AuthUser }).authUser
}

export async function buildingsRoutes(fastify: FastifyInstance): Promise<void> {
  const preRead = [authenticate, requirePermission('buildings', 'read')]
  const preCreate = [authenticate, requirePermission('buildings', 'create')]
  const preUpdate = [authenticate, requirePermission('buildings', 'update')]
  const preDelete = [authenticate, requirePermission('buildings', 'delete')]

  fastify.get('/', { preHandler: preRead }, async (request, reply) => {
    const query = ListBuildingsQuerySchema.parse(request.query)
    return reply.send(await listBuildings(auth(request), query))
  })

  fastify.post('/', { preHandler: preCreate }, async (request, reply) => {
    const input = CreateBuildingSchema.parse(request.body)
    const building = await createBuilding(auth(request), input)
    return reply.status(201).send(building)
  })

  fastify.get('/:id', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getBuilding(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  fastify.patch('/:id', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = UpdateBuildingSchema.parse(request.body)
    try {
      return reply.send(await updateBuilding(auth(request), id, input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  fastify.delete('/:id', { preHandler: preDelete }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await deleteBuilding(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if ((e as any).statusCode === 409) return reply.status(409).send({ message: (e as Error).message })
      throw e
    }
  })
}
