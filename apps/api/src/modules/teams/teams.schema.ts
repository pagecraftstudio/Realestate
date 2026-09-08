import { z } from 'zod'

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
})
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>

export const AddTeamMemberSchema = z.object({
  userId: z.string(),
  isLead: z.boolean().default(false),
})
export type AddTeamMemberInput = z.infer<typeof AddTeamMemberSchema>

export const ListTeamsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})
export type ListTeamsQuery = z.infer<typeof ListTeamsQuerySchema>
