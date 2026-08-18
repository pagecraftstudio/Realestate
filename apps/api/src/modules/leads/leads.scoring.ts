import { prisma } from '../../lib/prisma.js'
import type { LeadTemperature } from '@prisma/client'

// ─── Default scoring signals ──────────────────────────────────────────────────
// These apply when no org-specific rules exist.

const DEFAULT_SIGNALS: Record<string, number> = {
  HAS_PHONE: 10,
  HAS_WHATSAPP: 10,
  HAS_EMAIL: 5,
  HAS_BUDGET: 10,
  STATUS_QUALIFIED: 15,
  STATUS_VIEWING_SCHEDULED: 15,
  STATUS_VIEWING_COMPLETED: 20,
  STATUS_NEGOTIATION: 20,
  STATUS_OFFER_CREATED: 20,
  STATUS_RESERVED: 30,
  TEMPERATURE_WARM: 10,
  TEMPERATURE_HOT: 20,
}

export function temperatureFromScore(score: number): LeadTemperature {
  if (score >= 60) return 'HOT'
  if (score >= 30) return 'WARM'
  return 'COLD'
}

interface LeadFields {
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  budgetMin?: unknown
  budgetMax?: unknown
  status: string
  temperature: string
}

export async function recalculateScore(
  organizationId: string,
  lead: LeadFields,
): Promise<{ score: number; temperature: LeadTemperature }> {
  // Load org-specific rules if any
  const orgRules = await prisma.leadScoringRule.findMany({
    where: { organizationId, isActive: true },
    select: { signal: true, points: true },
  })

  const signals: Record<string, number> =
    orgRules.length > 0
      ? Object.fromEntries(orgRules.map((r) => [r.signal, r.points]))
      : DEFAULT_SIGNALS

  function pts(signal: string): number {
    return signals[signal] ?? 0
  }

  let score = 0

  if (lead.phone) score += pts('HAS_PHONE')
  if (lead.whatsapp) score += pts('HAS_WHATSAPP')
  if (lead.email) score += pts('HAS_EMAIL')
  if (lead.budgetMin || lead.budgetMax) score += pts('HAS_BUDGET')

  switch (lead.status) {
    case 'QUALIFIED':           score += pts('STATUS_QUALIFIED'); break
    case 'VIEWING_SCHEDULED':   score += pts('STATUS_VIEWING_SCHEDULED'); break
    case 'VIEWING_COMPLETED':   score += pts('STATUS_VIEWING_COMPLETED'); break
    case 'NEGOTIATION':         score += pts('STATUS_NEGOTIATION'); break
    case 'RESERVED':            score += pts('STATUS_RESERVED'); break
  }

  switch (lead.temperature) {
    case 'WARM': score += pts('TEMPERATURE_WARM'); break
    case 'HOT':  score += pts('TEMPERATURE_HOT'); break
  }

  const temperature = temperatureFromScore(score)
  return { score, temperature }
}
