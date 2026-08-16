import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createViewing,
  listViewings,
  getViewing,
  updateViewing,
  completeViewing,
  cancelViewing,
  deleteViewing,
  upcomingViewings,
  NotFoundError,
  ConflictError,
} from '../viewings.service.js'
import { ViewingStatus, UserRole } from '@prisma/client'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    lead:          { findFirst: vi.fn() },
    customer:      { findFirst: vi.fn() },
    unit:          { findFirst: vi.fn() },
    user:          { findFirst: vi.fn() },
    viewing:       {
      create:    vi.fn(),
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      update:    vi.fn(),
      delete:    vi.fn(),
      count:     vi.fn(),
    },
    leadActivity:  { create: vi.fn() },
  },
}))

import { prisma } from '../../../lib/prisma.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID  = 'org_1'
const AGENT_ID = 'agent_1'
const LEAD_ID  = 'lead_1'
const CUST_ID  = 'cust_1'
const UNIT_ID  = 'unit_1'
const VIEW_ID  = 'view_1'

const managerActor = {
  id:             AGENT_ID,
  organizationId: ORG_ID,
  role:           UserRole.SALES_MANAGER,
}

const agentActor = {
  id:             AGENT_ID,
  organizationId: ORG_ID,
  role:           UserRole.SALES_AGENT,
}

const baseViewing = {
  id:               VIEW_ID,
  organizationId:   ORG_ID,
  leadId:           LEAD_ID,
  customerId:       null,
  unitId:           UNIT_ID,
  agentId:          AGENT_ID,
  scheduledAt:      new Date('2026-09-01T10:00:00Z'),
  endAt:            null,
  location:         'Office',
  status:           ViewingStatus.SCHEDULED,
  notes:            null,
  customerFeedback: null,
  agentFeedback:    null,
  outcome:          null,
  nextAction:       null,
  createdAt:        new Date(),
  updatedAt:        new Date(),
  lead:     { id: LEAD_ID, fullName: 'Test Lead', phone: null, email: null },
  customer: null,
  unit:     { id: UNIT_ID, unitNumber: 'A1', unitType: 'APARTMENT', price: 500000, project: { id: 'proj_1', name: 'Project A' }, building: null, floor: null },
  agent:    { id: AGENT_ID, profile: { firstName: 'John', lastName: 'Doe' } },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createViewing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates viewing and logs lead activity', async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({ id: LEAD_ID } as any)
    vi.mocked(prisma.unit.findFirst).mockResolvedValue({ id: UNIT_ID } as any)
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: AGENT_ID } as any)
    vi.mocked(prisma.viewing.create).mockResolvedValue(baseViewing as any)
    vi.mocked(prisma.leadActivity.create).mockResolvedValue({} as any)

    const result = await createViewing(managerActor, {
      leadId:      LEAD_ID,
      unitId:      UNIT_ID,
      agentId:     AGENT_ID,
      scheduledAt: '2026-09-01T10:00:00Z',
    })

    expect(prisma.viewing.create).toHaveBeenCalledOnce()
    expect(prisma.leadActivity.create).toHaveBeenCalledOnce()
    expect(result.id).toBe(VIEW_ID)
  })

  it('throws NotFoundError when lead not in org', async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)

    await expect(
      createViewing(managerActor, {
        leadId:      'bad_lead',
        agentId:     AGENT_ID,
        scheduledAt: '2026-09-01T10:00:00Z',
      }),
    ).rejects.toThrow(NotFoundError)
  })

  it('requires leadId or customerId', async () => {
    // Zod refinement — expect parse-level error, so we simulate it via direct schema call
    const { CreateViewingSchema } = await import('../viewings.schema.js')
    const result = CreateViewingSchema.safeParse({
      agentId:     AGENT_ID,
      scheduledAt: '2026-09-01T10:00:00Z',
    })
    expect(result.success).toBe(false)
  })
})

describe('listViewings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns paginated viewings for manager', async () => {
    vi.mocked(prisma.viewing.findMany).mockResolvedValue([baseViewing] as any)
    vi.mocked(prisma.viewing.count).mockResolvedValue(1)

    const result = await listViewings(managerActor, {
      page: 1, limit: 50, calendar: false,
    })

    expect(result.data).toHaveLength(1)
    expect(result.meta?.total).toBe(1)
  })

  it('returns flat list in calendar mode', async () => {
    vi.mocked(prisma.viewing.findMany).mockResolvedValue([baseViewing, baseViewing] as any)

    const result = await listViewings(managerActor, {
      page: 1, limit: 50, calendar: true,
      from: '2026-09-01T00:00:00Z',
      to:   '2026-09-30T23:59:59Z',
    })

    expect(result.data).toHaveLength(2)
    expect((result as any).meta).toBeUndefined()
    // calendar mode: count not called
    expect(prisma.viewing.count).not.toHaveBeenCalled()
  })

  it('scopes query to agentId for SALES_AGENT', async () => {
    vi.mocked(prisma.viewing.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.viewing.count).mockResolvedValue(0)

    await listViewings(agentActor, { page: 1, limit: 50, calendar: false })

    const call = vi.mocked(prisma.viewing.findMany).mock.calls[0]![0]
    expect((call.where as any).agentId).toBe(AGENT_ID)
  })
})

