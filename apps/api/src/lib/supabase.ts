/**
 * Supabase Admin Client — SERVER ONLY (Fastify backend).
 *
 * Uses the SERVICE ROLE KEY which bypasses RLS.
 * NEVER expose this key or this client to the browser.
 *
 * Usage:
 *   import { supabaseAdmin, supabaseStorage } from './supabase.js'
 *
 * This client is used for:
 * - Auth admin operations (create user, verify JWT, get user by ID)
 * - Storage operations (upload, delete, sign URLs) from the server
 * - Any operation that must bypass RLS (e.g. SUPER_ADMIN cross-tenant ops)
 *
 * For per-user DB queries, Prisma remains the query layer (it uses the
 * DATABASE_URL which connects to Supabase PostgreSQL as the postgres superuser
 * in development, or via the service role pooler in production).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─── Lazy singleton — do NOT read env vars or throw at module load time ───────
// Reading env vars at module level means the throw fires during import, before
// validateEnv() in main.ts runs, so the helpful "missing vars" message is never
// shown. Instead, throw lazily inside getSupabaseAdmin() on first call.

let _adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env['SUPABASE_URL']
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.\n' +
        'Check apps/api/.env.example for required variables.',
      )
    }

    _adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken:   false,
        persistSession:     false,
        detectSessionInUrl: false,
      },
    })
  }
  return _adminClient
}

/**
 * Convenience getter — same as getSupabaseAdmin() but reads as a property.
 * Import `supabaseAdmin` for existing call sites; new code should prefer
 * `getSupabaseAdmin()` so the lazy-init is explicit.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any as Record<string | symbol, unknown>)[prop]
  },
})

// ─── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Verify a Supabase JWT access token and return the Supabase user.
 * Used in the authenticate middleware to replace @fastify/jwt verification.
 */
export async function verifySupabaseToken(accessToken: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
  if (error || !data.user) return null
  return data.user
}

/**
 * Create a Supabase Auth user.
 * Called during org registration (Phase E migration).
 */
export async function createAuthUser(params: {
  email:    string
  password: string
  metadata?: Record<string, unknown>
}) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email:              params.email,
    password:           params.password,
    email_confirm:      true,      // skip email confirmation in CRM flow
    user_metadata:      params.metadata ?? {},
  })
  if (error) throw new Error(`Supabase Auth createUser failed: ${error.message}`)
  return data.user
}

/**
 * Delete a Supabase Auth user by their auth UUID.
 * Used when deactivating a CRM user account.
 */
export async function deleteAuthUser(authUserId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId)
  if (error) throw new Error(`Supabase Auth deleteUser failed: ${error.message}`)
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const DOCUMENTS_BUCKET = process.env['SUPABASE_STORAGE_DOCUMENTS_BUCKET'] ?? 'recrm-documents'
const AVATARS_BUCKET   = process.env['SUPABASE_STORAGE_AVATARS_BUCKET']   ?? 'recrm-avatars'

export const STORAGE_BUCKETS = {
  DOCUMENTS: DOCUMENTS_BUCKET,
  AVATARS:   AVATARS_BUCKET,
} as const

/**
 * Generate a Supabase Storage object path preserving the same
 * org-scoped key structure as the previous S3 implementation:
 *   orgs/{orgId}/{relatedType}/{relatedId}/{timestamp}-{rand}.ext
 */
export function buildStoragePath(
  organizationId: string,
  relatedType:    string,
  relatedId:      string,
  originalName:   string,
): string {
  const ext       = originalName.split('.').pop()?.toLowerCase() ?? ''
  const rand      = Math.random().toString(36).substring(2, 14)
  const timestamp = Date.now()
  return `orgs/${organizationId}/${relatedType.toLowerCase()}/${relatedId}/${timestamp}-${rand}${ext ? '.' + ext : ''}`
}

/**
 * Upload a document to Supabase Storage.
 * Returns the storage path (equivalent to old `storageKey`).
 */
export async function uploadDocument(params: {
  path:     string
  body:     Buffer | Uint8Array
  mimeType: string
}): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(params.path, params.body, {
      contentType:  params.mimeType,
      upsert:       false,
      cacheControl: '3600',
    })

  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`)
  return params.path
}

/**
 * Create a signed URL for private document download.
 * Default 15 minutes — same as previous S3 implementation.
 */
export async function getSignedDownloadUrl(
  storagePath:      string,
  expiresInSeconds = 60 * 15,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(`Supabase Storage signed URL failed: ${error?.message ?? 'unknown'}`)
  }
  return data.signedUrl
}

/**
 * Delete a document from Supabase Storage.
 */
export async function deleteDocument(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .remove([storagePath])

  if (error) throw new Error(`Supabase Storage delete failed: ${error.message}`)
}
