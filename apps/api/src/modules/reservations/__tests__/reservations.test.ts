import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createReservation,
  listReservations,
  getReservation,
  updateReservation,
  cancelReservation,
  expireReservation,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../reservations.service.js'
import { ReservationStatus, UnitStatus, UserRole } from '../../lib/enums.js'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockTx = {
  unit:        { findFirst: vi.fn(), update: vi.fn() },
  customer:    { findFirst: vi.fn() },
  reservation: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
}

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((fn: any) => fn(mockTx)),
    unit:         { findFirst: vi.fn() },
    customer:     { findFirst: vi.fn() },
    reservation: {
      create:    vi.fn(),
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      update:    vi.fn(),
      count:     vi.fn(),
    },
  },
}))

import { prisma } from '../../../lib/prisma.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID  = 'org_1'
const AGENT_ID = 'agent_1'
const UNIT_ID  = 'unit_1'
const CUST_ID  = 'cust_1'
const RES_ID   = 'res_1'

const managerActor = { id: AGENT_ID, userId: AGENT_ID, supabaseUid: 'sb-test', organizationId: ORG_ID, role: UserRole.SALES_MANAGER }
const agentActor   = { id: AGENT_ID, userId: AGENT_ID, supabaseUid: 'sb-test', organizationId: ORG_ID, role: UserRole.SALES_AGENT }

const baseUnit = { id: UNIT_ID, organizationId: ORG_ID, status: UnitStatus.AVAILABLE }
const baseCustomer = { id: CUST_ID, organizationId: ORG_ID }

const baseReservation = {
  id:             RES_ID,
  organizationId: ORG_ID,
  unitId:         UNIT_ID,
  customerId:     CUST_ID,
  agentId:        AGENT_ID,
  status:         ReservationStatus.ACTIVE,
  createdAt:      new Date(),
  updatedAt:      new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  // Reset tx mocks
  Object.values(mockTx).forEach(model =>
    Object.values(model).forEach((fn: any) => fn.mockReset()),
  )
})

// ─── createReservation ────────────────────────────────────────────────────────

describe('createReservation', () => {
  it('reserves unit and creates reservation', async () => {
    mockTx.unit.findFirst.mockResolvedValue(baseUnit)
    mockTx.customer.findFirst.mockResolvedValue(baseCustomer)
    mockTx.unit.update.mockResolvedValue({ ...baseUnit, status: UnitStatus.RESERVED })
    mockTx.reservation.create.mockResolvedValue(baseReservation)

    const result = await createReservation(managerActor as any, {
      unitId: UNIT_ID, customerId: CUST_ID,
    })

    expect(mockTx.unit.update).toHaveBeenCalledWith({
      where: { id: UNIT_ID },
      data:  { status: UnitStatus.RESERVED },
    })
    expect(result).toEqual(baseReservation)
  })

  it('throws ConflictError for already RESERVED unit', async () => {
    mockTx.unit.findFirst.mockResolvedValue({ ...baseUnit, status: UnitStatus.RESERVED })
    await expect(
      createReservation(managerActor as any, { unitId: UNIT_ID, customerId: CUST_ID }),
    ).rejects.toThrow(ConflictError)
  })

  it('throws ConflictError for SOLD unit', async () => {
    mockTx.unit.findFirst.mockResolvedValue({ ...baseUnit, status: UnitStatus.SOLD })
    await expect(
      createReservation(managerActor as any, { unitId: UNIT_ID, customerId: CUST_ID }),
    ).rejects.toThrow(ConflictError)
  })

  it('throws NotFoundError when unit not in org', async () => {
    mockTx.unit.findFirst.mockResolvedValue(null)
    await expect(
      createReservation(managerActor as any, { unitId: UNIT_ID, customerId: CUST_ID }),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when customer not in org', async () => {
    mockTx.unit.findFirst.mockResolvedValue(baseUnit)
    mockTx.customer.findFirst.mockResolvedValue(null)
    await expect(
      createReservation(managerActor as any, { unitId: UNIT_ID, customerId: CUST_ID }),
    ).rejects.toThrow(NotFoundError)
  })
})

// ─── cancelReservation ────────────────────────────────────────────────────────

describe('cancelReservation', () => {
  it('cancels active reservation and reverts unit', async () => {
    mockTx.reservation.findFirst.mockResolvedValue(baseReservation)
    mockTx.unit.update.mockResolvedValue({ ...baseUnit, status: UnitStatus.AVAILABLE })
    mockTx.reservation.update.mockResolvedValue({
      ...baseReservation, status: ReservationStatus.CANCELLED,
    })

    const result = await cancelReservation(managerActor as any, RES_ID, { reason: 'Client withdrew' })
    expect(mockTx.unit.update).toHaveBeenCalledWith({
      where: { id: UNIT_ID },
      data:  { status: UnitStatus.AVAILABLE },
    })
    expect(result.status).toBe(ReservationStatus.CANCELLED)
  })

  it('throws ForbiddenError for agent', async () => {
    await expect(
      cancelReservation(agentActor as any, RES_ID, {}),
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ConflictError if already cancelled', async () => {
    mockTx.reservation.findFirst.mockResolvedValue({
      ...baseReservation, status: ReservationStatus.CANCELLED,
    })
    await expect(
      cancelReservation(managerActor as any, RES_ID, {}),
    ).rejects.toThrow(ConflictError)
  })
})

// ─── expireReservation ────────────────────────────────────────────────────────

describe('expireReservation', () => {
  it('expires active reservation and reverts unit', async () => {
    mockTx.reservation.findFirst.mockResolvedValue(baseReservation)
    mockTx.unit.update.mockResolvedValue({ ...baseUnit, status: UnitStatus.AVAILABLE })
    mockTx.reservation.update.mockResolvedValue({
      ...baseReservation, status: ReservationStatus.EXPIRED,
    })

    const result = await expireReservation(managerActor as any, RES_ID)
    expect(result.status).toBe(ReservationStatus.EXPIRED)
  })

  it('throws ConflictError if already converted', async () => {
    mockTx.reservation.findFirst.mockResolvedValue({
      ...baseReservation, status: ReservationStatus.CONVERTED,
    })
    await expect(expireReservation(managerActor as any, RES_ID)).rejects.toThrow(ConflictError)
  })
})

// ─── getReservation ───────────────────────────────────────────────────────────

describe('getReservation', () => {
  it('returns reservation', async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValue(baseReservation as any)
    const result = await getReservation(managerActor as any, RES_ID)
    expect(result).toEqual(baseReservation)
  })

  it('throws NotFoundError when missing', async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValue(null)
    await expect(getReservation(managerActor as any, RES_ID)).rejects.toThrow(NotFoundError)
  })
})
