import { z } from 'zod'

const DEAL_STATUSES   = ['DRAFT','RESERVED','CONTRACTED','PARTIALLY_PAID','COMPLETED','CANCELLED'] as const
const PIPELINE_STAGES = [
  'NEW_LEAD','CONTACTED','QUALIFIED','PROPERTY_MATCHING',
  'VIEWING_SCHEDULED','VIEWING_COMPLETED','OFFER','NEGOTIATION',
  'RESERVATION','CONTRACT','CLOSED_WON','CLOSED_LOST',
] as const

// ─── Create ───────────────────────────────────────────────────────────────────

export const createDealSchema = z.object({
  customerId:        z.string().cuid(),
  unitId:            z.string().cuid(),
  managerId:         z.string().cuid().optional(),
  salePrice:         z.number().positive(),
  discount:          z.number().min(0).default(0),
  pipelineStage:     z.enum(PIPELINE_STAGES).optional(),
  contractDate:      z.string().datetime().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  probability:       z.number().int().min(0).max(100).optional(),
  notes:             z.string().max(2000).optional(),
  // Link to existing reservation to convert it
  reservationId:     z.string().cuid().optional(),
})

export type CreateDealInput = z.infer<typeof createDealSchema>

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateDealSchema = z.object({
  managerId:         z.string().cuid().optional(),
  salePrice:         z.number().positive().optional(),
  discount:          z.number().min(0).optional(),
  pipelineStage:     z.enum(PIPELINE_STAGES).optional(),
  contractDate:      z.string().datetime().optional(),
  closingDate:       z.string().datetime().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  probability:       z.number().int().min(0).max(100).optional(),
  notes:             z.string().max(2000).optional(),
})

export type UpdateDealInput = z.infer<typeof updateDealSchema>

// ─── Status transition ────────────────────────────────────────────────────────

export const updateDealStatusSchema = z.object({
  status:        z.enum(DEAL_STATUSES),
  pipelineStage: z.enum(PIPELINE_STAGES).optional(),
  reason:        z.string().max(500).optional(),
})

export type UpdateDealStatusInput = z.infer<typeof updateDealStatusSchema>

// ─── Pipeline stage ───────────────────────────────────────────────────────────

export const updatePipelineStageSchema = z.object({
  pipelineStage: z.enum(PIPELINE_STAGES),
  probability:   z.number().int().min(0).max(100).optional(),
})

export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>

// ─── List query ───────────────────────────────────────────────────────────────

export const listDealsQuerySchema = z.object({
  customerId:    z.string().cuid().optional(),
  unitId:        z.string().cuid().optional(),
  agentId:       z.string().cuid().optional(),
  managerId:     z.string().cuid().optional(),
  status:        z.enum(DEAL_STATUSES).optional().catch(undefined),
  pipelineStage: z.enum(PIPELINE_STAGES).optional(),
  page:          z.coerce.number().int().positive().default(1),
  limit:         z.coerce.number().int().positive().max(100).default(20),
})

export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>
