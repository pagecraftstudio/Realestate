import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDeal,
  listDeals,
  getDeal,
  updateDeal,
  updateDealStatus,
  updatePipelineStage,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../deals.service.js'
import { DealStatus, PipelineStage, ReservationStatus, UnitStatus, UserRole } from '@prisma/client'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockTx = {
  customer:    { findFirst: vi.fn() },
  unit:        { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  deal:        { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
  reservation: { findFirst: vi.fn(), update: vi.fn() },
}

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((fn: any) => fn(mockTx)),
    deal: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      update:    vi.fn(),
      count:     vi.fn(),
    },
  },
}))

import { prisma } from '../../../lib/prisma.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID   = 'org_1'
const AGENT_ID = 'agent_1'
const CUST_ID  = 'cust_1'
const UNIT_ID  = 'unit_1'
const DEAL_ID  = 'deal_1'
const RES_ID   = 'res_1'

const managerActor = { id: AGENT_ID, organizationId: ORG_ID, role: UserRole.SALES_MANAGER }
const agentActor   = { id: AGENT_ID, organizationId: ORG_ID, role: UserRole.SALES_AGENT }

const baseUnit = { id: UNIT_ID, organizationId: ORG_ID, status: UnitStatus.AVAILABLE, price: 1_000_000 }
const baseCustomer = { id: CUST_ID, organizationId: ORG_ID, fullName: 'Test Customer' }

const baseDeal = {
  id:             DEAL_ID,
  organizationId: ORG_ID,
  customerId:     CUST_ID,
  unitId:         UNIT_ID,
  agentId:        AGENT_ID,
  dealNumber:     'DEAL-202608-00001',
  salePrice:      1_000_000,
  discount:       0,
  netSaleValue:   1_000_000,
  status:         DealStatus.DRAFT,
  pipelineStage:  PipelineStage.RESERVATION,
  probability:    70,
  createdAt:      new Date(),
  updatedAt:      new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.values(mockTx).forEach(model =>
    Object.values(model).forEach((fn: any) => fn.mockReset()),
  )
})

// ─── createDeal ───────────────────────────────────────────────────────────────

describe('createDeal', () => {
  it('creates deal for available unit', async () => {
    mockTx.customer.findFirst.mockResolvedValue(baseCustomer)
    mockTx.unit.findFirst.mockResolvedValue(baseUnit)
    mockTx.deal.findFirst.mockResolvedValue(null)          // no existing deal
    mockTx.unit.update.mockResolvedValue({ ...baseUnit, status: UnitStatus.RESERVED })
    mockTx.deal.count.mockResolvedValue(0)
    mockTx.deal.create.mockResolvedValue(baseDeal)

    const result = await createDeal(managerActor as any, {
      customerId: CUST_ID,
      unitId:     UNIT_ID,
      salePrice:  1_000_000,
      discount:   0,
    })

    expect(mockTx.unit.update).toHaveBeenCalledWith({
      where: { id: UNIT_ID },
      data:  { status: UnitStatus.RESERVED },
    })
    expect(result).toEqual(baseDeal)
  })

  it('converts active reservation when reservationId provided', async () => {
    const reservation = { id: RES_ID, organizationId: ORG_ID, unitId: UNIT_ID, status: ReservationStatus.ACTIVE }
    mockTx.customer.findFirst.mockResolvedValue(baseCustomer)
    mockTx.unit.findFirst.mockResolvedValue({ ...baseUnit, status: UnitStatus.RESERVED })
    mockTx.deal.findFirst.mockResolvedValue(null)
    mockTx.reservation.findFirst.mockResolvedValue(reservation)
    mockTx.reservation.update.mockResolvedValue({ ...reservation, status: ReservationStatus.CONVERTED, dealId: DEAL_ID })
    mockTx.deal.count.mockResolvedValue(2)
    mockTx.deal.create.mockResolvedValue(baseDeal)

    await createDeal(managerActor as any, {
      customerId:    CUST_ID,
      unitId:        UNIT_ID,
      salePrice:     1_000_000,
      discount:      0,
      reservationId: RES_ID,
    })

    expect(mockTx.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ReservationStatus.CONVERTED }) }),
    )
    // Unit should NOT be re-updated when RESERVED + reservationId path
    expect(mockTx.unit.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: UnitStatus.RESERVED } }))
  })

  it('throws ConflictError for SOLD unit', async () => {
    mockTx.customer.findFirst.mockResolvedValue(baseCustomer)
    mockTx.unit.findFirst.mockResolvedValue({ ...baseUnit, status: UnitStatus.SOLD })
    await expect(
      createDeal(managerActor as any, { customerId: CUST_ID, unitId: UNIT_ID, salePrice: 1_000_000, discount: 0 }),
    ).rejects.toThrow(ConflictError)
  })

  it('throws ConflictError when active deal exists', async () => {
    mockTx.customer.findFirst.mockResolvedValue(baseCustomer)
    mockTx.unit.findFirst.mockResolvedValue(baseUnit)
    mockTx.deal.findFirst.mockResolvedValue(baseDeal)   // existing active deal
    await expect(
      createDeal(managerActor as any, { customerId: CUST_ID, unitId: UNIT_ID, salePrice: 1_000_000, discount: 0 }),
    ).rejects.toThrow(ConflictError)
  })

  it('throws NotFoundError when customer missing', async () => {
    mockTx.customer.findFirst.mockResolvedValue(null)
    await expect(
      createDeal(managerActor as any, { customerId: CUST_ID, unitId: UNIT_ID, salePrice: 1_000_000, discount: 0 }),
    ).rejects.toThrow(NotFoundError)
  })
})

