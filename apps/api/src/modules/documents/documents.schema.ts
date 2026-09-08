import { z } from 'zod'

export const RELATED_TYPES = ['LEAD', 'CUSTOMER', 'DEAL', 'RESERVATION', 'UNIT', 'PROJECT'] as const

// ─── Upload (multipart — metadata fields only; file handled by @fastify/multipart) ──

export const uploadDocumentSchema = z.object({
  relatedType: z.enum(RELATED_TYPES),
  relatedId:   z.string().cuid(),
  name:        z.string().min(1).max(255),
  notes:       z.string().max(1000).optional(),
})

// ─── List ──────────────────────────────────────────────────────────────────────

export const listDocumentsQuerySchema = z.object({
  page:        z.coerce.number().int().positive().default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  relatedType: z.enum(RELATED_TYPES).optional(),
  relatedId:   z.string().cuid().optional(),
})

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateDocumentSchema = z.object({
  name:  z.string().min(1).max(255).optional(),
  notes: z.string().max(1000).optional().nullable(),
})

// ─── Download URL params ──────────────────────────────────────────────────────

export const downloadQuerySchema = z.object({
  expiresIn: z.coerce.number().int().min(60).max(3600).default(900), // 15 min default
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadDocumentInput  = z.infer<typeof uploadDocumentSchema>
export type ListDocumentsQuery   = z.infer<typeof listDocumentsQuerySchema>
export type UpdateDocumentInput  = z.infer<typeof updateDocumentSchema>
export type DownloadQuery        = z.infer<typeof downloadQuerySchema>
