-- =============================================================================
-- Migration: 00006_org_membership.sql
-- Phase F — Organization Membership Model
--
-- Adds the organization_members table as recommended by the migration plan.
-- The existing users.organization_id is kept for backward compat with Prisma
-- and all existing business logic — this table is additive, not replacing.
--
-- Purpose:
--   - Enables future multi-org access (Phase H+ / roadmap)
--   - Gives RLS a clean membership join without relying on users.organization_id
--   - Per migration plan section 11: explicit organization membership
--
-- org_members rows are created/synced whenever a user is added to an org.
-- The Fastify user-management service writes to BOTH tables.
-- =============================================================================

-- ─── Organization Members ─────────────────────────────────────────────────────

create table if not exists organization_members (
  id              text              primary key default gen_random_uuid()::text,
  organization_id text              not null references organizations(id) on delete cascade,
  user_id         text              not null references users(id) on delete cascade,
  role            user_role_enum    not null,
  status          user_status_enum  not null default 'ACTIVE',
  invited_by_id   text              references users(id) on delete set null,
  joined_at       timestamptz       not null default now(),
  created_at      timestamptz       not null default now(),
  updated_at      timestamptz       not null default now(),

  unique (organization_id, user_id)
);

-- Indexes
create index idx_org_members_org      on organization_members (organization_id);
create index idx_org_members_user     on organization_members (user_id);
create index idx_org_members_org_role on organization_members (organization_id, role);
create index idx_org_members_status   on organization_members (organization_id, status);

-- updated_at trigger
create trigger set_org_members_updated_at
  before update on organization_members
  for each row execute procedure public.set_updated_at();

-- ─── RLS on organization_members ─────────────────────────────────────────────

alter table organization_members enable row level security;

-- Members can see all members in their own org
create policy "org_members_select"
  on organization_members for select
  using (organization_id = public.current_org_id());

-- Only admins can add/update/remove members
create policy "org_members_insert"
  on organization_members for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy "org_members_update"
  on organization_members for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );

create policy "org_members_delete"
  on organization_members for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );

-- ─── Backfill: sync existing users into organization_members ─────────────────

insert into organization_members (id, organization_id, user_id, role, status, joined_at, created_at, updated_at)
select
  gen_random_uuid()::text,
  u.organization_id,
  u.id,
  u.role,
  u.status,
  u.created_at,
  u.created_at,
  u.updated_at
from public.users u
on conflict (organization_id, user_id) do nothing;

-- ─── Trigger: keep org_members in sync when users table changes ───────────────

create or replace function public.sync_user_to_org_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into organization_members (id, organization_id, user_id, role, status, joined_at)
    values (gen_random_uuid()::text, new.organization_id, new.id, new.role, new.status, now())
    on conflict (organization_id, user_id) do nothing;

  elsif TG_OP = 'UPDATE' then
    update organization_members
    set
      role       = new.role,
      status     = new.status,
      updated_at = now()
    where organization_id = new.organization_id
      and user_id         = new.id;
  end if;

  return new;
end;
$$;

create trigger sync_user_membership
  after insert or update of role, status
  on public.users
  for each row execute procedure public.sync_user_to_org_members();

-- ─── Update RLS helper to use org_members for primary lookup ─────────────────
-- Replace public.current_org_id() to use organization_members as source of truth.
-- This makes the membership model the security boundary, not just users.

create or replace function public.current_org_id()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select om.organization_id
  from public.organization_members om
  join public.users u on u.id = om.user_id
  where u.auth_user_id = auth.uid()
    and om.status = 'ACTIVE'
  limit 1;
$$;

-- ─── Update public.current_user_id() to use org_members path ──────────────────

create or replace function public.current_user_id()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.status = 'ACTIVE'
  limit 1;
$$;

-- ─── Update public.current_user_role() to use org_members ──────────────────────

create or replace function public.current_user_role()
returns user_role_enum
language sql
stable
security definer
set search_path = public, auth
as $$
  select om.role
  from public.organization_members om
  join public.users u on u.id = om.user_id
  where u.auth_user_id = auth.uid()
    and om.status = 'ACTIVE'
  limit 1;
$$;
