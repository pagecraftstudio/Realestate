import { z } from 'zod'

// ─── Create (unit lock) ───────────────────────────────────────────────────────

export const createReservationSchema = z.object({
  unitId:            z.string().cuid(),
  customerId:        z.string().cuid(),
  offerId:           z.string().cuid().optional(),   // optional link to accepted offer
  expiresAt:         z.string().datetime().optional(),
  reservationAmount: z.number().positive().optional(),
  paymentStatus:     z.string().max(50).optional(),
  documentUrl:       z.string().url().optional(),
  notes:             z.string().max(2000).optional(),
})

export type CreateReservationInput = z.infer<typeof createReservationSchema>

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateReservationSchema = z.object({
  expiresAt:         z.string().datetime().optional(),
  reservationAmount: z.number().positive().optional(),
  paymentStatus:     z.string().max(50).optional(),
  documentUrl:       z.string().url().optional(),
  notes:             z.string().max(2000).optional(),
})

export type UpdateReservationInput = z.infer<typeof updateReservationSchema>

// ─── Cancel ───────────────────────────────────────────────────────────────────

export const cancelReservationSchema = z.object({
  reason: z.string().max(500).optional(),
})

export type CancelReservationInput = z.infer<typeof cancelReservationSchema>

// ─── List query ───────────────────────────────────────────────────────────────

export const listReservationsQuerySchema = z.object({
  customerId: z.string().cuid().optional(),
  unitId:     z.string().cuid().optional(),
  agentId:    z.string().cuid().optional(),
  status:     z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED', 'CONVERTED']).optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
})

export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>
