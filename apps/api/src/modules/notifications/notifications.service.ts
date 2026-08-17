import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { NotificationType, UserRole } from '../../lib/enums.js'
import type {
  ListNotificationsQuery,
  MarkReadInput,
  CreateNotificationInput,
} from './notifications.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notifSelect() {
  return {
    id:             true,
    organizationId: true,
    userId:         true,
    type:           true,
    title:          true,
    body:           true,
    payload:        true,
    isRead:         true,
    readAt:         true,
    createdAt:      true,
  } as const
}

// ─── Service ──────────────────────────────────────────────────────────────────

/** Users see only their own notifications */
export async function listNotifications(actor: AuthUser, query: ListNotificationsQuery) {
  const { page, limit, isRead, type } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    userId: actor.id,          // always scoped to self
    ...(isRead !== undefined && { isRead }),
    ...(type && { type: type as NotificationType }),
  }

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: notifSelect(),
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { organizationId: actor.organizationId, userId: actor.id, isRead: false },
    }),
  ])

  return { items, total, page, limit, pages: Math.ceil(total / limit), unreadCount }
}

/** Mark one or many as read (only own notifications) */
export async function markRead(actor: AuthUser, input: MarkReadInput) {
  const now = new Date()
  const { count } = await prisma.notification.updateMany({
    where: {
      id:             { in: input.ids },
      organizationId: actor.organizationId,
      userId:         actor.id,   // cannot mark others' notifications
      isRead:         false,
    },
    data: { isRead: true, readAt: now },
  })
  return { updated: count }
}

/** Mark ALL unread as read */
export async function markAllRead(actor: AuthUser) {
  const { count } = await prisma.notification.updateMany({
    where: {
      organizationId: actor.organizationId,
      userId:         actor.id,
      isRead:         false,
    },
    data: { isRead: true, readAt: new Date() },
  })
  return { updated: count }
}

/** Delete a single notification (own only) */
export async function deleteNotification(actor: AuthUser, id: string) {
  const notif = await prisma.notification.findFirst({
    where: { id, organizationId: actor.organizationId, userId: actor.id },
  })
  if (!notif) throw new NotFoundError('Notification not found')
  await prisma.notification.delete({ where: { id } })
  return { deleted: true }
}

/**
 * Internal helper: create a notification for another user.
 * Called from other services (e.g. lead assignment, task creation).
 * Admin-only via API (for testing / manual dispatch).
 */
export async function createNotification(
  actor: AuthUser,
  input: CreateNotificationInput,
) {
  if (actor.role !== UserRole.COMPANY_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Only admins can create notifications directly')
  }

  // Verify target user in org
  const user = await prisma.user.findFirst({
    where: { id: input.userId, organizationId: actor.organizationId },
  })
  if (!user) throw new NotFoundError('Target user not found')

  return prisma.notification.create({
    data: {
      organizationId: actor.organizationId,
      userId:         input.userId,
      type:           input.type as NotificationType,
      title:          input.title,
      body:           input.body,
      payload:        (input.payload ?? {}) as any,
    },
    select: notifSelect(),
  })
}

/**
 * Internal (non-HTTP) helper for other services to emit notifications.
 * No actor required — called server-side.
 */
export async function emitNotification(params: {
  organizationId: string
  userId:         string
  type:           NotificationType
  title:          string
  body?:          string
  payload?:       Record<string, unknown>
}) {
  return prisma.notification.create({
    data: {
      organizationId: params.organizationId,
      userId:         params.userId,
      type:           params.type,
      title:          params.title,
      body:           params.body,
      payload:        (params.payload ?? {}) as any,
    },
    select: notifSelect(),
  })
}
