import { z } from 'zod'
import { ViewingStatus } from '@prisma/client'

// ─── Create ───────────────────────────────────────────────────────────────────

export const CreateViewingSchema = z
  .object({
    // Subject — at least one of leadId / customerId required
    leadId:     z.string().cuid().optional(),
    customerId: z.string().cuid().optional(),
    unitId:     z.string().cuid().optional(),
    agentId:    z.string().cuid(),

    // Timing
    scheduledAt: z.string().datetime(),
    endAt:       z.string().datetime().optional(),

    // Meta
    location: z.string().max(500).optional(),
    notes:    z.string().max(2000).optional(),
  })
  .refine((d) => d.leadId || d.customerId, {
    message: 'Either leadId or customerId is required',
  })

export type CreateViewingInput = z.infer<typeof CreateViewingSchema>

// ─── Update ───────────────────────────────────────────────────────────────────

export const UpdateViewingSchema = z.object({
  unitId:   z.string().cuid().optional(),
  agentId:  z.string().cuid().optional(),

  scheduledAt: z.string().datetime().optional(),
  endAt:       z.string().datetime().optional(),
  location:    z.string().max(500).optional(),
  status:      z.nativeEnum(ViewingStatus).optional(),

  notes:            z.string().max(2000).optional(),
  customerFeedback: z.string().max(2000).optional(),
  agentFeedback:    z.string().max(2000).optional(),
  outcome:          z.string().max(500).optional(),
  nextAction:       z.string().max(500).optional(),
})

export type UpdateViewingInput = z.infer<typeof UpdateViewingSchema>

// ─── Complete (convenience) ───────────────────────────────────────────────────

export const CompleteViewingSchema = z.object({
  outcome:          z.string().min(1).max(500),
  nextAction:       z.string().max(500).optional(),
  agentFeedback:    z.string().max(2000).optional(),
  customerFeedback: z.string().max(2000).optional(),
})

export type CompleteViewingInput = z.infer<typeof CompleteViewingSchema>

// ─── List / calendar query ────────────────────────────────────────────────────

export const ListViewingsQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),

  agentId:    z.string().optional(),
  leadId:     z.string().optional(),
  customerId: z.string().optional(),
  unitId:     z.string().optional(),
  status:     z.nativeEnum(ViewingStatus).optional(),

  // Date window (ISO datetime strings)
  from: z.string().datetime().optional(),
  to:   z.string().datetime().optional(),

  // calendar=true → skip pagination, return all rows in window
  calendar: z.coerce.boolean().default(false),
})

export type ListViewingsQuery = z.infer<typeof ListViewingsQuerySchema>
