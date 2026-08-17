import { z } from 'zod'
import { ProjectStatus, PropertyType } from '../../lib/enums.js'

// ─── Create Project ───────────────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(120),
  developer: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  propertyType: z.nativeEnum(PropertyType).default('RESIDENTIAL'),
  status: z.nativeEnum(ProjectStatus).default('PLANNING'),

  // Location
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),

  // Pricing
  startingPrice: z.number().positive().optional(),

  // Meta
  amenities: z.array(z.string()).default([]),
  imageUrls: z.array(z.string().url()).default([]),
  videoUrls: z.array(z.string().url()).default([]),
  completionDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>

// ─── Update Project ───────────────────────────────────────────────────────────

export const UpdateProjectSchema = CreateProjectSchema.partial()
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>

// ─── List Projects Query ──────────────────────────────────────────────────────

export const ListProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(ProjectStatus).optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  search: z.string().optional(),
  city: z.string().optional(),
})

export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>
