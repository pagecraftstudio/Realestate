/**
 * Phase I — Frontend auth helpers (Supabase Auth)
 *
 * Replaces the old localStorage/custom-JWT pattern.
 * Login/logout go through Supabase browser client — no custom JWT storage.
 *
 * Access token for Fastify API calls is retrieved from the active Supabase
 * session (getSession().access_token) — no localStorage involvement.
 *
 * The authUser shape returned here is what the app uses internally.
 * It is populated from Supabase session + a /api/v1/auth/me call.
 */
import { getSupabaseBrowserClient } from './supabase/client'
import { api } from './api'

export interface AuthUser {
  id:             string
  email:          string
  role:           string
  organizationId: string
  profile?: {
    firstName: string | null
    lastName:  string | null
    avatarUrl: string | null
  }
}

export interface LoginInput {
  email:    string
  password: string
}

export interface RegisterInput {
  orgName:   string
  orgSlug:   string
  firstName: string
  lastName:  string
  email:     string
  password:  string
  phone?:    string
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(input: LoginInput): Promise<AuthUser> {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email:    input.email,
    password: input.password,
  })

  if (error || !data.session) {
    throw new Error(error?.message ?? 'Login failed')
  }

  // Fetch app user profile from Fastify
  const { data: me } = await api.get<AuthUser>('/api/v1/auth/me')
  return me
}

// ─── Register org ─────────────────────────────────────────────────────────────

export async function register(input: RegisterInput): Promise<void> {
  // Registration creates the org + Supabase Auth user server-side
  await api.post('/api/v1/auth/register', input)
  // Then sign in
  await login({ email: input.email, password: input.password })
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  await supabase.auth.signOut()
  // Optionally call Fastify to audit the logout
  await api.post('/api/v1/auth/logout').catch(() => { /* non-critical */ })
}

// ─── Get current user profile ─────────────────────────────────────────────────

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/api/v1/auth/me')
  return data
}

// ─── Get Supabase access token for Fastify API calls ─────────────────────────

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}
