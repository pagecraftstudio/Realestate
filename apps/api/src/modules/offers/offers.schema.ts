import { z } from 'zod'

// ─── Create ───────────────────────────────────────────────────────────────────

export const createOfferSchema = z.object({
  leadId:           z.string().cuid().optional(),
  customerId:       z.string().cuid().optional(),
  unitId:           z.string().cuid(),
  offeredPrice:     z.number().positive(),
  downPayment:      z.number().positive().optional(),
  installmentCount: z.number().int().positive().optional(),
  paymentNotes:     z.string().max(1000).optional(),
  expiresAt:        z.string().datetime().optional(),
  notes:            z.string().max(2000).optional(),
}).refine(d => d.leadId || d.customerId, {
  message: 'Either leadId or customerId is required',
})

export type CreateOfferInput = z.infer<typeof createOfferSchema>

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateOfferSchema = z.object({
  offeredPrice:     z.number().positive().optional(),
  downPayment:      z.number().positive().optional(),
  installmentCount: z.number().int().positive().optional(),
  paymentNotes:     z.string().max(1000).optional(),
  expiresAt:        z.string().datetime().optional(),
  notes:            z.string().max(2000).optional(),
})

export type UpdateOfferInput = z.infer<typeof updateOfferSchema>

// ─── Status transition ────────────────────────────────────────────────────────

export const updateOfferStatusSchema = z.object({
  status: z.enum(['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN']),
})

export type UpdateOfferStatusInput = z.infer<typeof updateOfferStatusSchema>

// ─── List query ───────────────────────────────────────────────────────────────

export const listOffersQuerySchema = z.object({
  leadId:     z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  unitId:     z.string().cuid().optional(),
  agentId:    z.string().cuid().optional(),
  status:     z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN']).optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
})

export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>
