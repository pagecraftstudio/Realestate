import { z } from 'zod'

export const createTaskSchema = z.object({
  assigneeId:  z.string().cuid(),
  relatedType: z.enum(['LEAD', 'CUSTOMER', 'DEAL', 'VIEWING']).optional(),
  relatedId:   z.string().cuid().optional(),
  title:       z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueAt:       z.string().datetime().optional(),
})

export const updateTaskSchema = z.object({
  assigneeId:  z.string().cuid().optional(),
  title:       z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status:      z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  dueAt:       z.string().datetime().optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'At least one field required' })

export const listTasksQuerySchema = z.object({
  page:        z.coerce.number().int().positive().default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  assigneeId:  z.string().cuid().optional(),
  status:      z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  relatedType: z.enum(['LEAD', 'CUSTOMER', 'DEAL', 'VIEWING']).optional(),
  relatedId:   z.string().cuid().optional(),
  overdue:     z.coerce.boolean().optional(),
  dueBefore:   z.string().datetime().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type ListTasksQuery  = z.infer<typeof listTasksQuerySchema>
