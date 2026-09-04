import { z } from 'zod'
import { UserRole, UserStatus } from '@prisma/client'

// ─── Invite User ──────────────────────────────────────────────────────────────

export const InviteUserSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole).refine(
    (r) => r !== UserRole.SUPER_ADMIN,
    'Cannot invite SUPER_ADMIN',
  ),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z.string().optional(),
  title: z.string().optional(),
  teamId: z.string().optional(),
  // Temporary password — must be changed on first login (future: magic link)
  temporaryPassword: z
    .string()
    .min(8)
    .max(72)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Need upper, lower, number'),
})

export type InviteUserInput = z.infer<typeof InviteUserSchema>

// ─── Update User ──────────────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

// ─── Update My Profile ────────────────────────────────────────────────────────

export const UpdateMyProfileSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
})

export type UpdateMyProfileInput = z.infer<typeof UpdateMyProfileSchema>

// ─── List Users Query ─────────────────────────────────────────────────────────

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: z.string().optional(),
  teamId: z.string().optional(),
})

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>
