import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import { listAuditLogsQuerySchema } from './audit-logs.schema.js'
import * as svc from './audit-logs.service.js'

export async function auditLogsRoutes(fastify: FastifyInstance) {
  // ─── List ─────────────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('audit-logs', 'read')],
  }, async (req) => {
    const query = listAuditLogsQuerySchema.parse(req.query)
    return svc.listAuditLogs(req.authUser!, query)
  })

  // ─── Stats ────────────────────────────────────────────────────────────────
  fastify.get('/stats', {
    preHandler: [authenticate, requirePermission('audit-logs', 'read')],
  }, async (req) => {
    const { from, to } = req.query as { from?: string; to?: string }
    return svc.auditLogStats(
      req.authUser!,
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
    )
  })

  // ─── Single entry ─────────────────────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [authenticate, requirePermission('audit-logs', 'read')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getAuditLog(req.authUser!, id)
  })
}
