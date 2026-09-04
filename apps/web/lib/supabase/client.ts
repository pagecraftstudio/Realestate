/**
 * Supabase browser client.
 * Safe to import in Client Components and client-side code.
 *
 * Uses NEXT_PUBLIC_* env vars (anon key only — no service role here).
 */
import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL      = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Check apps/web/.env.example.',
  )
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

// Singleton for client-side use
let _client: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!_client) _client = createSupabaseBrowserClient()
  return _client
}
