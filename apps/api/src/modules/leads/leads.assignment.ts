import { prisma } from '../../lib/prisma.js'
import { UserRole, UserStatus } from '../../lib/enums.js'

// ─── Round-robin state stored in org settings JSON ───────────────────────────

interface OrgSettings {
  rrIndex?: number
  [key: string]: unknown
}

async function getRRIndex(organizationId: string): Promise<number> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  })
  const settings = (org?.settings ?? {}) as OrgSettings
  return settings.rrIndex ?? 0
}

async function advanceRRIndex(organizationId: string, next: number) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  })
  const settings = (org?.settings ?? {}) as OrgSettings
  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: { ...settings, rrIndex: next } },
  })
}

// ─── Get active agents in org (or team) ──────────────────────────────────────

async function getActiveAgents(organizationId: string, teamId?: string) {
  return prisma.user.findMany({
    where: {
      organizationId,
      role: UserRole.SALES_AGENT,
      status: UserStatus.ACTIVE,
      ...(teamId
        ? { teamMemberships: { some: { teamId } } }
        : {}),
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
}

// ─── Strategy: Round Robin ────────────────────────────────────────────────────

async function roundRobin(organizationId: string, teamId?: string): Promise<string | null> {
  const agents = await getActiveAgents(organizationId, teamId)
  if (agents.length === 0) return null

  const idx = await getRRIndex(organizationId)
  const selected = agents[idx % agents.length]
  if (!selected) return null
  await advanceRRIndex(organizationId, idx + 1)
  return selected.id
}

// ─── Strategy: Least Active Leads ────────────────────────────────────────────

async function leastActiveLeads(organizationId: string, teamId?: string): Promise<string | null> {
  const agents = await getActiveAgents(organizationId, teamId)
  if (agents.length === 0) return null

  const counts = await prisma.lead.groupBy({
    by: ['assignedAgentId'],
    where: {
      organizationId,
      assignedAgentId: { in: agents.map((a) => a.id) },
      status: {
        notIn: ['WON', 'LOST'],
      },
      isArchived: false,
    },
    _count: { assignedAgentId: true },
  })

  const countMap = new Map(counts.map((c) => [c.assignedAgentId!, c._count.assignedAgentId ?? 0]))

  // Sort agents by active lead count ascending, pick the least loaded
  const sorted = agents.sort((a, b) => ((countMap.get(a.id) ?? 0) as number) - ((countMap.get(b.id) ?? 0) as number))
  return sorted[0]?.id ?? null
}

// ─── Public: auto-assign ──────────────────────────────────────────────────────

export async function autoAssign(
  organizationId: string,
  teamId?: string,
): Promise<string | null> {
  // Check if org has an active assignment rule
  const rule = await prisma.assignmentRule.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { priority: 'desc' },
    select: { strategy: true, teamId: true },
  })

  const effectiveTeamId = teamId ?? rule?.teamId ?? undefined
  const strategy = rule?.strategy ?? 'ROUND_ROBIN'

  switch (strategy) {
    case 'LEAST_ACTIVE_LEADS':
      return leastActiveLeads(organizationId, effectiveTeamId)
    case 'ROUND_ROBIN':
    default:
      return roundRobin(organizationId, effectiveTeamId)
  }
}
