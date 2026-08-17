import { z } from 'zod'
import {
  LeadStatus,
  LeadSource,
  LeadTemperature,
  PropertyType,
  PurchasePurpose,
  FinancingPreference,
  UserRole,
} from '../../lib/enums.js'

// ─── Create Lead ──────────────────────────────────────────────────────────────

export const CreateLeadSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  email: z.string().email().optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),

  source: z.nativeEnum(LeadSource).default('MANUAL'),
  campaignId: z.string().optional(),

  // Assignment
  assignedAgentId: z.string().optional(),
  teamId: z.string().optional(),

  // Status
  status: z.nativeEnum(LeadStatus).default('NEW'),
  temperature: z.nativeEnum(LeadTemperature).default('COLD'),

  // Requirements
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  preferredType: z.nativeEnum(PropertyType).optional(),
  preferredLocation: z.string().max(200).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  areaMin: z.number().positive().optional(),
  areaMax: z.number().positive().optional(),
  purchasePurpose: z.nativeEnum(PurchasePurpose).optional(),
  financingPref: z.nativeEnum(FinancingPreference).optional(),

  // Meta
  tags: z.array(z.string().max(50)).default([]),
  notes: z.string().max(5000).optional(),
  nextFollowupAt: z.string().datetime().optional(),
})

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>

// ─── Update Lead ──────────────────────────────────────────────────────────────

export const UpdateLeadSchema = CreateLeadSchema.partial().extend({
  isArchived: z.boolean().optional(),
  leadScore: z.number().int().min(0).max(1000).optional(),
  lastContactedAt: z.string().datetime().optional(),
})

export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>

// ─── Assign Lead ──────────────────────────────────────────────────────────────

export const AssignLeadSchema = z.object({
  agentId: z.string().min(1),
  teamId: z.string().optional(),
})

export type AssignLeadInput = z.infer<typeof AssignLeadSchema>

// ─── List Leads Query ─────────────────────────────────────────────────────────

export const ListLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),

  // Filters
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  temperature: z.nativeEnum(LeadTemperature).optional(),
  assignedAgentId: z.string().optional(),
  teamId: z.string().optional(),
  campaignId: z.string().optional(),
  isArchived: z.coerce.boolean().optional(),

  // Search
  search: z.string().optional(),

  // Budget range
  budgetMin: z.coerce.number().positive().optional(),
  budgetMax: z.coerce.number().positive().optional(),

  // Date range (nextFollowupAt)
  followupFrom: z.string().datetime().optional(),
  followupTo: z.string().datetime().optional(),

  // Sort
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'leadScore', 'nextFollowupAt', 'fullName'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export type ListLeadsQuery = z.infer<typeof ListLeadsQuerySchema>

// ─── Add Activity ─────────────────────────────────────────────────────────────

export const AddActivitySchema = z.object({
  type: z.enum([
    'NOTE_ADDED',
    'CALL_LOGGED',
    'EMAIL_SENT',
    'WHATSAPP_SENT',
    'STATUS_CHANGED',
    'ASSIGNED',
    'SCORE_UPDATED',
    'FOLLOWUP_SET',
    'VIEWING_SCHEDULED',
    'OFFER_MADE',
    'CUSTOM',
  ]),
  payload: z.record(z.unknown()).default({}),
})

export type AddActivityInput = z.infer<typeof AddActivitySchema>

// ─── Scoring ──────────────────────────────────────────────────────────────────

export const RecalculateScoreSchema = z.object({
  leadId: z.string().min(1),
})

// ─── Convert Lead → Customer ──────────────────────────────────────────────────

export const ConvertLeadSchema = z.object({
  fullName: z.string().min(1).max(200).optional(), // override name if needed
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  nationality: z.string().max(100).optional(),
})

export type ConvertLeadInput = z.infer<typeof ConvertLeadSchema>

// ─── Saved Units ──────────────────────────────────────────────────────────────

export const SaveUnitSchema = z.object({
  unitId: z.string().min(1),
})

export type SaveUnitInput = z.infer<typeof SaveUnitSchema>
