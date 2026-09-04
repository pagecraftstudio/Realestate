import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  ListCustomersQuerySchema,
  SaveUnitSchema,
  AssignCustomerSchema,
} from './customers.schema.js'
import {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  assignCustomer,
  saveUnit,
  unsaveUnit,
  getSavedUnits,
  matchUnits,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from './customers.service.js'
import type { AuthUser } from '../../types/auth.js'

function auth(request: Parameters<typeof authenticate>[0]): AuthUser {
  return (request as typeof request & { authUser: AuthUser }).authUser
}

function handleErrors(e: unknown, reply: Parameters<typeof authenticate>[1]) {
  if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
  if (e instanceof ConflictError) return reply.status(409).send({ message: e.message })
  if (e instanceof ForbiddenError) return reply.status(403).send({ message: e.message })
  throw e
}

export async function customersRoutes(fastify: FastifyInstance): Promise<void> {
  const preRead = [authenticate, requirePermission('customers', 'read')]
  const preCreate = [authenticate, requirePermission('customers', 'create')]
  const preUpdate = [authenticate, requirePermission('customers', 'update')]
  const preDelete = [authenticate, requirePermission('customers', 'delete')]

  // ─── GET /customers ───────────────────────────────────────────────────────
  fastify.get('/', { preHandler: preRead }, async (request, reply) => {
    const query = ListCustomersQuerySchema.parse(request.query)
    return reply.send(await listCustomers(auth(request), query))
  })

  // ─── POST /customers ──────────────────────────────────────────────────────
  fastify.post('/', { preHandler: preCreate }, async (request, reply) => {
    try {
      const input = CreateCustomerSchema.parse(request.body)
      return reply.status(201).send(await createCustomer(auth(request), input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── GET /customers/:id ───────────────────────────────────────────────────
  fastify.get('/:id', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getCustomer(auth(request), id))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── PATCH /customers/:id ─────────────────────────────────────────────────
  fastify.patch('/:id', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const input = UpdateCustomerSchema.parse(request.body)
      return reply.send(await updateCustomer(auth(request), id, input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── DELETE /customers/:id ────────────────────────────────────────────────
  fastify.delete('/:id', { preHandler: preDelete }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await deleteCustomer(auth(request), id))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── POST /customers/:id/assign ───────────────────────────────────────────
  fastify.post('/:id/assign', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const input = AssignCustomerSchema.parse(request.body)
      return reply.send(await assignCustomer(auth(request), id, input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── GET /customers/:id/saved-units ──────────────────────────────────────
  fastify.get('/:id/saved-units', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getSavedUnits(auth(request), id))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── POST /customers/:id/saved-units ─────────────────────────────────────
  fastify.post('/:id/saved-units', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const input = SaveUnitSchema.parse(request.body)
      return reply.status(201).send(await saveUnit(auth(request), id, input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── DELETE /customers/:id/saved-units/:unitId ────────────────────────────
  fastify.delete('/:id/saved-units/:unitId', { preHandler: preUpdate }, async (request, reply) => {
    const { id, unitId } = request.params as { id: string; unitId: string }
    try {
      return reply.send(await unsaveUnit(auth(request), id, unitId))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── GET /customers/:id/match-units ──────────────────────────────────────
  fastify.get('/:id/match-units', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await matchUnits(auth(request), id))
    } catch (e) { return handleErrors(e, reply) }
  })
}
