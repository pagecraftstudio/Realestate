import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { UserRole } from '../../lib/enums.js'
import type {
  CreateLeadInput,
  UpdateLeadInput,
  AssignLeadInput,
  ListLeadsQuery,
  AddActivityInput,
  ConvertLeadInput,
  SaveUnitInput,
} from './leads.schema.js'

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
// SALES_AGENT can only touch leads assigned to them.

function agentWhere(actor: AuthUser) {
  if (actor.role === UserRole.SALES_AGENT) {
    return { assignedAgentId: actor.id }
  }
  return {}
}

// ─── Select shape ─────────────────────────────────────────────────────────────

function leadSelect() {
  return {
    id: true,
    organizationId: true,
    fullName: true,
    phone: true,
    whatsapp: true,
    email: true,
    country: true,
    city: true,
    source: true,
    status: true,
    temperature: true,
    leadScore: true,
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
    isArchived: true,
    lastContactedAt: true,
    nextFollowupAt: true,
    createdAt: true,
    updatedAt: true,
    assignedAgent: {
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
    team: { select: { id: true, name: true } },
    campaign: { select: { id: true, name: true } },
    customer: { select: { id: true } },
  } as const
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createLead(actor: AuthUser, data: CreateLeadInput) {
  // Validate assigned agent belongs to org
  if (data.assignedAgentId) {
    const agent = await prisma.user.findFirst({
      where: { id: data.assignedAgentId, organizationId: actor.organizationId },
      select: { id: true },
    })
    if (!agent) throw new NotFoundError('Assigned agent not found')
  }

  // Validate team belongs to org
  if (data.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: data.teamId, organizationId: actor.organizationId },
      select: { id: true },
    })
    if (!team) throw new NotFoundError('Team not found')
  }

  // Validate campaign belongs to org
  if (data.campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: data.campaignId, organizationId: actor.organizationId },
      select: { id: true },
    })
    if (!campaign) throw new NotFoundError('Campaign not found')
  }

  const lead = await prisma.lead.create({
    data: {
      organizationId: actor.organizationId,
      fullName: data.fullName,
      phone: data.phone,
      whatsapp: data.whatsapp,
      email: data.email,
      country: data.country,
      city: data.city,
      source: data.source,
      campaignId: data.campaignId,
      assignedAgentId: data.assignedAgentId,
      teamId: data.teamId,
      status: data.status,
      temperature: data.temperature,
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
      nextFollowupAt: data.nextFollowupAt ? new Date(data.nextFollowupAt) : undefined,
    },
    select: leadSelect(),
  })

  // Log creation activity
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      organizationId: actor.organizationId,
      actorId: actor.id,
      type: 'CREATED',
      payload: {
        source: data.source,
        assignedAgentId: data.assignedAgentId ?? null,
      } as unknown,
    },
  })

  return lead
}

export async function listLeads(actor: AuthUser, query: ListLeadsQuery) {
  const {
    page, limit,
    status, source, temperature,
    assignedAgentId, teamId, campaignId,
    isArchived,
    search,
    budgetMin, budgetMax,
    followupFrom, followupTo,
    sortBy, sortDir,
  } = query

  const skip = (page - 1) * limit

  // Agent can only see their own leads
  const agentFilter = agentWhere(actor)

  const where = {
    organizationId: actor.organizationId,
    ...agentFilter,
    ...(status && { status }),
    ...(source && { source }),
    ...(temperature && { temperature }),
    ...(assignedAgentId && { assignedAgentId }),
    ...(teamId && { teamId }),
    ...(campaignId && { campaignId }),
    ...(isArchived !== undefined && { isArchived }),
    ...(budgetMin || budgetMax
      ? {
          OR: [
            { budgetMin: { gte: budgetMin ?? 0 } },
            { budgetMax: { lte: budgetMax ?? Number.MAX_SAFE_INTEGER } },
          ],
        }
      : {}),
    ...(followupFrom || followupTo
      ? {
          nextFollowupAt: {
            ...(followupFrom && { gte: new Date(followupFrom) }),
            ...(followupTo && { lte: new Date(followupTo) }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { whatsapp: { contains: search, mode: 'insensitive' as const } },
        { city: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const orderBy = sortBy === 'fullName'
    ? [{ fullName: sortDir }]
    : [{ [sortBy]: sortDir }]

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      select: leadSelect(),
      orderBy,
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ])

  return { data: leads, meta: { page, limit, total, pages: Math.ceil(total / limit) } }
}

export async function getLead(actor: AuthUser, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: {
      ...leadSelect(),
      duplicateOfId: true,
      duplicates: { select: { id: true, fullName: true, phone: true } },
      savedUnits: {
        select: {
          id: true,
          unit: {
            select: {
              id: true,
              unitNumber: true,
              status: true,
              price: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
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
    },
  })
  if (!lead) throw new NotFoundError('Lead not found')
  return lead
}

export async function updateLead(actor: AuthUser, leadId: string, data: UpdateLeadInput) {
  const existing = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true, status: true, temperature: true },
  })
  if (!existing) throw new NotFoundError('Lead not found')

  const oldStatus = existing.status
  const oldTemperature = existing.temperature

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.assignedAgentId !== undefined && { assignedAgentId: data.assignedAgentId }),
      ...(data.teamId !== undefined && { teamId: data.teamId }),
      ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.temperature !== undefined && { temperature: data.temperature }),
      ...(data.leadScore !== undefined && { leadScore: data.leadScore }),
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
      ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      ...(data.nextFollowupAt !== undefined && {
        nextFollowupAt: data.nextFollowupAt ? new Date(data.nextFollowupAt) : null,
      }),
      ...(data.lastContactedAt !== undefined && {
        lastContactedAt: data.lastContactedAt ? new Date(data.lastContactedAt) : null,
      }),
    },
    select: leadSelect(),
  })

  // Auto-log status change
  if (data.status && data.status !== oldStatus) {
    await prisma.leadActivity.create({
      data: {
        leadId,
        organizationId: actor.organizationId,
        actorId: actor.id,
        type: 'STATUS_CHANGED',
        payload: { from: oldStatus, to: data.status } as unknown,
      },
    })
  }

  // Auto-log temperature change
  if (data.temperature && data.temperature !== oldTemperature) {
    await prisma.leadActivity.create({
      data: {
        leadId,
        organizationId: actor.organizationId,
        actorId: actor.id,
        type: 'TEMPERATURE_CHANGED',
        payload: { from: oldTemperature, to: data.temperature } as unknown,
      },
    })
  }

  return updated
}

