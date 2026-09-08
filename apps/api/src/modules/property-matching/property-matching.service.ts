/**
 * Property Matching Engine
 *
 * Scores AVAILABLE units against a lead/customer's criteria.
 * Returns ranked results stored in property_match_results for later review.
 *
 * Scoring signals (max 100):
 *   Budget fit          0–30
 *   Property type       0–15
 *   Bedroom match       0–15
 *   Area match          0–15
 *   Location match      0–15
 *   Purpose/financing   0–10
 */

import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { UserRole, UnitStatus, Prisma } from '@prisma/client'
import type {
  RunMatchInput,
  ShortlistUnitInput,
  ListMatchRequestsQuery,
} from './property-matching.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

interface Criteria {
  budgetMin?:         number | null
  budgetMax?:         number | null
  propertyType?:      string | null
  preferredLocation?: string | null
  bedrooms?:          number | null
  areaMin?:           number | null
  areaMax?:           number | null
  purpose?:           string | null
  financing?:         string | null
}

interface UnitCandidate {
  id:           string
  unitType:     string
  status:       string
  price:        { toNumber: () => number } | null
  area:         { toNumber: () => number } | null
  bedrooms:     number | null
  floor: { building: { project: { propertyType: string; city: string | null; address: string | null } } } | null
  project: { propertyType: string; city: string | null; address: string | null } | null
  building: { project: { propertyType: string; city: string | null; address: string | null } } | null
}

function toNum(v: { toNumber: () => number } | null | undefined): number | null {
  if (!v) return null
  return v.toNumber()
}

function scoreUnit(unit: UnitCandidate, c: Criteria): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  const price   = toNum(unit.price)
  const area    = toNum(unit.area)

  // ── Budget (30 pts) ───────────────────────────────────────────────────────
  if (price !== null && (c.budgetMin || c.budgetMax)) {
    const min = c.budgetMin ?? 0
    const max = c.budgetMax ?? Infinity

    if (price >= min && price <= max) {
      score += 30
      reasons.push('Within budget range')
    } else if (price < min) {
      // Below budget: partial — could be good value
      score += 10
      reasons.push('Below minimum budget (good value)')
    } else {
      // Over budget — proportional penalty
      const overage = (price - max) / max
      if (overage < 0.1) { score += 15; reasons.push('Slightly over budget (<10%)') }
      else if (overage < 0.2) { score += 5; reasons.push('Over budget (10–20%)') }
    }
  }

  // ── Property type (15 pts) ────────────────────────────────────────────────
  if (c.propertyType) {
    const pt = unit.project?.propertyType ?? unit.building?.project?.propertyType ?? unit.floor?.building?.project?.propertyType
    if (pt === c.propertyType) {
      score += 15
      reasons.push(`Property type matches: ${c.propertyType}`)
    }
  }

  // ── Bedrooms (15 pts) ────────────────────────────────────────────────────
  if (c.bedrooms != null && unit.bedrooms != null) {
    if (unit.bedrooms === c.bedrooms) {
      score += 15
      reasons.push(`Exact bedroom match: ${c.bedrooms}`)
    } else if (Math.abs(unit.bedrooms - c.bedrooms) === 1) {
      score += 8
      reasons.push(`Near bedroom match: ${unit.bedrooms} vs desired ${c.bedrooms}`)
    }
  }

  // ── Area (15 pts) ─────────────────────────────────────────────────────────
  if (area !== null) {
    const aMin = c.areaMin ?? 0
    const aMax = c.areaMax ?? Infinity
    if (area >= aMin && area <= aMax) {
      score += 15
      reasons.push(`Area within range: ${area} m²`)
    } else if (area > aMax && (area - aMax) / aMax < 0.15) {
      score += 8
      reasons.push(`Area slightly above max: ${area} m²`)
    } else if (area < aMin && (aMin - area) / aMin < 0.15) {
      score += 8
      reasons.push(`Area slightly below min: ${area} m²`)
    }
  }

  // ── Location (15 pts) ─────────────────────────────────────────────────────
  if (c.preferredLocation) {
    const loc = (
      unit.project?.city ??
      unit.project?.address ??
      unit.building?.project?.city ??
      unit.floor?.building?.project?.city ?? ''
    ).toLowerCase()
    const desired = c.preferredLocation.toLowerCase()
    if (loc.includes(desired) || desired.includes(loc)) {
      score += 15
      reasons.push(`Location match: ${c.preferredLocation}`)
    }
  }

  // ── Purpose/Financing (10 pts) ────────────────────────────────────────────
  // Both signals together or individually
  if (c.purpose && c.purpose !== 'UNDECIDED') { score += 5; reasons.push(`Purpose: ${c.purpose}`) }
  if (c.financing && c.financing !== 'UNDECIDED') { score += 5; reasons.push(`Financing: ${c.financing}`) }

  return { score: Math.min(score, 100), reasons }
}

