import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { UserRole } from '../../lib/enums.js'
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersQuery,
  SaveUnitInput,
  AssignCustomerInput,
} from './customers.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(msg: string) { super(msg); this.name = 'ConflictError' }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

// ─── Agent scope guard ────────────────────────────────────────────────────────

function agentWhere(actor: AuthUser) {
  if (actor.role === UserRole.SALES_AGENT) {
    return { assignedAgentId: actor.id }
  }
  return {}
}

// ─── Select shape ─────────────────────────────────────────────────────────────

function customerSelect() {
  return {
    id: true,
    organizationId: true,
    leadId: true,
    fullName: true,
    phone: true,
    whatsapp: true,
    email: true,
    nationality: true,
    country: true,
    city: true,
    address: true,
    idNumber: true,
    budgetMin: true,
    budgetMax: true,
    preferredType: true,
    preferredLocation: true,
    bedrooms: true,
    areaMin: true,
    areaMax: true,
    purchasePurpose: true,
    financingPref: true,
    tags: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    assignedAgent: {
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
    lead: { select: { id: true, source: true, temperature: true } },
  } as const
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createCustomer(actor: AuthUser, data: CreateCustomerInput) {
  if (data.assignedAgentId) {
    const agent = await prisma.user.findFirst({
      where: { id: data.assignedAgentId, organizationId: actor.organizationId },
      select: { id: true },
    })
    if (!agent) throw new NotFoundError('Assigned agent not found')
  }

  return prisma.customer.create({
    data: {
      organizationId: actor.organizationId,
      fullName: data.fullName,
      phone: data.phone,
      whatsapp: data.whatsapp,
      email: data.email,
      nationality: data.nationality,
      country: data.country,
      city: data.city,
      address: data.address,
      idNumber: data.idNumber,
      assignedAgentId: data.assignedAgentId,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      preferredType: data.preferredType,
      preferredLocation: data.preferredLocation,
      bedrooms: data.bedrooms,
      areaMin: data.areaMin,
      areaMax: data.areaMax,
      purchasePurpose: data.purchasePurpose,
      financingPref: data.financingPref,
      tags: data.tags,
      notes: data.notes,
    },
    select: customerSelect(),
  })
}

export async function listCustomers(actor: AuthUser, query: ListCustomersQuery) {
  const {
    page, limit,
    assignedAgentId,
    search,
    budgetMin, budgetMax,
    sortBy, sortDir,
  } = query

  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...agentWhere(actor),
    ...(assignedAgentId && { assignedAgentId }),
    ...(budgetMin || budgetMax
      ? {
          OR: [
            ...(budgetMin ? [{ budgetMin: { gte: budgetMin } }] : []),
            ...(budgetMax ? [{ budgetMax: { lte: budgetMax } }] : []),
          ],
        }
      : {}),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { whatsapp: { contains: search, mode: 'insensitive' as const } },
        { city: { contains: search, mode: 'insensitive' as const } },
        { idNumber: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const orderBy = sortBy === 'fullName'
    ? [{ fullName: sortDir }]
    : [{ [sortBy]: sortDir }]

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: customerSelect(),
      orderBy,
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ])

  return { data: customers, meta: { page, limit, total, pages: Math.ceil(total / limit) } }
}

export async function getCustomer(actor: AuthUser, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: {
      ...customerSelect(),
      savedUnits: {
        select: {
          id: true,
          matchScore: true,
          matchReasons: true,
          createdAt: true,
          unit: {
            select: {
              id: true,
              unitNumber: true,
              status: true,
              price: true,
              bedrooms: true,
              area: true,
              project: { select: { id: true, name: true } },
              building: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      viewings: {
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          outcome: true,
          unit: { select: { id: true, unitNumber: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      },
      offers: {
        select: {
          id: true,
          offeredPrice: true,
          status: true,
          expiresAt: true,
          unit: { select: { id: true, unitNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      deals: {
        select: {
          id: true,
          netSaleValue: true,
          status: true,
          pipelineStage: true,
          unit: { select: { id: true, unitNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })
  if (!customer) throw new NotFoundError('Customer not found')
  return customer
}

export async function updateCustomer(actor: AuthUser, customerId: string, data: UpdateCustomerInput) {
  const existing = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true },
  })
  if (!existing) throw new NotFoundError('Customer not found')

  if (data.assignedAgentId) {
    const agent = await prisma.user.findFirst({
      where: { id: data.assignedAgentId, organizationId: actor.organizationId },
      select: { id: true },
    })
    if (!agent) throw new NotFoundError('Assigned agent not found')
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.nationality !== undefined && { nationality: data.nationality }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.idNumber !== undefined && { idNumber: data.idNumber }),
      ...(data.assignedAgentId !== undefined && { assignedAgentId: data.assignedAgentId }),
      ...(data.budgetMin !== undefined && { budgetMin: data.budgetMin }),
      ...(data.budgetMax !== undefined && { budgetMax: data.budgetMax }),
      ...(data.preferredType !== undefined && { preferredType: data.preferredType }),
      ...(data.preferredLocation !== undefined && { preferredLocation: data.preferredLocation }),
      ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
      ...(data.areaMin !== undefined && { areaMin: data.areaMin }),
      ...(data.areaMax !== undefined && { areaMax: data.areaMax }),
      ...(data.purchasePurpose !== undefined && { purchasePurpose: data.purchasePurpose }),
      ...(data.financingPref !== undefined && { financingPref: data.financingPref }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: customerSelect(),
  })
}

export async function deleteCustomer(actor: AuthUser, customerId: string) {
  if (actor.role === UserRole.SALES_AGENT) {
    throw new ForbiddenError('Agents cannot delete customers')
  }

  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: actor.organizationId },
    select: {
      id: true,
      deals: { select: { id: true }, take: 1 },
      reservations: { where: { status: 'ACTIVE' }, select: { id: true }, take: 1 },
    },
  })
  if (!existing) throw new NotFoundError('Customer not found')

  if (existing.deals.length > 0) {
    throw new ConflictError('Cannot delete customer with existing deals')
  }
  if (existing.reservations.length > 0) {
    throw new ConflictError('Cannot delete customer with active reservation')
  }

  await prisma.customer.delete({ where: { id: customerId } })
  return { success: true }
}

// ─── Assignment ───────────────────────────────────────────────────────────────

export async function assignCustomer(actor: AuthUser, customerId: string, data: AssignCustomerInput) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!customer) throw new NotFoundError('Customer not found')

  const agent = await prisma.user.findFirst({
    where: { id: data.agentId, organizationId: actor.organizationId },
    select: { id: true, role: true },
  })
  if (!agent) throw new NotFoundError('Agent not found')
  if (
    agent.role !== UserRole.SALES_AGENT &&
    agent.role !== UserRole.SALES_MANAGER
  ) {
    throw new ConflictError('User is not a sales agent or manager')
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: { assignedAgentId: data.agentId },
    select: customerSelect(),
  })
}

// ─── Saved units ──────────────────────────────────────────────────────────────

export async function saveUnit(actor: AuthUser, customerId: string, data: SaveUnitInput) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true },
  })
  if (!customer) throw new NotFoundError('Customer not found')

  const unit = await prisma.unit.findFirst({
    where: { id: data.unitId, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!unit) throw new NotFoundError('Unit not found')

  try {
    return await prisma.customerSavedUnit.create({
      data: {
        customerId,
        unitId: data.unitId,
        matchScore: data.matchScore,
        matchReasons: data.matchReasons,
      },
      select: {
        id: true,
        customerId: true,
        unitId: true,
        matchScore: true,
        matchReasons: true,
        createdAt: true,
      },
    })
  } catch (e: any) {
    if (e.code === 'P2002') throw new ConflictError('Unit already saved for this customer')
    throw e
  }
}

export async function unsaveUnit(actor: AuthUser, customerId: string, unitId: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true },
  })
  if (!customer) throw new NotFoundError('Customer not found')

  const saved = await prisma.customerSavedUnit.findFirst({
    where: { customerId, unitId },
    select: { id: true },
  })
  if (!saved) throw new NotFoundError('Saved unit not found')

  await prisma.customerSavedUnit.delete({ where: { id: saved.id } })
  return { success: true }
}

