/**
 * Server-side helpers for Next.js Route Handlers.
 * Replaces the Fastify authenticate middleware + Prisma query layer.
 * Uses Supabase service role for DB queries (bypasses RLS for server-to-server).
 */
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SUPABASE_URL      = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY  = process.env['SUPABASE_SERVICE_ROLE_KEY']!


// ─── Snake to camelCase transformer ──────────────────────────────────────────
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}


export function snakify<T>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map(snakify) as unknown as T
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/([A-Z])/g, '_$1').toLowerCase(),
        snakify(v),
      ])
    ) as T
  }
  return obj as T
}

export function camelize<T>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map(camelize) as unknown as T
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toCamel(k), camelize(v)])
    ) as T
  }
  return obj as T
}

// ─── Admin client (service role — server only) ─────────────────────────────
export function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─── Get authenticated user + org context ─────────────────────────────────
export interface AppUser {
  id:             string
  authUserId:     string
  email:          string
  role:           string
  organizationId: string
  profile:        { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null
}

export async function getAuthUser(): Promise<AppUser | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = getAdminClient()
  const { data: dbUser } = await admin
    .from('users')
    .select('id, email, role, organization_id, user_profiles(first_name, last_name, avatar_url)')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) return null

  // Single-company mode: use ORG_ID env var if set, otherwise use user's org
  const organizationId = process.env['ORG_ID'] ?? dbUser.organization_id

  const profile = (dbUser as any).user_profiles?.[0] ?? null
  return {
    id:             dbUser.id,
    authUserId:     user.id,
    email:          dbUser.email,
    role:           dbUser.role,
    organizationId,
    profile: profile ? {
      firstName: profile.first_name,
      lastName:  profile.last_name,
      avatarUrl: profile.avatar_url,
    } : null,
  }
}

// ─── Standard error responses ─────────────────────────────────────────────
export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export function notFound(msg = 'Not found') {
  return NextResponse.json({ error: msg }, { status: 404 })
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

export function conflict(msg: string) {
  return NextResponse.json({ error: msg }, { status: 409 })
}

export function serverError(err: unknown) {
  let msg: string
  if (err instanceof Error) {
    msg = err.message
  } else if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    msg = (e["message"] as string) ?? (e["details"] as string) ?? (e["hint"] as string) ?? (e["code"] as string) ?? JSON.stringify(err)
  } else {
    msg = String(err)
  }
  console.error('[api]', msg, JSON.stringify(err))
  return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 })
}

// ─── Pagination helper ────────────────────────────────────────────────────
export function paginate(url: URL) {
  const page  = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'))
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'))
  return { page, limit, from: (page - 1) * limit, to: (page - 1) * limit + limit - 1 }
}

export function paginatedResponse<T>(data: unknown[], total: number, page: number, limit: number) {
  return NextResponse.json({
    data: camelize<T[]>(data),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

// ─── RBAC check ───────────────────────────────────────────────────────────
const ROLE_WEIGHTS: Record<string, number> = {
  SUPER_ADMIN:        100,
  COMPANY_ADMIN:       90,
  SALES_MANAGER:       70,
  MARKETING_MANAGER:   60,
  ACCOUNTANT:          50,
  PROPERTY_MANAGER:    50,
  SALES_AGENT:         30,
  VIEWER:              10,
}

export function hasRole(user: AppUser, minRole: string): boolean {
  return (ROLE_WEIGHTS[user.role] ?? 0) >= (ROLE_WEIGHTS[minRole] ?? 0)
}