export async function deleteLead(actor: AuthUser, leadId: string) {
  // Only managers/admins can delete
  if (actor.role === UserRole.SALES_AGENT) {
    throw new ForbiddenError('Agents cannot delete leads')
  }

  const existing = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: actor.organizationId },
    select: {
      id: true,
      customer: { select: { id: true } },
    },
  })
  if (!existing) throw new NotFoundError('Lead not found')

  if (existing.customer) {
    throw new ConflictError('Cannot delete lead that has been converted to a customer')
  }

  await prisma.lead.delete({ where: { id: leadId } })
  return { success: true }
}

// ─── Assignment ───────────────────────────────────────────────────────────────

export async function assignLead(actor: AuthUser, leadId: string, data: AssignLeadInput) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: actor.organizationId },
    select: { id: true, assignedAgentId: true },
  })
  if (!lead) throw new NotFoundError('Lead not found')

  // Verify agent belongs to org
  const agent = await prisma.user.findFirst({
    where: { id: data.agentId, organizationId: actor.organizationId },
    select: { id: true, role: true },
  })
  if (!agent) throw new NotFoundError('Agent not found')
  if (agent.role !== UserRole.SALES_AGENT && agent.role !== UserRole.SALES_MANAGER) {
    throw new ConflictError('User is not a sales agent or manager')
  }

  const previousAgentId = lead.assignedAgentId

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedAgentId: data.agentId,
      ...(data.teamId && { teamId: data.teamId }),
    },
    select: leadSelect(),
  })

  await prisma.leadActivity.create({
    data: {
      leadId,
      organizationId: actor.organizationId,
      actorId: actor.id,
      type: 'ASSIGNED',
      payload: {
        previousAgentId,
        newAgentId: data.agentId,
        teamId: data.teamId ?? null,
      } as unknown,
    },
  })

  return updated
}

// ─── Activity timeline ────────────────────────────────────────────────────────

export async function addActivity(actor: AuthUser, leadId: string, data: AddActivityInput) {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true },
  })
  if (!lead) throw new NotFoundError('Lead not found')

  // If it's a call/email/whatsapp, update lastContactedAt
  const contactTypes = ['CALL_LOGGED', 'EMAIL_SENT', 'WHATSAPP_SENT']
  if (contactTypes.includes(data.type)) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: new Date() },
    })
  }

  return prisma.leadActivity.create({
    data: {
      leadId,
      organizationId: actor.organizationId,
      actorId: actor.id,
      type: data.type,
      payload: data.payload as unknown,
    },
    select: {
      id: true,
      type: true,
      payload: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })
}

