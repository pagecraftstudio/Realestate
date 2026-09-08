/**
 * Supabase browser client.
 * Safe to import in Client Components and client-side code.
 *
 * Uses NEXT_PUBLIC_* env vars (anon key only — no service role here).
 */
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  const url     = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Check apps/web/.env.example.',
    )
  }
  return createBrowserClient(url, anonKey)
}

// Singleton for client-side use
let _client: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!_client) _client = createSupabaseBrowserClient()
  return _client
}
