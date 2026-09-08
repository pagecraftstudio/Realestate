import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  createNotification,
} from '../notifications.service.js'
import { prisma } from '../../../lib/prisma.js'
import type { AuthUser } from '../../../types/auth.js'

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    notification: {
      findMany:    vi.fn(),
      count:       vi.fn(),
      updateMany:  vi.fn(),
      findFirst:   vi.fn(),
      delete:      vi.fn(),
      create:      vi.fn(),
    },
    user: { findFirst: vi.fn() },
  },
}))

const mockUser: AuthUser = {
  id: 'user-1', userId: 'user-1', supabaseUid: 'sb-test',
  organizationId: 'org-1',
  role: 'SALES_AGENT',
}

const mockAdmin: AuthUser = {
  id: 'admin-1', userId: 'admin-1', supabaseUid: 'sb-test',
  organizationId: 'org-1',
  role: 'COMPANY_ADMIN',
}

const mockNotif = {
  id: 'notif-1',
  organizationId: 'org-1',
  userId: 'user-1',
  type: 'TASK_DUE',
  title: 'Task due soon',
  body: null,
  payload: {},
  isRead: false,
  readAt: null,
  createdAt: new Date(),
}

describe('Notifications Service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listNotifications', () => {
    it('scopes to own user id', async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([])
      vi.mocked(prisma.notification.count).mockResolvedValue(0)

      await listNotifications(mockUser, { page: 1, limit: 20 })

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'user-1', userId: 'user-1', supabaseUid: 'sb-test' }),
        }),
      )
    })

    it('returns unreadCount', async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([mockNotif as any])
      vi.mocked(prisma.notification.count)
        .mockResolvedValueOnce(1)   // total
        .mockResolvedValueOnce(3)   // unreadCount
      const result = await listNotifications(mockUser, { page: 1, limit: 20 })
      expect(result.unreadCount).toBe(3)
    })
  })

  describe('markRead', () => {
    it('only marks own notifications', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 2 } as any)
      const result = await markRead(mockUser, { ids: ['notif-1', 'notif-2'] })
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'user-1', userId: 'user-1', supabaseUid: 'sb-test', isRead: false }),
        }),
      )
      expect(result.updated).toBe(2)
    })
  })

  describe('markAllRead', () => {
    it('marks all unread for user', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 } as any)
      const result = await markAllRead(mockUser)
      expect(result.updated).toBe(5)
    })
  })

  describe('deleteNotification', () => {
    it('deletes own notification', async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(mockNotif as any)
      vi.mocked(prisma.notification.delete).mockResolvedValue(mockNotif as any)
      const result = await deleteNotification(mockUser, 'notif-1')
      expect(result.deleted).toBe(true)
    })

    it('throws if not found', async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(null)
      await expect(deleteNotification(mockUser, 'bad-id')).rejects.toThrow('not found')
    })
  })

  describe('createNotification', () => {
    it('non-admin cannot create', async () => {
      await expect(
        createNotification(mockUser, { userId: 'u', type: 'TASK_DUE', title: 'T' }),
      ).rejects.toThrow('Only admins')
    })

    it('admin creates notification', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'user-1' } as any)
      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotif as any)
      const result = await createNotification(mockAdmin, {
        userId: 'user-1',
        type: 'TASK_DUE',
        title: 'Task due soon',
      })
      expect(result.title).toBe('Task due soon')
    })
  })
})
