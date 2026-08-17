import { z } from 'zod'
import { AuditAction } from '../../lib/enums.js'

export const listAuditLogsQuerySchema = z.object({
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  actorId:    z.string().cuid().optional(),
  entityType: z.string().optional(),
  entityId:   z.string().optional(),
  action:     z.nativeEnum(AuditAction).optional(),
  from:       z.coerce.date().optional(),
  to:         z.coerce.date().optional(),
})

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>
