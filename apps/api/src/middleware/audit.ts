import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import type { AuthUser } from '../types/auth.js'
import type { AuditAction } from '../lib/enums.js'

interface AuditOptions {
  action: AuditAction
  entityType: string
  /** If omitted, reads `id` from reply payload */
  getEntityId?: (request: FastifyRequest, payload: unknown) => string | undefined
}

/**
 * Factory: returns an onSend hook that writes an audit log entry.
 * Attach via route `onSend` or in plugin.
 */
export function auditHook(opts: AuditOptions) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
    payload: unknown,
  ): Promise<void> {
    // Only audit successful mutating responses
    if (reply.statusCode >= 400) return

    const authUser = (request as FastifyRequest & { authUser?: AuthUser }).authUser
    if (!authUser) return

    let entityId: string | undefined
    try {
      if (opts.getEntityId) {
        entityId = opts.getEntityId(request, payload)
      } else {
        const parsed =
          typeof payload === 'string' ? JSON.parse(payload) : payload
        entityId = parsed?.id ?? (request.params as Record<string, string>)?.['id']
      }
    } catch {
      entityId = undefined
    }

    // Fire-and-forget — don't block response
    prisma.auditLog
      .create({
        data: {
          organizationId: authUser.organizationId,
          actorId: authUser.userId,
          action: opts.action,
          entityType: opts.entityType,
          entityId: entityId ?? 'unknown',
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      })
      .catch((err: unknown) => {
        console.error('[audit] failed to write log:', err)
      })
  }
}
