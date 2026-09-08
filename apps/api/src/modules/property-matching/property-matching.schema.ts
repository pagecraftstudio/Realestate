import { z } from 'zod'

const PROPERTY_TYPES    = ['RESIDENTIAL','COMMERCIAL','ADMINISTRATIVE','RETAIL','LAND','OTHER'] as const
const PURCHASE_PURPOSES = ['OWN_USE','INVESTMENT','RENTAL','RESALE','UNDECIDED'] as const
const FINANCING_PREFS   = ['CASH','MORTGAGE','INSTALLMENT','UNDECIDED'] as const
const MATCH_STATUSES    = ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'] as const

// ─── Run match ────────────────────────────────────────────────────────────────

export const runMatchSchema = z.object({
  leadId:            z.string().cuid().optional(),
  customerId:        z.string().cuid().optional(),
  // Override criteria (if not provided, pulled from lead/customer profile)
  budgetMin:         z.number().positive().optional(),
  budgetMax:         z.number().positive().optional(),
  propertyType:      z.enum(PROPERTY_TYPES).optional(),
  preferredLocation: z.string().max(200).optional(),
  bedrooms:          z.number().int().min(0).optional(),
  areaMin:           z.number().positive().optional(),
  areaMax:           z.number().positive().optional(),
  purpose:           z.enum(PURCHASE_PURPOSES).optional(),
  financing:         z.enum(FINANCING_PREFS).optional(),
  notes:             z.string().max(1000).optional(),
}).refine((d) => d.leadId || d.customerId, {
  message: 'Either leadId or customerId must be provided',
})

export type RunMatchInput = z.infer<typeof runMatchSchema>

// ─── Shortlist ────────────────────────────────────────────────────────────────

export const shortlistUnitSchema = z.object({
  unitId:       z.string().cuid(),
  isShortlisted: z.boolean(),
})

export type ShortlistUnitInput = z.infer<typeof shortlistUnitSchema>

// ─── List requests ────────────────────────────────────────────────────────────

export const listMatchRequestsQuerySchema = z.object({
  leadId:     z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  agentId:    z.string().cuid().optional(),
  status:     z.enum(MATCH_STATUSES).optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
})

export type ListMatchRequestsQuery = z.infer<typeof listMatchRequestsQuerySchema>