export async function getTimeline(actor: AuthUser, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true },
  })
  if (!lead) throw new NotFoundError('Lead not found')

  return prisma.leadActivity.findMany({
    where: { leadId, organizationId: actor.organizationId },
    select: {
      id: true,
      type: true,
      payload: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Lead scoring ─────────────────────────────────────────────────────────────

export async function recalculateScore(actor: AuthUser, leadId: string): Promise<{ leadId: string; score: number }> {
  const [lead, rules] = await Promise.all([
    prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: actor.organizationId,
        ...agentWhere(actor),
      },
      select: {
        id: true,
        source: true,
        temperature: true,
        budgetMin: true,
        budgetMax: true,
        preferredType: true,
        preferredLocation: true,
        bedrooms: true,
        phone: true,
        email: true,
        whatsapp: true,
        purchasePurpose: true,
        financingPref: true,
        viewings: { where: { status: { not: 'CANCELLED' } }, select: { id: true } },
        offers: { select: { id: true } },
      },
    }),
    prisma.leadScoringRule.findMany({
      where: { organizationId: actor.organizationId, isActive: true },
      select: { signal: true, points: true },
    }),
  ])

  if (!lead) throw new NotFoundError('Lead not found')

  // Build signal map from rule table
  const ruleMap = Object.fromEntries(rules.map((r) => [r.signal, r.points]))

  // Evaluate signals
  let score = 0
  const addIf = (signal: string, condition: boolean) => {
    if (condition && ruleMap[signal] !== undefined) score += ruleMap[signal]
  }

  addIf('HAS_PHONE', Boolean(lead.phone))
  addIf('HAS_EMAIL', Boolean(lead.email))
  addIf('HAS_WHATSAPP', Boolean(lead.whatsapp))
  addIf('HAS_BUDGET', lead.budgetMin !== null || lead.budgetMax !== null)
  addIf('HAS_PREFERRED_TYPE', Boolean(lead.preferredType))
  addIf('HAS_LOCATION', Boolean(lead.preferredLocation))
  addIf('HAS_BEDROOMS', lead.bedrooms !== null)
  addIf('HAS_PURPOSE', Boolean(lead.purchasePurpose))
  addIf('HAS_FINANCING', Boolean(lead.financingPref))
  addIf('HAS_VIEWING', lead.viewings.length > 0)
  addIf('HAS_OFFER', lead.offers.length > 0)
  addIf('TEMP_HOT', lead.temperature === 'HOT')
  addIf('TEMP_WARM', lead.temperature === 'WARM')

  // Source bonuses
  addIf(`SOURCE_${lead.source}`, true)

  // Clamp 0-1000
  score = Math.max(0, Math.min(1000, score))

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { leadScore: score },
    select: { id: true, leadScore: true },
  })

  await prisma.leadActivity.create({
    data: {
      leadId,
      organizationId: actor.organizationId,
      actorId: actor.id,
      type: 'SCORE_UPDATED',
      payload: { score } as unknown,
    },
  })

  return { leadId: updated.id, score: updated.leadScore }
}

// ─── Convert to customer ──────────────────────────────────────────────────────

export async function convertToCustomer(actor: AuthUser, leadId: string, data: ConvertLeadInput) {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      whatsapp: true,
      email: true,
      country: true,
      city: true,
      assignedAgentId: true,
      customer: { select: { id: true } },
    },
  })
  if (!lead) throw new NotFoundError('Lead not found')
  if (lead.customer) throw new ConflictError('Lead already converted to customer')

  const customer = await prisma.customer.create({
    data: {
      organizationId: actor.organizationId,
      leadId: lead.id,
      assignedAgentId: lead.assignedAgentId,
      fullName: data.fullName ?? lead.fullName,
      phone: data.phone ?? lead.phone,
      whatsapp: lead.whatsapp,
      email: data.email ?? lead.email,
      nationality: data.nationality,
      country: lead.country,
      city: lead.city,
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      createdAt: true,
    },
  })

  // Update lead status → WON
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'WON' },
  })

  await prisma.leadActivity.create({
    data: {
      leadId,
      organizationId: actor.organizationId,
      actorId: actor.id,
      type: 'CONVERTED_TO_CUSTOMER',
      payload: { customerId: customer.id } as unknown,
    },
  })

  return customer
}

// ─── Saved units ──────────────────────────────────────────────────────────────

export async function saveUnit(actor: AuthUser, leadId: string, data: SaveUnitInput) {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true },
  })
  if (!lead) throw new NotFoundError('Lead not found')

  const unit = await prisma.unit.findFirst({
    where: { id: data.unitId, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!unit) throw new NotFoundError('Unit not found')

  try {
    return await prisma.leadSavedUnit.create({
      data: { leadId, unitId: data.unitId },
      select: { id: true, leadId: true, unitId: true, createdAt: true },
    })
  } catch (e: any) {
    if (e.code === 'P2002') throw new ConflictError('Unit already saved for this lead')
    throw e
  }
}

export async function unsaveUnit(actor: AuthUser, leadId: string, unitId: string) {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true },
  })
  if (!lead) throw new NotFoundError('Lead not found')

  const saved = await prisma.leadSavedUnit.findFirst({
    where: { leadId, unitId },
    select: { id: true },
  })
  if (!saved) throw new NotFoundError('Saved unit not found')

  await prisma.leadSavedUnit.delete({ where: { id: saved.id } })
  return { success: true }
}

export async function getSavedUnits(actor: AuthUser, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: actor.organizationId,
      ...agentWhere(actor),
    },
    select: { id: true },
  })
  if (!lead) throw new NotFoundError('Lead not found')

  return prisma.leadSavedUnit.findMany({
    where: { leadId },
    select: {
      id: true,
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
    orderBy: { createdAt: 'desc' },
  })
}
