import { z } from 'zod'

const CHANNELS   = ['WHATSAPP', 'EMAIL', 'PHONE', 'IN_PERSON', 'SMS', 'OTHER'] as const
const DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const

// ─── Log a manual communication ──────────────────────────────────────────────
export const logCommunicationSchema = z.object({
  leadId:         z.string().cuid().optional(),
  customerId:     z.string().cuid().optional(),
  channel:        z.enum(CHANNELS),
  direction:      z.enum(DIRECTIONS),
  subject:        z.string().max(255).optional(),
  content:        z.string().max(5000).optional(),
  attachmentUrls: z.array(z.string().url()).default([]),
  metadata:       z.record(z.unknown()).default({}),
  sentAt:         z.string().datetime().optional(),
}).refine(d => d.leadId || d.customerId, {
  message: 'Either leadId or customerId is required',
})

// ─── List / filter ───────────────────────────────────────────────────────────
export const listCommunicationsQuerySchema = z.object({
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  leadId:     z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  channel:    z.enum(CHANNELS).optional(),
  direction:  z.enum(DIRECTIONS).optional(),
})

// ─── Send WhatsApp (outbound) ─────────────────────────────────────────────────
export const sendWhatsAppTextSchema = z.object({
  to:         z.string().min(7).max(20),   // E.164 phone number
  message:    z.string().min(1).max(4096),
  leadId:     z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
}).refine(d => d.leadId || d.customerId, {
  message: 'Either leadId or customerId is required',
})

export const sendWhatsAppTemplateSchema = z.object({
  to:           z.string().min(7).max(20),
  templateName: z.string().min(1),
  languageCode: z.string().default('en'),
  components:   z.array(z.unknown()).optional(),
  leadId:       z.string().cuid().optional(),
  customerId:   z.string().cuid().optional(),
}).refine(d => d.leadId || d.customerId, {
  message: 'Either leadId or customerId is required',
})

// ─── Webhook verify challenge ─────────────────────────────────────────────────
export const webhookChallengeQuerySchema = z.object({
  'hub.mode':         z.string().optional(),
  'hub.verify_token': z.string().optional(),
  'hub.challenge':    z.string().optional(),
})

export type LogCommunicationInput     = z.infer<typeof logCommunicationSchema>
export type ListCommunicationsQuery   = z.infer<typeof listCommunicationsQuerySchema>
export type SendWhatsAppTextInput     = z.infer<typeof sendWhatsAppTextSchema>
export type SendWhatsAppTemplateInput = z.infer<typeof sendWhatsAppTemplateSchema>