// ─── updateDealStatus ─────────────────────────────────────────────────────────

describe('updateDealStatus', () => {
  it('COMPLETED → unit becomes SOLD', async () => {
    mockTx.deal.findFirst.mockResolvedValue(baseDeal)
    mockTx.unit.update.mockResolvedValue({ ...baseUnit, status: UnitStatus.SOLD })
    mockTx.unit.findUnique.mockResolvedValue({ ...baseUnit, status: UnitStatus.RESERVED })
    mockTx.deal.update.mockResolvedValue({ ...baseDeal, status: DealStatus.COMPLETED })

    const result = await updateDealStatus(managerActor as any, DEAL_ID, { status: 'COMPLETED' })

    expect(mockTx.unit.update).toHaveBeenCalledWith({
      where: { id: UNIT_ID },
      data:  { status: UnitStatus.SOLD },
    })
    expect(result.status).toBe(DealStatus.COMPLETED)
  })

  it('CANCELLED → unit reverts to AVAILABLE', async () => {
    mockTx.deal.findFirst.mockResolvedValue(baseDeal)
    mockTx.unit.findUnique.mockResolvedValue({ ...baseUnit, status: UnitStatus.RESERVED })
    mockTx.unit.update.mockResolvedValue({ ...baseUnit, status: UnitStatus.AVAILABLE })
    mockTx.deal.update.mockResolvedValue({ ...baseDeal, status: DealStatus.CANCELLED })

    const result = await updateDealStatus(managerActor as any, DEAL_ID, { status: 'CANCELLED' })

    expect(mockTx.unit.update).toHaveBeenCalledWith({
      where: { id: UNIT_ID },
      data:  { status: UnitStatus.AVAILABLE },
    })
    expect(result.status).toBe(DealStatus.CANCELLED)
  })

  it('throws ForbiddenError for agent', async () => {
    await expect(
      updateDealStatus(agentActor as any, DEAL_ID, { status: 'COMPLETED' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ConflictError on terminal deal', async () => {
    mockTx.deal.findFirst.mockResolvedValue({ ...baseDeal, status: DealStatus.COMPLETED })
    await expect(
      updateDealStatus(managerActor as any, DEAL_ID, { status: 'CANCELLED' }),
    ).rejects.toThrow(ConflictError)
  })
})

// ─── updateDeal ───────────────────────────────────────────────────────────────

describe('updateDeal', () => {
  it('agent cannot modify pricing', async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(baseDeal as any)
    await expect(
      updateDeal(agentActor as any, DEAL_ID, { salePrice: 900_000 }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('manager can update notes', async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(baseDeal as any)
    vi.mocked(prisma.deal.update).mockResolvedValue({ ...baseDeal, notes: 'updated' } as any)

    const result = await updateDeal(managerActor as any, DEAL_ID, { notes: 'updated' })
    expect(result.notes).toBe('updated')
  })
})

// ─── updatePipelineStage ──────────────────────────────────────────────────────

describe('updatePipelineStage', () => {
  it('moves pipeline stage', async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(baseDeal as any)
    vi.mocked(prisma.deal.update).mockResolvedValue({
      ...baseDeal, pipelineStage: PipelineStage.CONTRACT,
    } as any)

    const result = await updatePipelineStage(managerActor as any, DEAL_ID, {
      pipelineStage: 'CONTRACT',
      probability:   90,
    })
    expect(result.pipelineStage).toBe(PipelineStage.CONTRACT)
  })
})

// ─── getDeal ──────────────────────────────────────────────────────────────────

describe('getDeal', () => {
  it('returns deal for manager', async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(baseDeal as any)
    const result = await getDeal(managerActor as any, DEAL_ID)
    expect(result).toEqual(baseDeal)
  })

  it('throws NotFoundError when missing', async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(null)
    await expect(getDeal(managerActor as any, DEAL_ID)).rejects.toThrow(NotFoundError)
  })
})
