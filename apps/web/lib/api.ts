/**
 * Phase I — Axios API client (Supabase session-based auth)
 *
 * Token source: Supabase session (supabase.auth.getSession())
 * No localStorage involvement — Supabase manages cookie-based sessions.
 *
 * On 401: ask Supabase to refresh the session, retry once.
 * On refresh failure: sign out + redirect to /login.
 */
import axios, { type AxiosError } from 'axios'
import { getSupabaseBrowserClient } from './supabase/client'

export const api = axios.create({
  baseURL: '',  // API runs in same Next.js deployment — always same origin
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Helper: get Supabase browser client lazily ────────────────────────────────

function getSupabase() {
  return getSupabaseBrowserClient()
}

// ─── Request: attach Supabase access token ────────────────────────────────────

api.interceptors.request.use(async (config) => {
  if (typeof window === 'undefined') return config  // skip in SSR context
  if (config.headers['Authorization']) return config  // already set explicitly

  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers['Authorization'] = `Bearer ${session.access_token}`
  }

  return config
})

// ─── Response: auto-refresh on 401 ────────────────────────────────────────────

let refreshingPromise: Promise<string | null> | null = null

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true

      if (!refreshingPromise) {
        refreshingPromise = (async () => {
          const supabase = getSupabase()
          const { data, error: refreshErr } = await supabase.auth.refreshSession()
          if (refreshErr || !data.session) return null
          return data.session.access_token
        })().finally(() => { refreshingPromise = null })
      }

      try {
        const token = await refreshingPromise
        if (!token) throw new Error('Session expired')

        if (original?.headers) {
          original.headers['Authorization'] = `Bearer ${token}`
        }
        return api(original!)
      } catch {
        // Refresh failed — sign out + redirect
        const supabase = getSupabase()
        await supabase.auth.signOut()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

// ─── Typed error helper ────────────────────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: string })?.error ?? error.message
  }
  return 'An unexpected error occurred'
}
