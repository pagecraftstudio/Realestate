import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRole } from '../../lib/enums.js'
import type { AuthUser } from '../../../types/auth.js'

// ─── Mock prisma ──────────────────────────────────────────────────────────────

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    auditLog: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      count:     vi.fn(),
      groupBy:   vi.fn(),
    },
  },
}))

import { prisma } from '../../../lib/prisma.js'
import * as svc from '../audit-logs.service.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeActor = (role: UserRole = UserRole.COMPANY_ADMIN): AuthUser => ({
  id:             'actor-1',
  userId:         'actor-1',
  organizationId: 'org-1',
  role,
  supabaseUid:    'sb-test',
})

const sampleLog = {
  id:             'log-1',
  organizationId: 'org-1',
  actorId:        'actor-1',
  action:         'CREATE',
  entityType:     'leads',
  entityId:       'lead-1',
  before:         null,
  after:          null,
  ipAddress:      '127.0.0.1',
  userAgent:      'jest',
  createdAt:      new Date('2026-01-01T10:00:00Z'),
  actor: {
    id:      'actor-1',
    email:   'admin@test.com',
    role:    UserRole.COMPANY_ADMIN,
    profile: { firstName: 'Admin', lastName: 'User' },
  },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('audit-logs service', () => {
  beforeEach(() => vi.clearAllMocks())

  // ─── listAuditLogs ────────────────────────────────────────────────────────

  describe('listAuditLogs', () => {
    it('returns paginated logs for admin', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([sampleLog] as any)
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1)

      const result = await svc.listAuditLogs(makeActor(), { page: 1, limit: 20 })

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.pages).toBe(1)
    })

    it('passes filters to prisma where clause', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0)

      await svc.listAuditLogs(makeActor(), {
        page:       1,
        limit:      10,
        entityType: 'leads',
        action:     'CREATE' as any,
      })

      const call = vi.mocked(prisma.auditLog.findMany).mock.calls[0]![0] as any
      expect(call.where.entityType).toBe('leads')
      expect(call.where.action).toBe('CREATE')
      expect(call.where.organizationId).toBe('org-1')
    })

    it('rejects SALES_AGENT', async () => {
      await expect(
        svc.listAuditLogs(makeActor(UserRole.SALES_AGENT), { page: 1, limit: 20 }),
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects VIEWER', async () => {
      await expect(
        svc.listAuditLogs(makeActor(UserRole.VIEWER), { page: 1, limit: 20 }),
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('allows SUPER_ADMIN', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0)

      await expect(
        svc.listAuditLogs(makeActor(UserRole.SUPER_ADMIN), { page: 1, limit: 20 }),
      ).resolves.toBeDefined()
    })

    it('applies date range filter', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0)

      const from = new Date('2026-01-01')
      const to   = new Date('2026-01-31')

      await svc.listAuditLogs(makeActor(), { page: 1, limit: 20, from, to })

      const call = vi.mocked(prisma.auditLog.findMany).mock.calls[0]![0] as any
      expect(call.where.createdAt.gte).toEqual(from)
      expect(call.where.createdAt.lte).toEqual(to)
    })

    it('paginates correctly', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.auditLog.count).mockResolvedValue(55)

      const result = await svc.listAuditLogs(makeActor(), { page: 2, limit: 20 })

      const call = vi.mocked(prisma.auditLog.findMany).mock.calls[0]![0] as any
      expect(call.skip).toBe(20)
      expect(call.take).toBe(20)
      expect(result.pages).toBe(3)
    })
  })

  // ─── getAuditLog ──────────────────────────────────────────────────────────

  describe('getAuditLog', () => {
    it('returns log by id', async () => {
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(sampleLog as any)

      const result = await svc.getAuditLog(makeActor(), 'log-1')
      expect(result.id).toBe('log-1')
    })

    it('throws 404 when not found', async () => {
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(null)

      await expect(svc.getAuditLog(makeActor(), 'missing')).rejects.toMatchObject({
        statusCode: 404,
      })
    })

    it('scopes to org', async () => {
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(sampleLog as any)

      await svc.getAuditLog(makeActor(), 'log-1')

      const call = vi.mocked(prisma.auditLog.findFirst).mock.calls[0]![0] as any
      expect(call.where.organizationId).toBe('org-1')
    })

    it('rejects non-admin', async () => {
      await expect(
        svc.getAuditLog(makeActor(UserRole.SALES_MANAGER), 'log-1'),
      ).rejects.toMatchObject({ statusCode: 403 })
    })
  })

  // ─── auditLogStats ────────────────────────────────────────────────────────

  describe('auditLogStats', () => {
    it('returns aggregated counts', async () => {
      vi.mocked(prisma.auditLog.groupBy)
        .mockResolvedValueOnce([{ action: 'CREATE', _count: { _all: 10 } }] as any)
        .mockResolvedValueOnce([{ entityType: 'leads', _count: { _all: 10 } }] as any)
      vi.mocked(prisma.auditLog.count).mockResolvedValue(10)

      const result = await svc.auditLogStats(makeActor())

      expect(result.total).toBe(10)
      expect(result.byAction[0]).toMatchObject({ action: 'CREATE', count: 10 })
      expect(result.byEntity[0]).toMatchObject({ entityType: 'leads', count: 10 })
    })

    it('rejects non-admin', async () => {
      await expect(
        svc.auditLogStats(makeActor(UserRole.ACCOUNTANT)),
      ).rejects.toMatchObject({ statusCode: 403 })
    })
  })
})
