import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  InviteUserSchema,
  UpdateUserSchema,
  UpdateMyProfileSchema,
  ListUsersQuerySchema,
} from './users.schema.js'
import {
  listUsers,
  getUser,
  inviteUser,
  updateUser,
  setUserStatus,
  updateMyProfile,
  adminResetPassword,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from './users.service.js'
import type { AuthUser } from '../../types/auth.js'
import { z } from 'zod'
import { UserStatus } from '@prisma/client'

function auth(request: Parameters<typeof authenticate>[0]): AuthUser {
  return (request as typeof request & { authUser: AuthUser }).authUser
}

export async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  const preAuth = [authenticate, requirePermission('users', 'read')]
  const preManage = [authenticate, requirePermission('users', 'manage')]

  // ─── GET /users ─────────────────────────────────────────────────────────
  fastify.get('/', { preHandler: preAuth }, async (request, reply) => {
    const query = ListUsersQuerySchema.parse(request.query)
    const result = await listUsers(auth(request), query)
    return reply.send(result)
  })

  // ─── GET /users/me ───────────────────────────────────────────────────────
  // (profile update for self — available to any authenticated user)
  fastify.get(
    '/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = await getUser(auth(request), auth(request).userId)
      return reply.send(user)
    },
  )

  // ─── PATCH /users/me ─────────────────────────────────────────────────────
  fastify.patch(
    '/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const input = UpdateMyProfileSchema.parse(request.body)
      const updated = await updateMyProfile(auth(request), input)
      return reply.send(updated)
    },
  )

  // ─── GET /users/:id ──────────────────────────────────────────────────────
  fastify.get('/:id', { preHandler: preAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const user = await getUser(auth(request), id)
      return reply.send(user)
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message })
      if (err instanceof ForbiddenError) return reply.status(403).send({ error: err.message })
      throw err
    }
  })

  // ─── POST /users/invite ──────────────────────────────────────────────────
  fastify.post('/invite', { preHandler: preManage }, async (request, reply) => {
    const input = InviteUserSchema.parse(request.body)
    try {
      const user = await inviteUser(auth(request), input)
      return reply.status(201).send(user)
    } catch (err) {
      if (err instanceof ConflictError) return reply.status(409).send({ error: err.message })
      if (err instanceof ForbiddenError) return reply.status(403).send({ error: err.message })
      if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message })
      throw err
    }
  })

  // ─── PATCH /users/:id ────────────────────────────────────────────────────
  fastify.patch('/:id', { preHandler: preManage }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const input = UpdateUserSchema.parse(request.body)
    try {
      const user = await updateUser(auth(request), id, input)
      return reply.send(user)
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message })
      if (err instanceof ForbiddenError) return reply.status(403).send({ error: err.message })
      throw err
    }
  })

  // ─── POST /users/:id/deactivate ──────────────────────────────────────────
  fastify.post(
    '/:id/deactivate',
    { preHandler: preManage },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      try {
        const user = await setUserStatus(auth(request), id, UserStatus.INACTIVE)
        return reply.send(user)
      } catch (err) {
        if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message })
        if (err instanceof ForbiddenError) return reply.status(403).send({ error: err.message })
        throw err
      }
    },
  )

  // ─── POST /users/:id/reactivate ──────────────────────────────────────────
  fastify.post(
    '/:id/reactivate',
    { preHandler: preManage },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      try {
        const user = await setUserStatus(auth(request), id, UserStatus.ACTIVE)
        return reply.send(user)
      } catch (err) {
        if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message })
        if (err instanceof ForbiddenError) return reply.status(403).send({ error: err.message })
        throw err
      }
    },
  )

  // ─── POST /users/:id/reset-password ──────────────────────────────────────
  fastify.post(
    '/:id/reset-password',
    { preHandler: preManage },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { newPassword } = z
        .object({
          newPassword: z
            .string()
            .min(8)
            .max(72)
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Need upper, lower, number'),
        })
        .parse(request.body)
      try {
        await adminResetPassword(auth(request), id, newPassword)
        return reply.send({ message: 'Password reset. User must log in with new password.' })
      } catch (err) {
        if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message })
        if (err instanceof ForbiddenError) return reply.status(403).send({ error: err.message })
        throw err
      }
    },
  )
}
