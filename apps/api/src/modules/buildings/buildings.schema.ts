import { z } from 'zod'

// ─── Create Building ──────────────────────────────────────────────────────────

export const CreateBuildingSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(120),
  buildingNumber: z.string().max(20).optional(),
  floorsCount: z.number().int().min(1).max(200).default(1),
  description: z.string().max(1000).optional(),
})

export type CreateBuildingInput = z.infer<typeof CreateBuildingSchema>

// ─── Update Building ──────────────────────────────────────────────────────────

export const UpdateBuildingSchema = CreateBuildingSchema.omit({ projectId: true }).partial()
export type UpdateBuildingInput = z.infer<typeof UpdateBuildingSchema>

// ─── List Buildings Query ─────────────────────────────────────────────────────

export const ListBuildingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  projectId: z.string().optional(),
  search: z.string().optional(),
})

export type ListBuildingsQuery = z.infer<typeof ListBuildingsQuerySchema>
