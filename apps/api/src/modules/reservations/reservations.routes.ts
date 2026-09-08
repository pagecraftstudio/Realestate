import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  createReservationSchema,
  updateReservationSchema,
  cancelReservationSchema,
  listReservationsQuerySchema,
} from './reservations.schema.js'
import * as svc from './reservations.service.js'

export async function reservationsRoutes(fastify: FastifyInstance) {
  // ─── List ────────────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('reservations', 'read')],
  }, async (req) => {
    const query = listReservationsQuerySchema.parse(req.query)
    return svc.listReservations(req.authUser!, query)
  })

  // ─── Create (unit lock) ──────────────────────────────────────────────────
  fastify.post('/', {
    preHandler: [authenticate, requirePermission('reservations', 'create')],
  }, async (req, reply) => {
    const input = createReservationSchema.parse(req.body)
    const reservation = await svc.createReservation(req.authUser!, input)
    return reply.status(201).send(reservation)
  })

  // ─── Get one ─────────────────────────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [authenticate, requirePermission('reservations', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getReservation(req.authUser!, id)
  })

  // ─── Update ──────────────────────────────────────────────────────────────
  fastify.patch('/:id', {
    preHandler: [authenticate, requirePermission('reservations', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateReservationSchema.parse(req.body)
    return svc.updateReservation(req.authUser!, id, input)
  })

  // ─── Cancel ──────────────────────────────────────────────────────────────
  fastify.post('/:id/cancel', {
    preHandler: [authenticate, requirePermission('reservations', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = cancelReservationSchema.parse(req.body)
    return svc.cancelReservation(req.authUser!, id, input)
  })

  // ─── Expire (manual trigger / admin) ─────────────────────────────────────
  fastify.post('/:id/expire', {
    preHandler: [authenticate, requirePermission('reservations', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.expireReservation(req.authUser!, id)
  })
}
