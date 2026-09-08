import { z } from 'zod'

const LEAD_SOURCES = [
  'WEBSITE','FACEBOOK','INSTAGRAM','WHATSAPP','GOOGLE_ADS',
  'PROPERTY_PORTAL','REFERRAL','PHONE','WALK_IN','MANUAL','IMPORT','OTHER',
] as const

// ─── Create ───────────────────────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  name:        z.string().min(1).max(200),
  source:      z.enum(LEAD_SOURCES),
  description: z.string().max(2000).optional(),
  budget:      z.number().positive().optional(),
  startDate:   z.string().datetime().optional(),
  endDate:     z.string().datetime().optional(),
  isActive:    z.boolean().default(true),
  metadata:    z.record(z.unknown()).default({}),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateCampaignSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  source:      z.enum(LEAD_SOURCES).optional(),
  description: z.string().max(2000).optional(),
  budget:      z.number().positive().optional(),
  startDate:   z.string().datetime().optional(),
  endDate:     z.string().datetime().optional(),
  isActive:    z.boolean().optional(),
  metadata:    z.record(z.unknown()).optional(),
})

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>

// ─── List query ───────────────────────────────────────────────────────────────

export const listCampaignsQuerySchema = z.object({
  source:   z.enum(LEAD_SOURCES).optional(),
  isActive: z.coerce.boolean().optional(),
  search:   z.string().optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(100).default(20),
})

export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>
