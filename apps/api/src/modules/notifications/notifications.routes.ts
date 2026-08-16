import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  listNotificationsQuerySchema,
  markReadSchema,
  createNotificationSchema,
} from './notifications.schema.js'
import * as svc from './notifications.service.js'

export async function notificationsRoutes(fastify: FastifyInstance) {
  // ─── List (own) ──────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('notifications', 'read')],
  }, async (req) => {
    const query = listNotificationsQuerySchema.parse(req.query)
    return svc.listNotifications(req.authUser!, query)
  })

  // ─── Mark specific as read ───────────────────────────────────────────────
  fastify.patch('/read', {
    preHandler: [authenticate, requirePermission('notifications', 'update')],
  }, async (req) => {
    const input = markReadSchema.parse(req.body)
    return svc.markRead(req.authUser!, input)
  })

  // ─── Mark all as read ────────────────────────────────────────────────────
  fastify.patch('/read-all', {
    preHandler: [authenticate, requirePermission('notifications', 'update')],
  }, async (req) => {
    return svc.markAllRead(req.authUser!)
  })

  // ─── Delete one ──────────────────────────────────────────────────────────
  fastify.delete('/:id', {
    preHandler: [authenticate, requirePermission('notifications', 'delete')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await svc.deleteNotification(req.authUser!, id)
    return reply.status(204).send()
  })

  // ─── Create (admin/testing) ───────────────────────────────────────────────
  fastify.post('/', {
    preHandler: [authenticate, requirePermission('notifications', 'create')],
  }, async (req, reply) => {
    const input = createNotificationSchema.parse(req.body)
    const notif = await svc.createNotification(req.authUser!, input)
    return reply.status(201).send(notif)
  })
}
