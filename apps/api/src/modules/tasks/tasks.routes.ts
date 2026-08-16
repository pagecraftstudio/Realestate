import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
} from './tasks.schema.js'
import * as svc from './tasks.service.js'

export async function tasksRoutes(fastify: FastifyInstance) {
  // ─── List ────────────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('tasks', 'read')],
  }, async (req) => {
    const query = listTasksQuerySchema.parse(req.query)
    return svc.listTasks(req.authUser!, query)
  })

  // ─── Create ──────────────────────────────────────────────────────────────
  fastify.post('/', {
    preHandler: [authenticate, requirePermission('tasks', 'create')],
  }, async (req, reply) => {
    const input = createTaskSchema.parse(req.body)
    const task = await svc.createTask(req.authUser!, input)
    return reply.status(201).send(task)
  })

  // ─── Get one ─────────────────────────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [authenticate, requirePermission('tasks', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getTask(req.authUser!, id)
  })

  // ─── Update ──────────────────────────────────────────────────────────────
  fastify.patch('/:id', {
    preHandler: [authenticate, requirePermission('tasks', 'update')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateTaskSchema.parse(req.body)
    return svc.updateTask(req.authUser!, id, input)
  })

  // ─── Delete ──────────────────────────────────────────────────────────────
  fastify.delete('/:id', {
    preHandler: [authenticate, requirePermission('tasks', 'delete')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await svc.deleteTask(req.authUser!, id)
    return reply.status(204).send()
  })
}