// ─── Selects ─────────────────────────────────────────────────────────────────

function matchRequestSelect() {
  return {
    id:                true,
    organizationId:    true,
    leadId:            true,
    customerId:        true,
    agentId:           true,
    status:            true,
    budgetMin:         true,
    budgetMax:         true,
    propertyType:      true,
    preferredLocation: true,
    bedrooms:          true,
    areaMin:           true,
    areaMax:           true,
    purpose:           true,
    financing:         true,
    notes:             true,
    createdAt:         true,
    updatedAt:         true,
    lead:     { select: { id: true, fullName: true, status: true, source: true } },
    customer: { select: { id: true, fullName: true, phone: true, email: true } },
    agent: {
      select: { id: true, userProfile: { select: { firstName: true, lastName: true } } },
    },
    results: {
      select: {
        id: true, score: true, reasons: true, isShortlisted: true,
        unit: {
          select: {
            id: true, unitNumber: true, unitType: true, status: true,
            price: true, area: true, bedrooms: true,
            project:  { select: { id: true, name: true, propertyType: true, city: true } },
            building: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { score: 'desc' },
    },
  } as const
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function runMatch(actor: AuthUser, data: RunMatchInput) {
  // Resolve criteria from lead/customer if not overridden
  let criteria: Criteria = {
    budgetMin:         data.budgetMin,
    budgetMax:         data.budgetMax,
    propertyType:      data.propertyType,
    preferredLocation: data.preferredLocation,
    bedrooms:          data.bedrooms,
    areaMin:           data.areaMin,
    areaMax:           data.areaMax,
    purpose:           data.purpose,
    financing:         data.financing,
  }

  if (data.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: data.leadId, organizationId: actor.organizationId },
      select: {
        budgetMin: true, budgetMax: true, preferredType: true,
        preferredLocation: true, bedrooms: true, areaMin: true, areaMax: true,
        purchasePurpose: true, financingPref: true,
      },
    })
    if (!lead) throw new NotFoundError('Lead not found')

    // Merge: explicit overrides take priority, fall back to lead profile
    criteria = {
      budgetMin:         data.budgetMin         ?? toNum(lead.budgetMin),
      budgetMax:         data.budgetMax         ?? toNum(lead.budgetMax),
      propertyType:      data.propertyType      ?? lead.preferredType,
      preferredLocation: data.preferredLocation ?? lead.preferredLocation,
      bedrooms:          data.bedrooms          ?? lead.bedrooms,
      areaMin:           data.areaMin           ?? toNum(lead.areaMin),
      areaMax:           data.areaMax           ?? toNum(lead.areaMax),
      purpose:           data.purpose           ?? lead.purchasePurpose,
      financing:         data.financing         ?? lead.financingPref,
    }
  }

  if (data.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: actor.organizationId },
      select: {
        budgetMin: true, budgetMax: true, preferredType: true,
        preferredLocation: true, bedrooms: true, areaMin: true, areaMax: true,
        purchasePurpose: true, financingPref: true,
      },
    })
    if (!customer) throw new NotFoundError('Customer not found')

    criteria = {
      budgetMin:         data.budgetMin         ?? toNum(customer.budgetMin),
      budgetMax:         data.budgetMax         ?? toNum(customer.budgetMax),
      propertyType:      data.propertyType      ?? customer.preferredType,
      preferredLocation: data.preferredLocation ?? customer.preferredLocation,
      bedrooms:          data.bedrooms          ?? customer.bedrooms,
      areaMin:           data.areaMin           ?? toNum(customer.areaMin),
      areaMax:           data.areaMax           ?? toNum(customer.areaMax),
      purpose:           data.purpose           ?? customer.purchasePurpose,
      financing:         data.financing         ?? customer.financingPref,
    }
  }

  // Fetch available units in this org
  const units = await prisma.unit.findMany({
    where: {
      organizationId: actor.organizationId,
      status: UnitStatus.AVAILABLE,
    },
    select: {
      id: true, unitType: true, status: true, price: true, area: true, bedrooms: true,
      project:  { select: { propertyType: true, city: true, address: true } },
      building: { select: { project: { select: { propertyType: true, city: true, address: true } } } },
      floor:    { select: { building: { select: { project: { select: { propertyType: true, city: true, address: true } } } } } },
    },
  })

  // Score each unit
  const scored = units
    .map((u) => ({ unit: u, ...scoreUnit(u as UnitCandidate, criteria) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20) // top 20 results

  // Create match request + results in transaction
  const matchRequest = await prisma.$transaction(async (tx) => {
    const req = await tx.propertyMatchRequest.create({
      data: {
        organizationId:    actor.organizationId,
        leadId:            data.leadId,
        customerId:        data.customerId,
        agentId:           actor.id,
        status:            'COMPLETED',
        budgetMin:         criteria.budgetMin,
        budgetMax:         criteria.budgetMax,
        propertyType:      criteria.propertyType as any,
        preferredLocation: criteria.preferredLocation,
        bedrooms:          criteria.bedrooms,
        areaMin:           criteria.areaMin,
        areaMax:           criteria.areaMax,
        purpose:           criteria.purpose as any,
        financing:         criteria.financing as any,
        notes:             data.notes,
      },
    })

    if (scored.length > 0) {
      await tx.propertyMatchResult.createMany({
        data: scored.map((r) => ({
          matchRequestId: req.id,
          unitId:         r.unit.id,
          score:          r.score,
          reasons:        r.reasons,
          isShortlisted:  false,
        })),
        skipDuplicates: true,
      })
    }

    return req
  })

  // Return full request with results
  return prisma.propertyMatchRequest.findUnique({
    where:  { id: matchRequest.id },
    select: matchRequestSelect(),
  })
}

export async function listMatchRequests(actor: AuthUser, q: ListMatchRequestsQuery) {
  const agentScope = actor.role === UserRole.SALES_AGENT ? { agentId: actor.id } : {}

  const where: Prisma.PropertyMatchRequestWhereInput = {
    organizationId: actor.organizationId,
    ...agentScope,
    ...(q.leadId     ? { leadId:     q.leadId }     : {}),
    ...(q.customerId ? { customerId: q.customerId } : {}),
    ...(q.agentId    ? { agentId:    q.agentId }    : {}),
    ...(q.status     ? { status:     q.status as any } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.propertyMatchRequest.findMany({
      where,
      select: matchRequestSelect(),
      orderBy: { createdAt: 'desc' },
      skip:  (q.page - 1) * q.limit,
      take:  q.limit,
    }),
    prisma.propertyMatchRequest.count({ where }),
  ])

  return {
    data,
    meta: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) },
  }
}

export async function getMatchRequest(actor: AuthUser, id: string) {
  const agentScope = actor.role === UserRole.SALES_AGENT ? { agentId: actor.id } : {}
  const req = await prisma.propertyMatchRequest.findFirst({
    where:  { id, organizationId: actor.organizationId, ...agentScope },
    select: matchRequestSelect(),
  })
  if (!req) throw new NotFoundError('Match request not found')
  return req
}

export async function shortlistUnit(
  actor: AuthUser,
  matchRequestId: string,
  data: ShortlistUnitInput,
) {
  const req = await prisma.propertyMatchRequest.findFirst({
    where: { id: matchRequestId, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!req) throw new NotFoundError('Match request not found')

  return prisma.propertyMatchResult.update({
    where: { matchRequestId_unitId: { matchRequestId, unitId: data.unitId } },
    data:  { isShortlisted: data.isShortlisted },
  })
}
