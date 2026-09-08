import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  AssignLeadSchema,
  ListLeadsQuerySchema,
  AddActivitySchema,
  ConvertLeadSchema,
  SaveUnitSchema,
} from './leads.schema.js'
import {
  createLead,
  listLeads,
  getLead,
  updateLead,
  deleteLead,
  assignLead,
  addActivity,
  getTimeline,
  recalculateScore,
  convertToCustomer,
  saveUnit,
  unsaveUnit,
  getSavedUnits,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from './leads.service.js'
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

export async function leadsRoutes(fastify: FastifyInstance): Promise<void> {
  const preRead = [authenticate, requirePermission('leads', 'read')]
  const preCreate = [authenticate, requirePermission('leads', 'create')]
  const preUpdate = [authenticate, requirePermission('leads', 'update')]
  const preDelete = [authenticate, requirePermission('leads', 'delete')]

  // ─── GET /leads ───────────────────────────────────────────────────────────
  fastify.get('/', { preHandler: preRead }, async (request, reply) => {
    const query = ListLeadsQuerySchema.parse(request.query)
    return reply.send(await listLeads(auth(request), query))
  })

  // ─── POST /leads ──────────────────────────────────────────────────────────
  fastify.post('/', { preHandler: preCreate }, async (request, reply) => {
    try {
      const input = CreateLeadSchema.parse(request.body)
      return reply.status(201).send(await createLead(auth(request), input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── GET /leads/:id ───────────────────────────────────────────────────────
  fastify.get('/:id', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getLead(auth(request), id))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── PATCH /leads/:id ─────────────────────────────────────────────────────
  fastify.patch('/:id', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const input = UpdateLeadSchema.parse(request.body)
      return reply.send(await updateLead(auth(request), id, input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── DELETE /leads/:id ────────────────────────────────────────────────────
  fastify.delete('/:id', { preHandler: preDelete }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await deleteLead(auth(request), id))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── POST /leads/:id/assign ───────────────────────────────────────────────
  fastify.post('/:id/assign', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const input = AssignLeadSchema.parse(request.body)
      return reply.send(await assignLead(auth(request), id, input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── GET /leads/:id/timeline ──────────────────────────────────────────────
  fastify.get('/:id/timeline', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getTimeline(auth(request), id))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── POST /leads/:id/timeline ─────────────────────────────────────────────
  fastify.post('/:id/timeline', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const input = AddActivitySchema.parse(request.body)
      return reply.status(201).send(await addActivity(auth(request), id, input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── POST /leads/:id/score ────────────────────────────────────────────────
  fastify.post('/:id/score', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await recalculateScore(auth(request), id))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── POST /leads/:id/convert ──────────────────────────────────────────────
  fastify.post('/:id/convert', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const input = ConvertLeadSchema.parse(request.body)
      return reply.status(201).send(await convertToCustomer(auth(request), id, input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── GET /leads/:id/saved-units ───────────────────────────────────────────
  fastify.get('/:id/saved-units', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getSavedUnits(auth(request), id))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── POST /leads/:id/saved-units ──────────────────────────────────────────
  fastify.post('/:id/saved-units', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const input = SaveUnitSchema.parse(request.body)
      return reply.status(201).send(await saveUnit(auth(request), id, input))
    } catch (e) { return handleErrors(e, reply) }
  })

  // ─── DELETE /leads/:id/saved-units/:unitId ────────────────────────────────
  fastify.delete('/:id/saved-units/:unitId', { preHandler: preUpdate }, async (request, reply) => {
    const { id, unitId } = request.params as { id: string; unitId: string }
    try {
      return reply.send(await unsaveUnit(auth(request), id, unitId))
    } catch (e) { return handleErrors(e, reply) }
  })
}
