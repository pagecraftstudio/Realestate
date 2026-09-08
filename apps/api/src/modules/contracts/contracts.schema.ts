import { z } from 'zod'

const CONTRACT_STATUSES = ['DRAFT','SENT','SIGNED','ACTIVE','COMPLETED','CANCELLED','EXPIRED'] as const
const CONTRACT_TYPES    = ['SALE','RENTAL','RESERVATION','OTHER'] as const

// ─── Create ───────────────────────────────────────────────────────────────────

export const createContractSchema = z.object({
  dealId:        z.string().cuid(),
  contractType:  z.enum(CONTRACT_TYPES).default('SALE'),
  contractDate:  z.string().datetime().optional(),
  handoverDate:  z.string().datetime().optional(),
  expiresAt:     z.string().datetime().optional(),
  totalValue:    z.number().positive(),
  currency:      z.string().length(3).default('AED'),
  terms:         z.string().max(10000).optional(),
  notes:         z.string().max(2000).optional(),
  documentUrl:   z.string().url().optional(),
})

export type CreateContractInput = z.infer<typeof createContractSchema>

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateContractSchema = z.object({
  contractDate:  z.string().datetime().optional(),
  handoverDate:  z.string().datetime().optional(),
  expiresAt:     z.string().datetime().optional(),
  totalValue:    z.number().positive().optional(),
  terms:         z.string().max(10000).optional(),
  notes:         z.string().max(2000).optional(),
  documentUrl:   z.string().url().optional(),
  signatureUrl:  z.string().url().optional(),
})

export type UpdateContractInput = z.infer<typeof updateContractSchema>

// ─── Status transition ────────────────────────────────────────────────────────

export const updateContractStatusSchema = z.object({
  status:  z.enum(CONTRACT_STATUSES),
  reason:  z.string().max(500).optional(),
})

export type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>

// ─── List query ───────────────────────────────────────────────────────────────

export const listContractsQuerySchema = z.object({
  customerId:    z.string().cuid().optional(),
  dealId:        z.string().cuid().optional(),
  agentId:       z.string().cuid().optional(),
  status:        z.enum(CONTRACT_STATUSES).optional(),
  contractType:  z.enum(CONTRACT_TYPES).optional(),
  page:          z.coerce.number().int().positive().default(1),
  limit:         z.coerce.number().int().positive().max(100).default(20),
})

export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>
