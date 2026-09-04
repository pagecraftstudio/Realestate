import { z } from 'zod'
import { PropertyType, PurchasePurpose, FinancingPreference } from '@prisma/client'

// ─── Create Customer (standalone — not from lead conversion) ──────────────────

export const CreateCustomerSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  email: z.string().email().optional(),
  nationality: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  idNumber: z.string().max(100).optional(),

  // Assignment
  assignedAgentId: z.string().optional(),

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

  tags: z.array(z.string().max(50)).default([]),
  notes: z.string().max(5000).optional(),
})

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>

// ─── Update Customer ──────────────────────────────────────────────────────────

export const UpdateCustomerSchema = CreateCustomerSchema.partial()

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>

// ─── List Customers Query ─────────────────────────────────────────────────────

export const ListCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),

  assignedAgentId: z.string().optional(),
  search: z.string().optional(),

  // Budget range
  budgetMin: z.coerce.number().positive().optional(),
  budgetMax: z.coerce.number().positive().optional(),

  // Sort
  sortBy: z.enum(['createdAt', 'updatedAt', 'fullName']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export type ListCustomersQuery = z.infer<typeof ListCustomersQuerySchema>

// ─── Saved Units ──────────────────────────────────────────────────────────────

export const SaveUnitSchema = z.object({
  unitId: z.string().min(1),
  matchScore: z.number().int().min(0).max(100).optional(),
  matchReasons: z.array(z.string()).default([]),
})

export type SaveUnitInput = z.infer<typeof SaveUnitSchema>

// ─── Assign ───────────────────────────────────────────────────────────────────

export const AssignCustomerSchema = z.object({
  agentId: z.string().min(1),
})

export type AssignCustomerInput = z.infer<typeof AssignCustomerSchema>
