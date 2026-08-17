import type { FastifyRequest } from 'fastify'
import type { AuthUser } from '../types/auth.js'

export function getAuthUser(request: FastifyRequest): AuthUser {
  const user = request.authUser
  if (!user) throw new Error('authenticate middleware not applied — no authUser on request')
  return user
}
