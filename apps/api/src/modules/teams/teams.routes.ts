import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  AddTeamMemberSchema,
  ListTeamsQuerySchema,
} from './teams.schema.js'
import {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  setTeamLead,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from './teams.service.js'
import type { AuthUser } from '../../types/auth.js'

function auth(r: Parameters<typeof authenticate>[0]): AuthUser {
  return (r as typeof r & { authUser: AuthUser }).authUser
}

function handleErr(err: unknown, reply: Parameters<typeof authenticate>[1]) {
  if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message })
  if (err instanceof ConflictError) return reply.status(409).send({ error: err.message })
  if (err instanceof ForbiddenError) return reply.status(403).send({ error: err.message })
  throw err
}

export async function teamsRoutes(fastify: FastifyInstance): Promise<void> {
  const preRead = [authenticate, requirePermission('teams', 'read')]
  const preManage = [authenticate, requirePermission('teams', 'manage')]

  // GET /teams
  fastify.get('/', { preHandler: preRead }, async (req, reply) => {
    const query = ListTeamsQuerySchema.parse(req.query)
    return reply.send(await listTeams(auth(req), query))
  })

  // GET /teams/:id
  fastify.get('/:id', { preHandler: preRead }, async (req, reply) => {
    try {
      return reply.send(await getTeam(auth(req), (req.params as { id: string }).id))
    } catch (err) { return handleErr(err, reply) }
  })

  // POST /teams
  fastify.post('/', { preHandler: preManage }, async (req, reply) => {
    const input = CreateTeamSchema.parse(req.body)
    try {
      return reply.status(201).send(await createTeam(auth(req), input))
    } catch (err) { return handleErr(err, reply) }
  })

  // PATCH /teams/:id
  fastify.patch('/:id', { preHandler: preManage }, async (req, reply) => {
    const input = UpdateTeamSchema.parse(req.body)
    try {
      return reply.send(await updateTeam(auth(req), (req.params as { id: string }).id, input))
    } catch (err) { return handleErr(err, reply) }
  })

  // DELETE /teams/:id
  fastify.delete('/:id', { preHandler: preManage }, async (req, reply) => {
    try {
      await deleteTeam(auth(req), (req.params as { id: string }).id)
      return reply.status(204).send()
    } catch (err) { return handleErr(err, reply) }
  })

  // POST /teams/:id/members
  fastify.post('/:id/members', { preHandler: preManage }, async (req, reply) => {
    const input = AddTeamMemberSchema.parse(req.body)
    try {
      return reply.status(201).send(
        await addTeamMember(auth(req), (req.params as { id: string }).id, input),
      )
    } catch (err) { return handleErr(err, reply) }
  })

  // DELETE /teams/:id/members/:userId
  fastify.delete(
    '/:id/members/:userId',
    { preHandler: preManage },
    async (req, reply) => {
      const { id, userId } = req.params as { id: string; userId: string }
      try {
        await removeTeamMember(auth(req), id, userId)
        return reply.status(204).send()
      } catch (err) { return handleErr(err, reply) }
    },
  )

  // POST /teams/:id/lead/:userId
  fastify.post(
    '/:id/lead/:userId',
    { preHandler: preManage },
    async (req, reply) => {
      const { id, userId } = req.params as { id: string; userId: string }
      try {
        return reply.send(await setTeamLead(auth(req), id, userId))
      } catch (err) { return handleErr(err, reply) }
    },
  )
}
