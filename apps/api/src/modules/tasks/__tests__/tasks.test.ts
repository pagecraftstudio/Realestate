import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTask, listTasks, getTask, updateTask, deleteTask } from '../tasks.service.js'
import { prisma } from '../../../lib/prisma.js'
import type { AuthUser } from '../../../types/auth.js'

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    task: {
      create:   vi.fn(),
      findMany: vi.fn(),
      count:    vi.fn(),
      findFirst: vi.fn(),
      update:   vi.fn(),
      delete:   vi.fn(),
    },
  },
}))

const mockAdmin: AuthUser = {
  id: 'admin-1', userId: 'admin-1', supabaseUid: 'sb-test',
  organizationId: 'org-1',
  role: 'COMPANY_ADMIN',
}

const mockAgent: AuthUser = {
  id: 'agent-1', userId: 'agent-1', supabaseUid: 'sb-test',
  organizationId: 'org-1',
  role: 'SALES_AGENT',
}

const mockTask = {
  id: 'task-1',
  organizationId: 'org-1',
  assigneeId: 'agent-1',
  createdById: 'admin-1',
  title: 'Follow up with lead',
  priority: 'HIGH',
  status: 'TODO',
  dueAt: new Date(),
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assignee: { id: 'agent-1', userProfile: { firstName: 'Test', lastName: 'Agent' } },
  createdBy: { id: 'admin-1', userProfile: { firstName: 'Admin', lastName: 'User' } },
}

describe('Tasks Service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createTask', () => {
    it('creates task when assignee in org', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'agent-1' } as any)
      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any)

      const result = await createTask(mockAdmin, {
        assigneeId: 'agent-1',
        title: 'Follow up with lead',
        priority: 'HIGH',
      })

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
            createdById: 'admin-1',
            title: 'Follow up with lead',
          }),
        }),
      )
      expect(result.title).toBe('Follow up with lead')
    })

    it('throws if assignee not in org', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      await expect(createTask(mockAdmin, { assigneeId: 'x', title: 'T' })).rejects.toThrow('Assignee not found')
    })
  })

  describe('listTasks', () => {
    it('applies agent scope for SALES_AGENT', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([])
      vi.mocked(prisma.task.count).mockResolvedValue(0)

      await listTasks(mockAgent, { page: 1, limit: 20 })

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assigneeId: 'agent-1' }),
        }),
      )
    })

    it('no scope restriction for admin', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([])
      vi.mocked(prisma.task.count).mockResolvedValue(0)

      await listTasks(mockAdmin, { page: 1, limit: 20 })

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ assigneeId: expect.anything() }),
        }),
      )
    })
  })

  describe('updateTask', () => {
    it('sets completedAt when status → DONE', async () => {
      vi.mocked(prisma.task.findFirst).mockResolvedValue({ ...mockTask, status: 'TODO' } as any)
      vi.mocked(prisma.task.update).mockResolvedValue({ ...mockTask, status: 'DONE' } as any)

      await updateTask(mockAdmin, 'task-1', { status: 'DONE' })

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: expect.any(Date) }),
        }),
      )
    })

    it('agent cannot reassign task', async () => {
      vi.mocked(prisma.task.findFirst).mockResolvedValue({ ...mockTask, assigneeId: 'agent-1' } as any)
      await expect(updateTask(mockAgent, 'task-1', { assigneeId: 'other-agent' })).rejects.toThrow('cannot reassign')
    })
  })

  describe('deleteTask', () => {
    it('deletes task', async () => {
      vi.mocked(prisma.task.findFirst).mockResolvedValue({ ...mockTask, createdById: 'admin-1' } as any)
      vi.mocked(prisma.task.delete).mockResolvedValue(mockTask as any)

      const result = await deleteTask(mockAdmin, 'task-1')
      expect(result.deleted).toBe(true)
    })
  })
})
