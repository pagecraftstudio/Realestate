import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ListProjectsQuerySchema,
} from './projects.schema.js'
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
  NotFoundError,
} from './projects.service.js'
import type { AuthUser } from '../../types/auth.js'

function auth(request: Parameters<typeof authenticate>[0]): AuthUser {
  return (request as typeof request & { authUser: AuthUser }).authUser
}

export async function projectsRoutes(fastify: FastifyInstance): Promise<void> {
  const preRead = [authenticate, requirePermission('projects', 'read')]
  const preCreate = [authenticate, requirePermission('projects', 'create')]
  const preUpdate = [authenticate, requirePermission('projects', 'update')]
  const preDelete = [authenticate, requirePermission('projects', 'delete')]

  // ─── GET /projects ───────────────────────────────────────────────────────
  fastify.get('/', { preHandler: preRead }, async (request, reply) => {
    const query = ListProjectsQuerySchema.parse(request.query)
    return reply.send(await listProjects(auth(request), query))
  })

  // ─── POST /projects ──────────────────────────────────────────────────────
  fastify.post('/', { preHandler: preCreate }, async (request, reply) => {
    const input = CreateProjectSchema.parse(request.body)
    const project = await createProject(auth(request), input)
    return reply.status(201).send(project)
  })

  // ─── GET /projects/:id ───────────────────────────────────────────────────
  fastify.get('/:id', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getProject(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  // ─── GET /projects/:id/stats ─────────────────────────────────────────────
  fastify.get('/:id/stats', { preHandler: preRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await getProjectStats(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  // ─── PATCH /projects/:id ─────────────────────────────────────────────────
  fastify.patch('/:id', { preHandler: preUpdate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = UpdateProjectSchema.parse(request.body)
    try {
      return reply.send(await updateProject(auth(request), id, input))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      throw e
    }
  })

  // ─── DELETE /projects/:id ────────────────────────────────────────────────
  fastify.delete('/:id', { preHandler: preDelete }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send(await deleteProject(auth(request), id))
    } catch (e) {
      if (e instanceof NotFoundError) return reply.status(404).send({ message: e.message })
      if ((e as any).statusCode === 409) return reply.status(409).send({ message: (e as Error).message })
      throw e
    }
  })
}
