import { z } from 'zod'

export const listNotificationsQuerySchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  isRead: z.coerce.boolean().optional(),
  type:   z.string().optional(),
})

export const markReadSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
})

export const createNotificationSchema = z.object({
  userId:  z.string().cuid(),
  type:    z.string(),
  title:   z.string().min(1).max(255),
  body:    z.string().max(1000).optional(),
  payload: z.record(z.unknown()).optional(),
})

export type ListNotificationsQuery  = z.infer<typeof listNotificationsQuerySchema>
export type MarkReadInput            = z.infer<typeof markReadSchema>
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
