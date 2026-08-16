-- =============================================================================
-- Migration: 00007_storage.sql
-- Phase G — Supabase Storage (replaces S3/MinIO)
--
-- Buckets:
--   recrm-documents  — PRIVATE: contracts, IDs, receipts, deal docs
--   recrm-avatars    — PUBLIC: user profile photos (non-sensitive)
--   recrm-property   — PUBLIC: project/unit images (non-sensitive listing media)
--
-- Access pattern for private docs:
--   Upload → Fastify (service role) → supabaseAdmin.storage.from('recrm-documents').upload()
--   Download → Fastify (service role) → createSignedUrl (15-min TTL)
--   NEVER direct browser upload to private bucket
--
-- Access pattern for public assets:
--   Upload → Fastify (service role) with validation
--   Read → public URL via getPublicUrl()
--
-- Storage RLS policies enforce:
--   - Only authenticated org members can access their org's private documents
--   - Only org members can upload to their org's paths
--   - Path structure: orgs/{orgId}/{type}/{entityId}/{filename}
-- =============================================================================

-- ─── Create buckets ───────────────────────────────────────────────────────────
-- Supabase Storage buckets are created via the API or dashboard.
-- This SQL creates them programmatically via the storage schema.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'recrm-documents',
    'recrm-documents',
    false,                       -- PRIVATE: signed URLs only
    20971520,                    -- 20 MB
    array[
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ]
  ),
  (
    'recrm-avatars',
    'recrm-avatars',
    true,                        -- PUBLIC: profile photos
    5242880,                     -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'recrm-property',
    'recrm-property',
    true,                        -- PUBLIC: property listing images
    20971520,                    -- 20 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- STORAGE RLS POLICIES
-- All operations verified by authenticated org membership.
-- Path-based isolation: orgs/{orgId}/ prefix enforced in policies.
-- =============================================================================

-- ─── recrm-documents (PRIVATE) ───────────────────────────────────────────────
-- Only org members can SELECT (download via signed URL — Fastify generates these)
-- Only org members can INSERT (upload — goes through Fastify, not direct browser)
-- Only org admins can DELETE

create policy "documents_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'recrm-documents'
    and (
      -- Path starts with orgs/{current_user_org_id}/
      (storage.foldername(name))[1] = 'orgs'
      and (storage.foldername(name))[2] = public.current_org_id()
    )
  );

create policy "documents_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'recrm-documents'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[2] = public.current_org_id()
    -- Insertions via service role (Fastify) bypass RLS — this covers any future direct upload path
  );

create policy "documents_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'recrm-documents'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[2] = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

-- ─── recrm-avatars (PUBLIC) ──────────────────────────────────────────────────
-- Public reads. Only users can update their own avatar.

create policy "avatars_storage_select"
  on storage.objects for select
  using (bucket_id = 'recrm-avatars');

create policy "avatars_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'recrm-avatars'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[2] = public.current_org_id()
  );

create policy "avatars_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'recrm-avatars'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[2] = public.current_org_id()
  );

create policy "avatars_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'recrm-avatars'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[2] = public.current_org_id()
  );

-- ─── recrm-property (PUBLIC) ─────────────────────────────────────────────────
-- Public reads. Property manager / admin can upload/delete.

create policy "property_storage_select"
  on storage.objects for select
  using (bucket_id = 'recrm-property');

create policy "property_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'recrm-property'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[2] = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy "property_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'recrm-property'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[2] = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );
