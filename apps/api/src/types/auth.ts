import type { UserRole } from '@prisma/client'

// ─── Legacy JWT payloads (kept for reference only) ────────────────────────────

export interface JwtAccessPayload {
  sub: string
  jti: string
  orgId: string
  role: UserRole
  iat?: number
  exp?: number
}

export interface JwtRefreshPayload {
  sub: string
  jti: string
  type: 'refresh'
  iat?: number
  exp?: number
}

// ─── AuthUser — unified shape used throughout Fastify services ────────────────
//
// authenticate middleware sets request.authUser with this shape.
// All services receive this as `actor`.
//
// Fields:
//   id             — app users.id (cuid) — primary field for all DB operations
//   userId         — alias for id (backward compat with Phase E naming)
//   organizationId — tenant scope
//   role           — RBAC role
//   supabaseUid    — auth.users UUID (Supabase Auth identity)

export interface AuthUser {
  id:             string   // canonical — use this in services
  userId:         string   // alias = id (same value)
  organizationId: string
  role:           UserRole
  supabaseUid:    string
  /** @deprecated legacy only */
  jti?:           string
}

export interface RequestAuthUser extends AuthUser {}
