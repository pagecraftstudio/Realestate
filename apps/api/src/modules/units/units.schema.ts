import { z } from 'zod'
import { UnitStatus, UnitType, PropertyType, UnitFinishing } from '../../lib/enums.js'

// ─── Create Unit ──────────────────────────────────────────────────────────────

export const CreateUnitSchema = z.object({
  projectId: z.string().min(1),
  buildingId: z.string().optional(),
  floorId: z.string().optional(),

  unitNumber: z.string().min(1).max(30),
  unitType: z.nativeEnum(UnitType).default('APARTMENT'),
  propertyType: z.nativeEnum(PropertyType).default('RESIDENTIAL'),

  // Specs
  area: z.number().positive().optional(),
  builtUpArea: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  parking: z.number().int().min(0).default(0),
  view: z.string().max(100).optional(),
  orientation: z.string().max(100).optional(),
  finishing: z.nativeEnum(UnitFinishing).default('UNFINISHED'),

  // Pricing
  price: z.number().positive(),
  pricePerMeter: z.number().positive().optional(),
  serviceCharge: z.number().positive().optional(),

  // Meta
  imageUrls: z.array(z.string().url()).default([]),
  deliveryDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
})

export type CreateUnitInput = z.infer<typeof CreateUnitSchema>

// ─── Update Unit ──────────────────────────────────────────────────────────────

export const UpdateUnitSchema = CreateUnitSchema
  .omit({ projectId: true })
  .partial()
  .extend({
    status: z.nativeEnum(UnitStatus).optional(),
  })

export type UpdateUnitInput = z.infer<typeof UpdateUnitSchema>

// ─── List Units Query ─────────────────────────────────────────────────────────

export const ListUnitsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  projectId: z.string().optional(),
  buildingId: z.string().optional(),
  floorId: z.string().optional(),
  status: z.nativeEnum(UnitStatus).optional(),
  unitType: z.nativeEnum(UnitType).optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  finishing: z.nativeEnum(UnitFinishing).optional(),
  search: z.string().optional(),

  // Price range
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),

  // Area range
  minArea: z.coerce.number().positive().optional(),
  maxArea: z.coerce.number().positive().optional(),

  // Bedrooms
  bedrooms: z.coerce.number().int().min(0).optional(),
})

export type ListUnitsQuery = z.infer<typeof ListUnitsQuerySchema>

// ─── Bulk Status Update ───────────────────────────────────────────────────────

export const BulkUpdateStatusSchema = z.object({
  unitIds: z.array(z.string()).min(1).max(100),
  status: z.nativeEnum(UnitStatus),
})

export type BulkUpdateStatusInput = z.infer<typeof BulkUpdateStatusSchema>
