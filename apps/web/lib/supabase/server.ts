/**
 * Supabase server client — for use in:
 * - Next.js Server Components
 * - Route Handlers (app/api/*)
 * - Middleware
 *
 * Uses @supabase/ssr which correctly reads/writes cookies in the
 * Next.js App Router context.
 *
 * NEVER import this in Client Components — use client.ts instead.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

const SUPABASE_URL      = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!

/**
 * Create a server-side Supabase client with cookie-based session handling.
 * Call once per request — do not cache the returned client across requests.
 *
 * Usage in Server Component:
 *   const supabase = await createSupabaseServerClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // In Server Components, cookie mutation happens via the response.
        // This is handled automatically by Next.js when using cookies() from next/headers.
        try {
          for (const { name, value, options } of cookiesToSet) {
            (cookieStore as unknown as ReadonlyRequestCookies & {
              set: (name: string, value: string, options: object) => void
            }).set(name, value, options)
          }
        } catch {
          // In Server Components, cookies can't be set directly.
          // This is fine — the middleware handles session refresh.
        }
      },
    },
  })
}

/**
 * Get the current authenticated user from the server-side session.
 * Returns null if not authenticated.
 *
 * Prefer this over getSession() — getUser() validates the token with
 * the Supabase Auth server rather than trusting the local JWT.
 */
export async function getServerUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}