describe('getViewing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns viewing', async () => {
    vi.mocked(prisma.viewing.findFirst).mockResolvedValue(baseViewing as any)
    const result = await getViewing(managerActor, VIEW_ID)
    expect(result.id).toBe(VIEW_ID)
  })

  it('throws NotFoundError when not found', async () => {
    vi.mocked(prisma.viewing.findFirst).mockResolvedValue(null)
    await expect(getViewing(managerActor, 'bad_id')).rejects.toThrow(NotFoundError)
  })
})

describe('updateViewing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates a scheduled viewing', async () => {
    vi.mocked(prisma.viewing.findFirst).mockResolvedValue({
      id:     VIEW_ID,
      status: ViewingStatus.SCHEDULED,
      leadId: LEAD_ID,
    } as any)
    const updated = { ...baseViewing, location: 'New Location' }
    vi.mocked(prisma.viewing.update).mockResolvedValue(updated as any)
    vi.mocked(prisma.leadActivity.create).mockResolvedValue({} as any)

    const result = await updateViewing(managerActor, VIEW_ID, { location: 'New Location' })
    expect(result.location).toBe('New Location')
  })

  it('throws ConflictError when viewing is COMPLETED', async () => {
    vi.mocked(prisma.viewing.findFirst).mockResolvedValue({
      id:     VIEW_ID,
      status: ViewingStatus.COMPLETED,
      leadId: LEAD_ID,
    } as any)

    await expect(
      updateViewing(managerActor, VIEW_ID, { location: 'X' }),
    ).rejects.toThrow(ConflictError)
  })
})

describe('completeViewing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks viewing COMPLETED with feedback', async () => {
    vi.mocked(prisma.viewing.findFirst).mockResolvedValue({
      id:     VIEW_ID,
      status: ViewingStatus.SCHEDULED,
      leadId: LEAD_ID,
    } as any)
    const completed = { ...baseViewing, status: ViewingStatus.COMPLETED, outcome: 'Interested' }
    vi.mocked(prisma.viewing.update).mockResolvedValue(completed as any)
    vi.mocked(prisma.leadActivity.create).mockResolvedValue({} as any)

    const result = await completeViewing(managerActor, VIEW_ID, {
      outcome: 'Interested',
      nextAction: 'Send offer',
    })

    expect(result.status).toBe(ViewingStatus.COMPLETED)
    expect(prisma.leadActivity.create).toHaveBeenCalledOnce()
  })

  it('throws ConflictError on already-cancelled', async () => {
    vi.mocked(prisma.viewing.findFirst).mockResolvedValue({
      id:     VIEW_ID,
      status: ViewingStatus.CANCELLED,
      leadId: null,
    } as any)

    await expect(
      completeViewing(managerActor, VIEW_ID, { outcome: 'ok' }),
    ).rejects.toThrow(ConflictError)
  })
})

describe('cancelViewing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cancels a SCHEDULED viewing', async () => {
    vi.mocked(prisma.viewing.findFirst).mockResolvedValue({
      id:     VIEW_ID,
      status: ViewingStatus.SCHEDULED,
      leadId: LEAD_ID,
    } as any)
    const cancelled = { ...baseViewing, status: ViewingStatus.CANCELLED }
    vi.mocked(prisma.viewing.update).mockResolvedValue(cancelled as any)
    vi.mocked(prisma.leadActivity.create).mockResolvedValue({} as any)

    const result = await cancelViewing(managerActor, VIEW_ID)
    expect(result.status).toBe(ViewingStatus.CANCELLED)
  })
})

describe('deleteViewing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes a non-completed viewing', async () => {
    vi.mocked(prisma.viewing.findFirst).mockResolvedValue({
      id:     VIEW_ID,
      status: ViewingStatus.CANCELLED,
    } as any)
    vi.mocked(prisma.viewing.delete).mockResolvedValue({} as any)

    const result = await deleteViewing(managerActor, VIEW_ID)
    expect(result.success).toBe(true)
  })

  it('throws ConflictError for COMPLETED viewing', async () => {
    vi.mocked(prisma.viewing.findFirst).mockResolvedValue({
      id:     VIEW_ID,
      status: ViewingStatus.COMPLETED,
    } as any)

    await expect(deleteViewing(managerActor, VIEW_ID)).rejects.toThrow(ConflictError)
  })
})

describe('upcomingViewings', () => {
  it('returns future SCHEDULED/CONFIRMED viewings', async () => {
    vi.mocked(prisma.viewing.findMany).mockResolvedValue([baseViewing] as any)
    const result = await upcomingViewings(managerActor, 5)
    expect(result).toHaveLength(1)
    const call = vi.mocked(prisma.viewing.findMany).mock.calls[0]![0]
    expect((call.where as any).status.in).toContain(ViewingStatus.SCHEDULED)
  })
})
