import type { FastifyRequest, FastifyReply } from 'fastify'
import { can, type Resource, type Action } from '../lib/rbac.js'
import type { AuthUser } from '../types/auth.js'

/**
 * RBAC preHandler — checks after authenticate().
 * Reads from request.authUser (preferred) or request.user (compat alias).
 */
export function requirePermission(resource: Resource, action: Action) {
  return async function rbacCheck(
    request: FastifyRequest,
    reply:   FastifyReply,
  ): Promise<void> {
    const authUser = request.authUser ?? request.user
    if (!authUser) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    if (!can(authUser.role, resource, action)) {
      return reply.status(403).send({
        error: `Forbidden: role ${authUser.role} cannot ${action} ${resource}`,
      })
    }
  }
}
