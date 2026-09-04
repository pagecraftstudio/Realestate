import { z } from 'zod'

// ─── Register Organization + First Admin ─────────────────────────────────────

export const RegisterOrgSchema = z.object({
  // Organization
  orgName: z.string().min(2).max(100),
  orgSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, numbers, hyphens only'),

  // Admin user
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number',
    ),
  phone: z.string().optional(),
})

export type RegisterOrgInput = z.infer<typeof RegisterOrgSchema>

// ─── Login ───────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type LoginInput = z.infer<typeof LoginSchema>

// ─── Refresh ─────────────────────────────────────────────────────────────────

export const RefreshSchema = z.object({
  refreshToken: z.string().optional(), // may come from cookie instead
})

export type RefreshInput = z.infer<typeof RefreshSchema>

// ─── Change Password ─────────────────────────────────────────────────────────

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(72)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number',
    ),
})

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
