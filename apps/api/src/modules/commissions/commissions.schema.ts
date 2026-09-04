import { z } from 'zod'

const COMMISSION_STATUSES = ['PENDING', 'APPROVED', 'PAYABLE', 'PAID', 'CANCELLED'] as const

// ─── Commission Rule ──────────────────────────────────────────────────────────

export const createCommissionRuleSchema = z.object({
  name:        z.string().min(1).max(255),
  agentRate:   z.number().min(0).max(100),
  managerRate: z.number().min(0).max(100).default(0),
  isDefault:   z.boolean().default(false),
  conditions:  z.record(z.unknown()).default({}),
})

export type CreateCommissionRuleInput = z.infer<typeof createCommissionRuleSchema>

export const updateCommissionRuleSchema = createCommissionRuleSchema.partial()
export type UpdateCommissionRuleInput = z.infer<typeof updateCommissionRuleSchema>

// ─── Commission ───────────────────────────────────────────────────────────────

export const calculateCommissionSchema = z.object({
  dealId:         z.string().cuid(),
  commissionRuleId: z.string().cuid().optional(), // if omitted → use default rule
  agentRate:      z.number().min(0).max(100).optional(), // manual override
  managerRate:    z.number().min(0).max(100).optional(),
  notes:          z.string().max(2000).optional(),
})

export type CalculateCommissionInput = z.infer<typeof calculateCommissionSchema>

export const updateCommissionSchema = z.object({
  notes: z.string().max(2000).optional(),
})

export type UpdateCommissionInput = z.infer<typeof updateCommissionSchema>

export const updateCommissionStatusSchema = z.object({
  status: z.enum(COMMISSION_STATUSES),
  notes:  z.string().max(500).optional(),
})

export type UpdateCommissionStatusInput = z.infer<typeof updateCommissionStatusSchema>

export const listCommissionsQuerySchema = z.object({
  agentId:  z.string().cuid().optional(),
  dealId:   z.string().cuid().optional(),
  status:   z.enum(COMMISSION_STATUSES).optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(100).default(20),
})

export type ListCommissionsQuery = z.infer<typeof listCommissionsQuerySchema>

// ─── Commission Rule List ─────────────────────────────────────────────────────

export const listCommissionRulesQuerySchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type ListCommissionRulesQuery = z.infer<typeof listCommissionRulesQuerySchema>
