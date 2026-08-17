import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createOffer,
  listOffers,
  getOffer,
  updateOffer,
  updateOfferStatus,
  deleteOffer,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../offers.service.js'
import { OfferStatus, UnitStatus, UserRole } from '../../lib/enums.js'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    unit:     { findFirst: vi.fn() },
    lead:     { findFirst: vi.fn() },
    customer: { findFirst: vi.fn() },
    offer: {
      create:    vi.fn(),
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      update:    vi.fn(),
      delete:    vi.fn(),
      count:     vi.fn(),
    },
  },
}))

import { prisma } from '../../../lib/prisma.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID   = 'org_1'
const AGENT_ID = 'agent_1'
const UNIT_ID  = 'unit_1'
const LEAD_ID  = 'lead_1'
const OFFER_ID = 'offer_1'

const managerActor = { id: AGENT_ID, userId: AGENT_ID, supabaseUid: 'sb-test', organizationId: ORG_ID, role: UserRole.SALES_MANAGER }
const agentActor   = { id: AGENT_ID, userId: AGENT_ID, supabaseUid: 'sb-test', organizationId: ORG_ID, role: UserRole.SALES_AGENT }

const baseUnit = {
  id: UNIT_ID, organizationId: ORG_ID,
  status: UnitStatus.AVAILABLE,
  price: 1_000_000,
}

const baseOffer = {
  id:             OFFER_ID,
  organizationId: ORG_ID,
  unitId:         UNIT_ID,
  agentId:        AGENT_ID,
  leadId:         LEAD_ID,
  originalPrice:  1_000_000,
  offeredPrice:   900_000,
  discount:       100_000,
  discountPct:    10,
  status:         OfferStatus.DRAFT,
  createdAt:      new Date(),
  updatedAt:      new Date(),
}

beforeEach(() => vi.clearAllMocks())

// ─── createOffer ──────────────────────────────────────────────────────────────

describe('createOffer', () => {
  it('creates offer and computes discount', async () => {
    vi.mocked(prisma.unit.findFirst).mockResolvedValue(baseUnit as any)
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({ id: LEAD_ID } as any)
    vi.mocked(prisma.offer.create).mockResolvedValue(baseOffer as any)

    const result = await createOffer(managerActor as any, {
      unitId:       UNIT_ID,
      leadId:       LEAD_ID,
      offeredPrice: 900_000,
    })

    expect(prisma.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          originalPrice: 1_000_000,
          offeredPrice:  900_000,
          discount:      100_000,
        }),
      }),
    )
    expect(result).toEqual(baseOffer)
  })

  it('throws NotFoundError when unit not in org', async () => {
    vi.mocked(prisma.unit.findFirst).mockResolvedValue(null)
    await expect(
      createOffer(managerActor as any, { unitId: UNIT_ID, leadId: LEAD_ID, offeredPrice: 500_000 }),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ConflictError for SOLD unit', async () => {
    vi.mocked(prisma.unit.findFirst).mockResolvedValue({ ...baseUnit, status: UnitStatus.SOLD } as any)
    await expect(
      createOffer(managerActor as any, { unitId: UNIT_ID, leadId: LEAD_ID, offeredPrice: 900_000 }),
    ).rejects.toThrow(ConflictError)
  })
})

// ─── updateOfferStatus ────────────────────────────────────────────────────────

describe('updateOfferStatus', () => {
  it('manager can accept offer', async () => {
    vi.mocked(prisma.offer.findFirst).mockResolvedValue(baseOffer as any)
    vi.mocked(prisma.offer.update).mockResolvedValue({ ...baseOffer, status: OfferStatus.ACCEPTED } as any)

    const result = await updateOfferStatus(managerActor as any, OFFER_ID, { status: 'ACCEPTED' })
    expect(result.status).toBe(OfferStatus.ACCEPTED)
  })

  it('agent can only submit (DRAFT → SENT)', async () => {
    vi.mocked(prisma.offer.findFirst).mockResolvedValue(baseOffer as any)
    vi.mocked(prisma.offer.update).mockResolvedValue({ ...baseOffer, status: OfferStatus.SENT } as any)

    const result = await updateOfferStatus(agentActor as any, OFFER_ID, { status: 'SENT' })
    expect(result.status).toBe(OfferStatus.SENT)
  })

  it('agent cannot accept offer', async () => {
    vi.mocked(prisma.offer.findFirst).mockResolvedValue(baseOffer as any)
    await expect(
      updateOfferStatus(agentActor as any, OFFER_ID, { status: 'ACCEPTED' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ConflictError on already-accepted offer', async () => {
    vi.mocked(prisma.offer.findFirst).mockResolvedValue(
      { ...baseOffer, status: OfferStatus.ACCEPTED } as any,
    )
    await expect(
      updateOfferStatus(managerActor as any, OFFER_ID, { status: 'SENT' }),
    ).rejects.toThrow(ConflictError)
  })
})

// ─── deleteOffer ──────────────────────────────────────────────────────────────

describe('deleteOffer', () => {
  it('deletes DRAFT offer', async () => {
    vi.mocked(prisma.offer.findFirst).mockResolvedValue(baseOffer as any)
    vi.mocked(prisma.offer.delete).mockResolvedValue(baseOffer as any)

    const result = await deleteOffer(managerActor as any, OFFER_ID)
    expect(result).toEqual({ success: true })
  })

  it('cannot delete non-DRAFT offer', async () => {
    vi.mocked(prisma.offer.findFirst).mockResolvedValue(
      { ...baseOffer, status: OfferStatus.SENT } as any,
    )
    await expect(deleteOffer(managerActor as any, OFFER_ID)).rejects.toThrow(ConflictError)
  })
})

// ─── getOffer ─────────────────────────────────────────────────────────────────

describe('getOffer', () => {
  it('returns offer for manager', async () => {
    vi.mocked(prisma.offer.findFirst).mockResolvedValue(baseOffer as any)
    const result = await getOffer(managerActor as any, OFFER_ID)
    expect(result).toEqual(baseOffer)
  })

  it('throws NotFoundError when missing', async () => {
    vi.mocked(prisma.offer.findFirst).mockResolvedValue(null)
    await expect(getOffer(managerActor as any, OFFER_ID)).rejects.toThrow(NotFoundError)
  })
})
