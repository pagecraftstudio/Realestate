import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { UserRole, Prisma } from '@prisma/client'
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
  ListCampaignsQuery,
} from './campaigns.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MARKETING_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN,
  UserRole.SALES_MANAGER, UserRole.MARKETING_MANAGER,
]

function assertMarketing(actor: AuthUser) {
  if (!MARKETING_ROLES.includes(actor.role as UserRole)) {
    throw new ForbiddenError('Insufficient permissions to manage campaigns')
  }
}

function campaignSelect() {
  return {
    id:            true,
    organizationId: true,
    name:          true,
    source:        true,
    description:   true,
    budget:        true,
    startDate:     true,
    endDate:       true,
    isActive:      true,
    metadata:      true,
    createdAt:     true,
    updatedAt:     true,
    _count: { select: { leads: true } },
  } as const
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function listCampaigns(actor: AuthUser, q: ListCampaignsQuery) {
  const where: Prisma.CampaignWhereInput = {
    organizationId: actor.organizationId,
    ...(q.source   !== undefined ? { source: q.source }     : {}),
    ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
    ...(q.search
      ? { name: { contains: q.search, mode: 'insensitive' } }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      select: campaignSelect(),
      orderBy: { createdAt: 'desc' },
      skip:  (q.page - 1) * q.limit,
      take:  q.limit,
    }),
    prisma.campaign.count({ where }),
  ])

  return {
    data,
    meta: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) },
  }
}

export async function getCampaign(actor: AuthUser, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: {
      ...campaignSelect(),
      leads: {
        select: {
          id: true, fullName: true, status: true, source: true, createdAt: true,
          assignedAgent: {
            select: { id: true, profile: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })
  if (!campaign) throw new NotFoundError('Campaign not found')
  return campaign
}

export async function createCampaign(actor: AuthUser, data: CreateCampaignInput) {
  assertMarketing(actor)
  return prisma.campaign.create({
    data: {
      organizationId: actor.organizationId,
      name:           data.name,
      source:         data.source,
      description:    data.description,
      budget:         data.budget,
      startDate:      data.startDate ? new Date(data.startDate) : undefined,
      endDate:        data.endDate   ? new Date(data.endDate)   : undefined,
      isActive:       data.isActive,
      metadata:       data.metadata as import('@prisma/client').Prisma.InputJsonValue | undefined,
    },
    select: campaignSelect(),
  })
}

export async function updateCampaign(actor: AuthUser, id: string, data: UpdateCampaignInput) {
  assertMarketing(actor)
  const existing = await prisma.campaign.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!existing) throw new NotFoundError('Campaign not found')

  return prisma.campaign.update({
    where:  { id },
    data: {
      ...(data.name        !== undefined ? { name: data.name }                 : {}),
      ...(data.source      !== undefined ? { source: data.source }             : {}),
      ...(data.description !== undefined ? { description: data.description }   : {}),
      ...(data.budget      !== undefined ? { budget: data.budget }             : {}),
      ...(data.startDate   !== undefined ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate     !== undefined ? { endDate: new Date(data.endDate) } : {}),
      ...(data.isActive    !== undefined ? { isActive: data.isActive }         : {}),
      ...(data.metadata    !== undefined ? { metadata: data.metadata as import('@prisma/client').Prisma.InputJsonValue } : {}),
    },
    select: campaignSelect(),
  })
}

export async function deleteCampaign(actor: AuthUser, id: string) {
  assertMarketing(actor)
  const existing = await prisma.campaign.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true, _count: { select: { leads: true } } },
  })
  if (!existing) throw new NotFoundError('Campaign not found')

  // Nullify campaign on associated leads instead of hard-delete to preserve history
  await prisma.lead.updateMany({
    where: { campaignId: id, organizationId: actor.organizationId },
    data:  { campaignId: null },
  })
  await prisma.campaign.delete({ where: { id } })
  return { success: true }
}

export async function getCampaignStats(actor: AuthUser, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!campaign) throw new NotFoundError('Campaign not found')

  const [byStatus, wonLeads, totalLeads] = await Promise.all([
    prisma.lead.groupBy({
      by: ['status'],
      where: { campaignId: id, organizationId: actor.organizationId },
      _count: { _all: true },
    }),
    prisma.lead.count({
      where: { campaignId: id, organizationId: actor.organizationId, status: 'WON' },
    }),
    prisma.lead.count({
      where: { campaignId: id, organizationId: actor.organizationId },
    }),
  ])

  return {
    total: totalLeads,
    won: wonLeads,
    conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
  }
}
