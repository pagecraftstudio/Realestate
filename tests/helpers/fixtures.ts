/**
 * tests/helpers/fixtures.ts
 *
 * Shared fixtures, factory helpers, and fetch wrappers used by
 * Phase L (security) and Phase M (regression) test suites.
 *
 * Requires the following env vars (set in tests/.env.test):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY
 *   API_BASE_URL          e.g. http://localhost:3001/api/v1
 *   TEST_ORG_A_EMAIL
 *   TEST_ORG_A_PASSWORD
 *   TEST_ORG_B_EMAIL
 *   TEST_ORG_B_PASSWORD
 */

import { createClient } from '@supabase/supabase-js'

// ─── Supabase admin (service-role) ───────────────────────────────────────────

export const supabaseAdmin = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export interface TestSession {
  accessToken: string
  userId:      string
  email:       string
}

export async function signIn(email: string, password: string): Promise<TestSession> {
  const supabase = createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_ANON_KEY']!,
  )
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error(`signIn failed for ${email}: ${error?.message}`)
  }
  return {
    accessToken: data.session.access_token,
    userId:      data.user.id,
    email:       data.user.email!,
  }
}

// ─── API fetch helper ─────────────────────────────────────────────────────────

const API_BASE = process.env['API_BASE_URL'] ?? 'http://localhost:3001/api/v1'

export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<Response> {
  const { token, ...rest } = options
  return fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  })
}

export async function apiGet(path: string, token: string) {
  return apiFetch(path, { method: 'GET', token })
}

export async function apiPost(path: string, body: unknown, token: string) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body), token })
}

export async function apiPatch(path: string, body: unknown, token: string) {
  return apiFetch(path, { method: 'PATCH', body: JSON.stringify(body), token })
}

export async function apiDelete(path: string, token: string) {
  return apiFetch(path, { method: 'DELETE', token })
}

// ─── ID lookup helpers ────────────────────────────────────────────────────────

/**
 * Fetch the first lead belonging to orgId via service-role.
 * Used to get IDs for cross-tenant access tests.
 */
export async function getFirstLeadId(orgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .single()
  return data?.id ?? null
}

export async function getFirstUnitId(orgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('units')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .single()
  return data?.id ?? null
}

export async function getFirstDealId(orgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('deals')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .single()
  return data?.id ?? null
}

export async function getFirstDocumentId(orgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .single()
  return data?.id ?? null
}

export async function getOrgIdForEmail(email: string): Promise<string | null> {
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)
  if (!authUser?.user) return null
  const { data } = await supabaseAdmin
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', authUser.user.id)
    .single()
  return data?.organization_id ?? null
}