export async function getSavedUnits(actor: AuthUser, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true },
  })
  if (!customer) throw new NotFoundError('Customer not found')

  return prisma.customerSavedUnit.findMany({
    where: { customerId },
    select: {
      id: true,
      matchScore: true,
      matchReasons: true,
      createdAt: true,
      unit: {
        select: {
          id: true,
          unitNumber: true,
          unitType: true,
          status: true,
          price: true,
          bedrooms: true,
          area: true,
          project: { select: { id: true, name: true } },
          building: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
  })
}

// ─── Unit match suggestions ───────────────────────────────────────────────────
// Returns available units that match customer's requirements.

export async function matchUnits(actor: AuthUser, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: {
      id: true,
      budgetMin: true,
      budgetMax: true,
      preferredType: true,
      bedrooms: true,
      areaMin: true,
      areaMax: true,
      preferredLocation: true,
    },
  })
  if (!customer) throw new NotFoundError('Customer not found')

  const where: Record<string, unknown> = {
    organizationId: actor.organizationId,
    status: 'AVAILABLE',
    ...(customer.preferredType && { propertyType: customer.preferredType }),
    ...(customer.bedrooms !== null && customer.bedrooms !== undefined && { bedrooms: customer.bedrooms }),
    ...(customer.budgetMin || customer.budgetMax
      ? {
          price: {
            ...(customer.budgetMin && { gte: customer.budgetMin }),
            ...(customer.budgetMax && { lte: customer.budgetMax }),
          },
        }
      : {}),
    ...(customer.areaMin || customer.areaMax
      ? {
          area: {
            ...(customer.areaMin && { gte: customer.areaMin }),
            ...(customer.areaMax && { lte: customer.areaMax }),
          },
        }
      : {}),
  }

  const units = await prisma.unit.findMany({
    where,
    select: {
      id: true,
      unitNumber: true,
      unitType: true,
      propertyType: true,
      status: true,
      price: true,
      bedrooms: true,
      bathrooms: true,
      area: true,
      finishing: true,
      project: {
        select: {
          id: true,
          name: true,
          city: true,
          district: true,
        },
      },
      building: { select: { id: true, name: true } },
    },
    orderBy: { price: 'asc' },
    take: 20,
  })

  // Score each unit against customer preferences
  const scored = units.map((unit) => {
    let score = 0
    const reasons: string[] = []

    if (customer.preferredType && unit.propertyType === customer.preferredType) {
      score += 30; reasons.push('Preferred property type')
    }
    if (customer.bedrooms !== null && customer.bedrooms !== undefined && unit.bedrooms === customer.bedrooms) {
      score += 25; reasons.push('Exact bedroom count')
    }
    if (
      customer.budgetMax &&
      unit.price !== null &&
      Number(unit.price) <= Number(customer.budgetMax)
    ) {
      score += 25; reasons.push('Within budget')
    }
    if (
      customer.preferredLocation &&
      unit.project.city?.toLowerCase().includes(customer.preferredLocation.toLowerCase())
    ) {
      score += 20; reasons.push('Preferred location match')
    }

    return { unit, matchScore: Math.min(100, score), matchReasons: reasons }
  })

  return scored.sort((a, b) => b.matchScore - a.matchScore)
}
