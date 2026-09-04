import { z } from 'zod'

export const CreateFloorSchema = z.object({
  buildingId: z.string().min(1),
  floorNumber: z.number().int().min(-10).max(500),
  label: z.string().max(60).optional(),
})
export type CreateFloorInput = z.infer<typeof CreateFloorSchema>

export const UpdateFloorSchema = z.object({
  label: z.string().max(60).optional(),
})
export type UpdateFloorInput = z.infer<typeof UpdateFloorSchema>
