import type { FastifyRequest, FastifyReply } from 'fastify'
import { can, type Resource, type Action } from '../lib/rbac.js'

export function requirePermission(resource: Resource, action: Action) {
  return async function rbacCheck(
    request: FastifyRequest,
    reply:   FastifyReply,
  ): Promise<void> {
    const authUser = request.authUser
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
