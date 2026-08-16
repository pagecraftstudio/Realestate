/**
 * request-auth.ts
 *
 * Tiny helper to extract AuthUser from a Fastify request.
 * Works whether the module uses the old `auth(req)` pattern (leads, customers…)
 * or the new `req.authUser!` pattern (tasks, notifications, comms, docs…).
 *
 * Usage:
 *   import { getAuthUser } from '../../lib/request-auth.js'
 *   const actor = getAuthUser(request)
 */
import type { FastifyRequest } from 'fastify'
import type { AuthUser } from '../types/auth.js'

export function getAuthUser(request: FastifyRequest): AuthUser {
  const user = request.authUser ?? request.user
  if (!user) throw new Error('authenticate middleware not applied — no authUser on request')
  return user
}
