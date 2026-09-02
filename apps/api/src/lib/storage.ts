/**
 * Phase G — Supabase Storage (replaces S3/MinIO)
 *
 * This module is a drop-in replacement for the previous AWS S3 storage.ts.
 * All callers (documents.service.ts) use the same function signatures.
 *
 * Buckets:
 *   recrm-documents  — private (signed URLs, 15-min TTL)
 *   recrm-avatars    — public
 *   recrm-property   — public (property/project images)
 *
 * All operations use the Supabase Admin (service-role) client so that
 * server-side uploads bypass RLS. RLS on storage.objects still enforces
 * org-path isolation for any client-side access.
 *
 * Key format preserved from S3 implementation:
 *   orgs/{orgId}/{relatedType}/{relatedId}/{timestamp}-{rand}.{ext}
 */

import { supabaseAdmin } from './supabase.js'
import { randomBytes } from 'crypto'
import path from 'path'

// ─── Bucket names ─────────────────────────────────────────────────────────────

export const BUCKETS = {
  DOCUMENTS: process.env['SUPABASE_STORAGE_DOCUMENTS_BUCKET'] ?? 'recrm-documents',
  AVATARS:   process.env['SUPABASE_STORAGE_AVATARS_BUCKET']   ?? 'recrm-avatars',
  PROPERTY:  process.env['SUPABASE_STORAGE_PROPERTY_BUCKET']  ?? 'recrm-property',
} as const

// ─── Allowed MIME types ───────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
])

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

// ─── Key generation (preserved from S3 implementation) ────────────────────────

export function generateStorageKey(
  organizationId: string,
  relatedType: string,
  relatedId: string,
  originalName: string,
): string {
  const ext       = path.extname(originalName).toLowerCase()
  const rand      = randomBytes(12).toString('hex')
  const timestamp = Date.now()
  return `orgs/${organizationId}/${relatedType.toLowerCase()}/${relatedId}/${timestamp}-${rand}${ext}`
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType)
}

export function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES
}

export function humanReadableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export interface UploadResult {
  storageKey: string
  bucket:     string
  sizeBytes:  number
  mimeType:   string
}

export async function uploadFile(params: {
  key:            string
  body:           Buffer
  mimeType:       string
  organizationId: string
  bucket?:        string
}): Promise<UploadResult> {
  const bucket = params.bucket ?? BUCKETS.DOCUMENTS

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(params.key, params.body, {
      contentType:  params.mimeType,
      upsert:       false,
      cacheControl: '3600',
    })

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`)
  }

  return {
    storageKey: params.key,
    bucket,
    sizeBytes:  params.body.byteLength,
    mimeType:   params.mimeType,
  }
}

// ─── Presigned GET URL (private documents) ────────────────────────────────────

const SIGNED_URL_EXPIRES_SECONDS = 60 * 15 // 15 minutes default

export async function getPresignedDownloadUrl(
  storageKey:      string,
  expiresInSeconds = SIGNED_URL_EXPIRES_SECONDS,
  bucket =         BUCKETS.DOCUMENTS,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storageKey, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(`Supabase signed URL failed: ${error?.message ?? 'unknown'}`)
  }

  return data.signedUrl
}

// ─── Public URL (avatars / property images) ───────────────────────────────────

export function getPublicUrl(storageKey: string, bucket: string): string {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(storageKey)
  return data.publicUrl
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFile(
  storageKey: string,
  bucket =    BUCKETS.DOCUMENTS,
): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([storageKey])

  if (error) {
    throw new Error(`Supabase Storage delete failed: ${error.message}`)
  }
}

// ─── Existence check ──────────────────────────────────────────────────────────

export async function fileExists(
  storageKey: string,
  bucket =    BUCKETS.DOCUMENTS,
): Promise<boolean> {
  const folder    = storageKey.substring(0, storageKey.lastIndexOf('/'))
  const filename  = storageKey.substring(storageKey.lastIndexOf('/') + 1)

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(folder, { search: filename })

  if (error) return false
  return (data ?? []).some((f: { name: string }) => f.name === filename)
}

// ─── Avatar upload (convenience) ──────────────────────────────────────────────

export async function uploadAvatar(params: {
  organizationId: string
  userId:         string
  body:           Buffer
  mimeType:       string
  originalName:   string
}): Promise<{ publicUrl: string; storageKey: string }> {
  const ext       = path.extname(params.originalName).toLowerCase()
  const storageKey = `orgs/${params.organizationId}/users/${params.userId}/avatar${ext}`

  // Upsert — replace existing avatar
  const { error } = await supabaseAdmin.storage
    .from(BUCKETS.AVATARS)
    .upload(storageKey, params.body, {
      contentType: params.mimeType,
      upsert:      true,
    })

  if (error) throw new Error(`Avatar upload failed: ${error.message}`)

  const publicUrl = getPublicUrl(storageKey, BUCKETS.AVATARS)
  return { publicUrl, storageKey }
}

// ─── Property image upload (convenience) ──────────────────────────────────────

export async function uploadPropertyImage(params: {
  organizationId: string
  projectId:      string
  unitId?:        string
  body:           Buffer
  mimeType:       string
  originalName:   string
}): Promise<{ publicUrl: string; storageKey: string }> {
  const ext        = path.extname(params.originalName).toLowerCase()
  const rand       = randomBytes(8).toString('hex')
  const timestamp  = Date.now()
  const subPath    = params.unitId
    ? `units/${params.unitId}`
    : `projects/${params.projectId}`
  const storageKey = `orgs/${params.organizationId}/${subPath}/${timestamp}-${rand}${ext}`

  const { error } = await supabaseAdmin.storage
    .from(BUCKETS.PROPERTY)
    .upload(storageKey, params.body, {
      contentType:  params.mimeType,
      upsert:       false,
      cacheControl: '86400',
    })

  if (error) throw new Error(`Property image upload failed: ${error.message}`)

  const publicUrl = getPublicUrl(storageKey, BUCKETS.PROPERTY)
  return { publicUrl, storageKey }
}
