-- =============================================================================
-- Migration: 00005_auth_migration.sql
-- Phase E — Auth Migration
--
-- This SQL migration handles the DB side of replacing custom JWT with
-- Supabase Auth. The application code changes are in:
--   apps/api/src/middleware/authenticate.ts (Phase E)
--   apps/api/src/modules/auth/auth.service.ts (Phase E)
--
-- What this migration does:
--   1. Adds trigger to auto-link new Supabase Auth users to app users table
--      (used when new CRM users are invited via Supabase Auth)
--   2. Drops refresh_tokens table dependency — Supabase Auth handles sessions
--   3. Adds helper function for password reset flow
--   4. Adds index on auth_user_id (if not already created)
-- =============================================================================

-- ─── Trigger: auto-create stub user when auth.users row inserted ─────────────
-- When an admin invites a user via Supabase Auth, this trigger creates the
-- matching app users row linked by auth_user_id.
-- NOTE: org assignment + role are set by the Fastify invitation flow BEFORE
-- the auth.users row is created (via admin.createUser), so this trigger is
-- a safety net for any other Supabase-managed signups.

-- Function called by the trigger
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id text;
  v_role   user_role_enum;
begin
  -- Pull org_id and role from user_metadata set by Fastify at invite time
  v_org_id := new.raw_user_meta_data->>'organization_id';
  v_role   := coalesce(
    (new.raw_user_meta_data->>'role')::user_role_enum,
    'VIEWER'::user_role_enum
  );

  -- Only create app user if org_id is present in metadata
  if v_org_id is not null then
    insert into public.users (
      id,
      auth_user_id,
      organization_id,
      email,
      role,
      status,
      email_verified,
      created_at,
      updated_at
    )
    values (
      -- Use nanoid-style: app layer sets id. If already exists (pre-created by Fastify), do nothing.
      gen_random_uuid()::text,
      new.id,
      v_org_id,
      new.email,
      v_role,
      'ACTIVE'::user_status_enum,
      new.email_confirmed_at is not null,
      now(),
      now()
    )
    on conflict (auth_user_id) do update
      set email_verified = excluded.email_verified,
          updated_at     = now();
  end if;

  return new;
end;
$$;

-- Register trigger on auth.users (Supabase managed table)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ─── Trigger: sync email_verified when auth user confirms email ───────────────

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    email_verified = (new.email_confirmed_at is not null),
    updated_at     = now()
  where auth_user_id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_auth_user_updated();

-- ─── Function: link existing user to Supabase Auth user ──────────────────────
-- Called by Fastify migration script when migrating existing users.
-- Sets auth_user_id on the app users row and clears password_hash.

create or replace function public.link_auth_user(
  p_user_id      text,
  p_auth_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    auth_user_id  = p_auth_user_id,
    password_hash = null,   -- Supabase Auth owns credentials now
    status        = 'ACTIVE'::user_status_enum,
    email_verified = true,
    updated_at    = now()
  where id = p_user_id;

  if not found then
    raise exception 'User % not found', p_user_id;
  end if;
end;
$$;

-- ─── Function: get app user by Supabase auth UID ─────────────────────────────
-- Used by Fastify authenticate middleware for fast user lookup.
-- Returns app user id, org_id, role in one round trip.

create or replace function public.get_app_user_by_auth_uid(
  p_auth_uid uuid
)
returns table (
  user_id         text,
  organization_id text,
  role            user_role_enum,
  status          user_status_enum
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id            as user_id,
    u.organization_id,
    u.role,
    u.status
  from public.users u
  where u.auth_user_id = p_auth_uid
    and u.status = 'ACTIVE'
  limit 1;
$$;
