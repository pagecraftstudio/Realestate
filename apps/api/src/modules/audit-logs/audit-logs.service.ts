import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { UserRole } from '@prisma/client'
import type { ListAuditLogsQuery } from './audit-logs.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]

function assertAdmin(actor: AuthUser) {
  if (!ADMIN_ROLES.includes(actor.role as UserRole)) {
    throw new ForbiddenError('Only admins can access audit logs')
  }
}

function auditSelect() {
  return {
    id:             true,
    organizationId: true,
    actorId:        true,
    action:         true,
    entityType:     true,
    entityId:       true,
    before:         true,
    after:          true,
    ipAddress:      true,
    userAgent:      true,
    createdAt:      true,
    actor: {
      select: {
        id:      true,
        email:   true,
        role:    true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
  } as const
}

// ─── Service ──────────────────────────────────────────────────────────────────

/** List audit logs — admin only, always org-scoped (SUPER_ADMIN sees own org) */
export async function listAuditLogs(actor: AuthUser, query: ListAuditLogsQuery) {
  assertAdmin(actor)

  const { page, limit, actorId, entityType, entityId, action, from, to } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...(actorId    && { actorId }),
    ...(entityType && { entityType }),
    ...(entityId   && { entityId }),
    ...(action     && { action }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: from }),
        ...(to   && { lte: to }),
      },
    }),
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select:  auditSelect(),
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ])

  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

/** Get single audit log entry */
export async function getAuditLog(actor: AuthUser, id: string) {
  assertAdmin(actor)

  const log = await prisma.auditLog.findFirst({
    where:  { id, organizationId: actor.organizationId },
    select: auditSelect(),
  })
  if (!log) throw new NotFoundError('Audit log not found')
  return log
}

/** Summary stats — count by action + entityType for a date range */
export async function auditLogStats(actor: AuthUser, from?: Date, to?: Date) {
  assertAdmin(actor)

  const where = {
    organizationId: actor.organizationId,
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: from }),
        ...(to   && { lte: to }),
      },
    }),
  }

  const [byAction, byEntity, total] = await Promise.all([
    prisma.auditLog.groupBy({
      by:     ['action'],
      where,
      _count: { _all: true },
      orderBy: { _count: { action: 'desc' } },
    }),
    prisma.auditLog.groupBy({
      by:     ['entityType'],
      where,
      _count: { _all: true },
      orderBy: { _count: { entityType: 'desc' } },
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    total,
    byAction: byAction.map((r) => ({ action: r.action, count: r._count._all })),
    byEntity: byEntity.map((r) => ({ entityType: r.entityType, count: r._count._all })),
  }
}
