-- =============================================================================
-- Migration: 00004_rls_policies.sql
-- Phase D — Row Level Security
--
-- Security model:
--   1. Every authenticated user has a Supabase auth.uid().
--   2. auth.uid() maps to users.auth_user_id → gives us the app user row.
--   3. The app user row has organization_id + role.
--   4. All tenant-owned tables are gated on matching organization_id.
--   5. SALES_AGENT rows are further restricted to their own assigned data
--      where role-specific filtering is appropriate.
--   6. SUPER_ADMIN bypasses RLS only through the Fastify service-role client.
--      No browser path ever uses the service role key.
--
-- Helper functions defined first, then RLS enabled per table, then policies.
--
-- Run after:
--   00001_initial_schema.sql
--   00003_indexes.sql
-- =============================================================================

-- ─── Helper: get current app user row ────────────────────────────────────────
-- Returns the users row for the currently authenticated Supabase user.
-- Returns NULL if not found (unauthenticated → all RLS checks fail).

create or replace function public.current_app_user()
returns users
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.*
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.status = 'ACTIVE'
  limit 1;
$$;

-- ─── Helper: get current user's organization_id ───────────────────────────────

create or replace function public.current_org_id()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select organization_id
  from public.users
  where auth_user_id = auth.uid()
    and status = 'ACTIVE'
  limit 1;
$$;

-- ─── Helper: get current user's role ─────────────────────────────────────────

create or replace function public.current_user_role()
returns user_role_enum
language sql
stable
security definer
set search_path = public, auth
as $$
  select role
  from public.users
  where auth_user_id = auth.uid()
    and status = 'ACTIVE'
  limit 1;
$$;

-- ─── Helper: get current user's app id ───────────────────────────────────────

create or replace function public.current_user_id()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select id
  from public.users
  where auth_user_id = auth.uid()
    and status = 'ACTIVE'
  limit 1;
$$;

-- ─── Helper: is current user a manager-level role or above ───────────────────

create or replace function public.is_manager_or_above()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.current_user_role() in (
      'SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER',
      'MARKETING_MANAGER', 'ACCOUNTANT', 'PROPERTY_MANAGER'
    ),
    false
  );
$$;

-- =============================================================================
-- ENABLE RLS ON ALL TENANT-OWNED TABLES
-- =============================================================================

alter table organizations          enable row level security;
alter table users                  enable row level security;
alter table user_profiles          enable row level security;
alter table refresh_tokens         enable row level security;
alter table teams                  enable row level security;
alter table team_members           enable row level security;
alter table campaigns              enable row level security;
alter table leads                  enable row level security;
alter table lead_activities        enable row level security;
alter table lead_saved_units       enable row level security;
alter table customers              enable row level security;
alter table customer_saved_units   enable row level security;
alter table projects               enable row level security;
alter table buildings              enable row level security;
alter table floors                 enable row level security;
alter table units                  enable row level security;
alter table payment_plan_templates enable row level security;
alter table viewings               enable row level security;
alter table offers                 enable row level security;
alter table reservations           enable row level security;
alter table deals                  enable row level security;
alter table payment_plans          enable row level security;
alter table installments           enable row level security;
alter table payments               enable row level security;
alter table commission_rules       enable row level security;
alter table commissions            enable row level security;
alter table tasks                  enable row level security;
alter table notifications          enable row level security;
alter table communications         enable row level security;
alter table documents              enable row level security;
alter table audit_logs             enable row level security;
alter table lead_status_configs    enable row level security;
alter table lead_scoring_rules     enable row level security;
alter table pipeline_stage_configs enable row level security;
alter table assignment_rules       enable row level security;

-- =============================================================================
-- ORGANIZATIONS
-- Users can only see their own org. Admin can update it.
-- =============================================================================

-- Auto-generated: drop existing policies before recreating
drop policy if exists "org_select" on organizations;
drop policy if exists "org_update" on organizations;
drop policy if exists "users_select_own_org" on users;
drop policy if exists "users_insert_admin" on users;
drop policy if exists "users_update_self" on users;
drop policy if exists "users_update_admin" on users;
drop policy if exists "users_delete_admin" on users;
drop policy if exists "profiles_select_own_org" on user_profiles;
drop policy if exists "profiles_insert_self_or_admin" on user_profiles;
drop policy if exists "profiles_update_self_or_admin" on user_profiles;
drop policy if exists "refresh_tokens_own" on refresh_tokens;
drop policy if exists "teams_select" on teams;
drop policy if exists "teams_insert" on teams;
drop policy if exists "teams_update" on teams;
drop policy if exists "teams_delete" on teams;
drop policy if exists "team_members_select" on team_members;
drop policy if exists "team_members_insert" on team_members;
drop policy if exists "team_members_delete" on team_members;
drop policy if exists "campaigns_select" on campaigns;
drop policy if exists "campaigns_insert" on campaigns;
drop policy if exists "campaigns_update" on campaigns;
drop policy if exists "campaigns_delete" on campaigns;
drop policy if exists "leads_select" on leads;
drop policy if exists "leads_insert" on leads;
drop policy if exists "leads_update" on leads;
drop policy if exists "leads_delete" on leads;
drop policy if exists "lead_activities_select" on lead_activities;
drop policy if exists "lead_activities_insert" on lead_activities;
drop policy if exists "lead_activities_delete_admin" on lead_activities;
drop policy if exists "lead_saved_units_select" on lead_saved_units;
drop policy if exists "lead_saved_units_insert" on lead_saved_units;
drop policy if exists "lead_saved_units_delete" on lead_saved_units;
drop policy if exists "customers_select" on customers;
drop policy if exists "customers_insert" on customers;
drop policy if exists "customers_update" on customers;
drop policy if exists "customers_delete" on customers;
drop policy if exists "customer_saved_units_select" on customer_saved_units;
drop policy if exists "customer_saved_units_insert" on customer_saved_units;
drop policy if exists "customer_saved_units_delete" on customer_saved_units;
drop policy if exists "projects_select" on projects;
drop policy if exists "projects_insert" on projects;
drop policy if exists "projects_update" on projects;
drop policy if exists "projects_delete" on projects;
drop policy if exists "buildings_select" on buildings;
drop policy if exists "buildings_insert" on buildings;
drop policy if exists "buildings_update" on buildings;
drop policy if exists "buildings_delete" on buildings;
drop policy if exists "floors_select" on floors;
drop policy if exists "floors_insert" on floors;
drop policy if exists "floors_update" on floors;
drop policy if exists "floors_delete" on floors;
drop policy if exists "units_select" on units;
drop policy if exists "units_insert" on units;
drop policy if exists "units_update" on units;
drop policy if exists "units_delete" on units;
drop policy if exists "ppt_select" on payment_plan_templates;
drop policy if exists "ppt_insert" on payment_plan_templates;
drop policy if exists "ppt_update" on payment_plan_templates;
drop policy if exists "ppt_delete" on payment_plan_templates;
drop policy if exists "viewings_select" on viewings;
drop policy if exists "viewings_insert" on viewings;
drop policy if exists "viewings_update" on viewings;
drop policy if exists "viewings_delete" on viewings;
drop policy if exists "offers_select" on offers;
drop policy if exists "offers_insert" on offers;
drop policy if exists "offers_update" on offers;
drop policy if exists "offers_delete" on offers;
drop policy if exists "reservations_select" on reservations;
drop policy if exists "reservations_insert" on reservations;
drop policy if exists "reservations_update" on reservations;
drop policy if exists "reservations_delete" on reservations;
drop policy if exists "deals_select" on deals;
drop policy if exists "deals_insert" on deals;
drop policy if exists "deals_update" on deals;
drop policy if exists "deals_delete" on deals;
drop policy if exists "payment_plans_select" on payment_plans;
drop policy if exists "payment_plans_insert" on payment_plans;
drop policy if exists "payment_plans_update" on payment_plans;
drop policy if exists "payment_plans_delete" on payment_plans;
drop policy if exists "installments_select" on installments;
drop policy if exists "installments_insert" on installments;
drop policy if exists "installments_update" on installments;
drop policy if exists "installments_delete" on installments;
drop policy if exists "payments_select" on payments;
drop policy if exists "payments_insert" on payments;
drop policy if exists "payments_update" on payments;
drop policy if exists "payments_delete" on payments;
drop policy if exists "commission_rules_select" on commission_rules;
drop policy if exists "commission_rules_mutate" on commission_rules;
drop policy if exists "commission_rules_update" on commission_rules;
drop policy if exists "commission_rules_delete" on commission_rules;
drop policy if exists "commissions_select" on commissions;
drop policy if exists "commissions_insert" on commissions;
drop policy if exists "commissions_update" on commissions;
drop policy if exists "commissions_delete" on commissions;
drop policy if exists "tasks_select" on tasks;
drop policy if exists "tasks_insert" on tasks;
drop policy if exists "tasks_update" on tasks;
drop policy if exists "tasks_delete" on tasks;
drop policy if exists "notifications_select" on notifications;
drop policy if exists "notifications_update" on notifications;
drop policy if exists "notifications_delete" on notifications;
drop policy if exists "communications_select" on communications;
drop policy if exists "communications_insert" on communications;
drop policy if exists "communications_update" on communications;
drop policy if exists "communications_delete" on communications;
drop policy if exists "documents_select" on documents;
drop policy if exists "documents_insert" on documents;
drop policy if exists "documents_update" on documents;
drop policy if exists "documents_delete" on documents;
drop policy if exists "audit_logs_select" on audit_logs;
drop policy if exists "lead_status_configs_select" on lead_status_configs;
drop policy if exists "lead_status_configs_mutate" on lead_status_configs;
drop policy if exists "lead_scoring_rules_select" on lead_scoring_rules;
drop policy if exists "lead_scoring_rules_mutate" on lead_scoring_rules;
drop policy if exists "pipeline_stage_configs_select" on pipeline_stage_configs;
drop policy if exists "pipeline_stage_configs_mutate" on pipeline_stage_configs;
drop policy if exists "assignment_rules_select" on assignment_rules;
drop policy if exists "assignment_rules_mutate" on assignment_rules;

create policy if not exists "org_select"
  on organizations for select
  using (id = public.current_org_id());

create policy if not exists "org_update"
  on organizations for update
  using (
    id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );

-- Only Fastify service role creates orgs (registration flow).
-- No INSERT policy needed for browser paths.

-- =============================================================================
-- USERS
-- All org members can SELECT users in their org (needed for assignments, etc.)
-- Only COMPANY_ADMIN / SALES_MANAGER can mutate other users.
-- Users can update their own row (status, last_seen etc.).
-- =============================================================================

create policy if not exists "users_select_own_org"
  on users for select
  using (organization_id = public.current_org_id());

create policy if not exists "users_insert_admin"
  on users for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "users_update_self"
  on users for update
  using (auth_user_id = auth.uid());

create policy if not exists "users_update_admin"
  on users for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "users_delete_admin"
  on users for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );

-- =============================================================================
-- USER PROFILES
-- =============================================================================

create policy if not exists "profiles_select_own_org"
  on user_profiles for select
  using (
    exists (
      select 1 from users u
      where u.id = user_profiles.user_id
        and u.organization_id = public.current_org_id()
    )
  );

create policy if not exists "profiles_insert_self_or_admin"
  on user_profiles for insert
  with check (
    exists (
      select 1 from users u
      where u.id = user_profiles.user_id
        and (
          u.auth_user_id = auth.uid()
          or (
            u.organization_id = public.current_org_id()
            and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
          )
        )
    )
  );

create policy if not exists "profiles_update_self_or_admin"
  on user_profiles for update
  using (
    exists (
      select 1 from users u
      where u.id = user_profiles.user_id
        and (
          u.auth_user_id = auth.uid()
          or (
            u.organization_id = public.current_org_id()
            and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
          )
        )
    )
  );

-- =============================================================================
-- REFRESH TOKENS (legacy — only own tokens visible)
-- =============================================================================

create policy if not exists "refresh_tokens_own"
  on refresh_tokens for all
  using (
    user_id = public.current_user_id()
  );

-- =============================================================================
-- TEAMS
-- =============================================================================

create policy if not exists "teams_select"
  on teams for select
  using (organization_id = public.current_org_id());

create policy if not exists "teams_insert"
  on teams for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "teams_update"
  on teams for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "teams_delete"
  on teams for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );

-- =============================================================================
-- TEAM MEMBERS
-- =============================================================================

create policy if not exists "team_members_select"
  on team_members for select
  using (
    exists (
      select 1 from teams t
      where t.id = team_members.team_id
        and t.organization_id = public.current_org_id()
    )
  );

create policy if not exists "team_members_insert"
  on team_members for insert
  with check (
    exists (
      select 1 from teams t
      where t.id = team_members.team_id
        and t.organization_id = public.current_org_id()
    )
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "team_members_delete"
  on team_members for delete
  using (
    exists (
      select 1 from teams t
      where t.id = team_members.team_id
        and t.organization_id = public.current_org_id()
    )
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- CAMPAIGNS
-- =============================================================================

create policy if not exists "campaigns_select"
  on campaigns for select
  using (organization_id = public.current_org_id());

create policy if not exists "campaigns_insert"
  on campaigns for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'MARKETING_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "campaigns_update"
  on campaigns for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'MARKETING_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "campaigns_delete"
  on campaigns for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'MARKETING_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- LEADS
-- SALES_AGENT: only assigned leads.
-- All other roles: all org leads.
-- =============================================================================

create policy if not exists "leads_select"
  on leads for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or assigned_agent_id = public.current_user_id()
    )
  );

create policy if not exists "leads_insert"
  on leads for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "leads_update"
  on leads for update
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or assigned_agent_id = public.current_user_id()
    )
  );

create policy if not exists "leads_delete"
  on leads for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- LEAD ACTIVITIES
-- =============================================================================

create policy if not exists "lead_activities_select"
  on lead_activities for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or exists (
        select 1 from leads l
        where l.id = lead_activities.lead_id
          and l.assigned_agent_id = public.current_user_id()
      )
    )
  );

create policy if not exists "lead_activities_insert"
  on lead_activities for insert
  with check (organization_id = public.current_org_id());

-- Activities are immutable — no update/delete for non-admins
create policy if not exists "lead_activities_delete_admin"
  on lead_activities for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );

-- =============================================================================
-- LEAD SAVED UNITS
-- =============================================================================

create policy if not exists "lead_saved_units_select"
  on lead_saved_units for select
  using (
    exists (
      select 1 from leads l
      where l.id = lead_saved_units.lead_id
        and l.organization_id = public.current_org_id()
        and (
          public.current_user_role() != 'SALES_AGENT'
          or l.assigned_agent_id = public.current_user_id()
        )
    )
  );

create policy if not exists "lead_saved_units_insert"
  on lead_saved_units for insert
  with check (
    exists (
      select 1 from leads l
      where l.id = lead_saved_units.lead_id
        and l.organization_id = public.current_org_id()
    )
  );

create policy if not exists "lead_saved_units_delete"
  on lead_saved_units for delete
  using (
    exists (
      select 1 from leads l
      where l.id = lead_saved_units.lead_id
        and l.organization_id = public.current_org_id()
    )
  );

-- =============================================================================
-- CUSTOMERS
-- =============================================================================

create policy if not exists "customers_select"
  on customers for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or assigned_agent_id = public.current_user_id()
    )
  );

create policy if not exists "customers_insert"
  on customers for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "customers_update"
  on customers for update
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or assigned_agent_id = public.current_user_id()
    )
  );

create policy if not exists "customers_delete"
  on customers for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- CUSTOMER SAVED UNITS
-- =============================================================================

create policy if not exists "customer_saved_units_select"
  on customer_saved_units for select
  using (
    exists (
      select 1 from customers c
      where c.id = customer_saved_units.customer_id
        and c.organization_id = public.current_org_id()
    )
  );

create policy if not exists "customer_saved_units_insert"
  on customer_saved_units for insert
  with check (
    exists (
      select 1 from customers c
      where c.id = customer_saved_units.customer_id
        and c.organization_id = public.current_org_id()
    )
  );

create policy if not exists "customer_saved_units_delete"
  on customer_saved_units for delete
  using (
    exists (
      select 1 from customers c
      where c.id = customer_saved_units.customer_id
        and c.organization_id = public.current_org_id()
    )
  );

-- =============================================================================
-- PROJECTS
-- =============================================================================

create policy if not exists "projects_select"
  on projects for select
  using (organization_id = public.current_org_id());

create policy if not exists "projects_insert"
  on projects for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "projects_update"
  on projects for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "projects_delete"
  on projects for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'PROPERTY_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- BUILDINGS
-- =============================================================================

create policy if not exists "buildings_select"
  on buildings for select
  using (organization_id = public.current_org_id());

create policy if not exists "buildings_insert"
  on buildings for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "buildings_update"
  on buildings for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "buildings_delete"
  on buildings for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'PROPERTY_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- FLOORS (owned via building)
-- =============================================================================

create policy if not exists "floors_select"
  on floors for select
  using (
    exists (
      select 1 from buildings b
      where b.id = floors.building_id
        and b.organization_id = public.current_org_id()
    )
  );

create policy if not exists "floors_insert"
  on floors for insert
  with check (
    exists (
      select 1 from buildings b
      where b.id = floors.building_id
        and b.organization_id = public.current_org_id()
    )
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "floors_update"
  on floors for update
  using (
    exists (
      select 1 from buildings b
      where b.id = floors.building_id
        and b.organization_id = public.current_org_id()
    )
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "floors_delete"
  on floors for delete
  using (
    exists (
      select 1 from buildings b
      where b.id = floors.building_id
        and b.organization_id = public.current_org_id()
    )
    and public.current_user_role() in ('COMPANY_ADMIN', 'PROPERTY_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- UNITS
-- All roles can SELECT (needed for property matching, availability checks).
-- Mutations restricted to property/admin roles.
-- =============================================================================

create policy if not exists "units_select"
  on units for select
  using (organization_id = public.current_org_id());

create policy if not exists "units_insert"
  on units for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "units_update"
  on units for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "units_delete"
  on units for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'PROPERTY_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- PAYMENT PLAN TEMPLATES
-- =============================================================================

create policy if not exists "ppt_select"
  on payment_plan_templates for select
  using (
    exists (
      select 1 from projects p
      where p.id = payment_plan_templates.project_id
        and p.organization_id = public.current_org_id()
    )
  );

create policy if not exists "ppt_insert"
  on payment_plan_templates for insert
  with check (
    exists (
      select 1 from projects p
      where p.id = payment_plan_templates.project_id
        and p.organization_id = public.current_org_id()
    )
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'
    )
  );

create policy if not exists "ppt_update"
  on payment_plan_templates for update
  using (
    exists (
      select 1 from projects p
      where p.id = payment_plan_templates.project_id
        and p.organization_id = public.current_org_id()
    )
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'PROPERTY_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'
    )
  );

create policy if not exists "ppt_delete"
  on payment_plan_templates for delete
  using (
    exists (
      select 1 from projects p
      where p.id = payment_plan_templates.project_id
        and p.organization_id = public.current_org_id()
    )
    and public.current_user_role() in ('COMPANY_ADMIN', 'PROPERTY_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- VIEWINGS
-- SALES_AGENT: only their viewings.
-- =============================================================================

create policy if not exists "viewings_select"
  on viewings for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

create policy if not exists "viewings_insert"
  on viewings for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "viewings_update"
  on viewings for update
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

create policy if not exists "viewings_delete"
  on viewings for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- OFFERS
-- SALES_AGENT: only their offers.
-- =============================================================================

create policy if not exists "offers_select"
  on offers for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

create policy if not exists "offers_insert"
  on offers for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "offers_update"
  on offers for update
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

create policy if not exists "offers_delete"
  on offers for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- RESERVATIONS
-- CRITICAL: concurrency safety is handled by DB unique constraint + Fastify
-- transaction. RLS enforces org isolation only.
-- SALES_AGENT: only their reservations.
-- =============================================================================

create policy if not exists "reservations_select"
  on reservations for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

create policy if not exists "reservations_insert"
  on reservations for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "reservations_update"
  on reservations for update
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

create policy if not exists "reservations_delete"
  on reservations for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- DEALS
-- SALES_AGENT: only their deals.
-- =============================================================================

create policy if not exists "deals_select"
  on deals for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

create policy if not exists "deals_insert"
  on deals for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "deals_update"
  on deals for update
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

-- Closed deals: only COMPANY_ADMIN can delete
create policy if not exists "deals_delete"
  on deals for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );

-- =============================================================================
-- PAYMENT PLANS
-- Owned via deal — inherit agent restriction.
-- =============================================================================

create policy if not exists "payment_plans_select"
  on payment_plans for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or exists (
        select 1 from deals d
        where d.id = payment_plans.deal_id
          and d.agent_id = public.current_user_id()
      )
    )
  );

create policy if not exists "payment_plans_insert"
  on payment_plans for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "payment_plans_update"
  on payment_plans for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'
    )
  );

create policy if not exists "payment_plans_delete"
  on payment_plans for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')
  );

-- =============================================================================
-- INSTALLMENTS
-- =============================================================================

create policy if not exists "installments_select"
  on installments for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or exists (
        select 1 from deals d
        where d.id = installments.deal_id
          and d.agent_id = public.current_user_id()
      )
    )
  );

create policy if not exists "installments_insert"
  on installments for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "installments_update"
  on installments for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'
    )
  );

create policy if not exists "installments_delete"
  on installments for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')
  );

-- =============================================================================
-- PAYMENTS
-- =============================================================================

create policy if not exists "payments_select"
  on payments for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or exists (
        select 1 from deals d
        where d.id = payments.deal_id
          and d.agent_id = public.current_user_id()
      )
    )
  );

create policy if not exists "payments_insert"
  on payments for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'
    )
  );

create policy if not exists "payments_update"
  on payments for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'
    )
  );

create policy if not exists "payments_delete"
  on payments for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')
  );

-- =============================================================================
-- COMMISSION RULES
-- =============================================================================

create policy if not exists "commission_rules_select"
  on commission_rules for select
  using (organization_id = public.current_org_id());

create policy if not exists "commission_rules_mutate"
  on commission_rules for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "commission_rules_update"
  on commission_rules for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "commission_rules_delete"
  on commission_rules for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );

-- =============================================================================
-- COMMISSIONS
-- SALES_AGENT: only their own.
-- =============================================================================

create policy if not exists "commissions_select"
  on commissions for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

create policy if not exists "commissions_insert"
  on commissions for insert
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'
    )
  );

create policy if not exists "commissions_update"
  on commissions for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'
    )
  );

create policy if not exists "commissions_delete"
  on commissions for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')
  );

-- =============================================================================
-- TASKS
-- Users see tasks assigned to them or tasks they own.
-- Managers see all org tasks.
-- =============================================================================

create policy if not exists "tasks_select"
  on tasks for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or assignee_id = public.current_user_id()
      or creator_id = public.current_user_id()
    )
  );

create policy if not exists "tasks_insert"
  on tasks for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "tasks_update"
  on tasks for update
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or assignee_id = public.current_user_id()
      or creator_id = public.current_user_id()
    )
  );

create policy if not exists "tasks_delete"
  on tasks for delete
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
      or creator_id = public.current_user_id()
    )
  );

-- =============================================================================
-- NOTIFICATIONS
-- Users see only their own notifications.
-- =============================================================================

create policy if not exists "notifications_select"
  on notifications for select
  using (
    organization_id = public.current_org_id()
    and user_id = public.current_user_id()
  );

create policy if not exists "notifications_update"
  on notifications for update
  using (
    organization_id = public.current_org_id()
    and user_id = public.current_user_id()
  );

-- Notifications are created by the system (Fastify service role).
-- No direct browser INSERT.
create policy if not exists "notifications_delete"
  on notifications for delete
  using (
    organization_id = public.current_org_id()
    and user_id = public.current_user_id()
  );

-- =============================================================================
-- COMMUNICATIONS
-- SALES_AGENT: only their own org comms where they are the agent.
-- =============================================================================

create policy if not exists "communications_select"
  on communications for select
  using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() != 'SALES_AGENT'
      or agent_id = public.current_user_id()
    )
  );

create policy if not exists "communications_insert"
  on communications for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "communications_update"
  on communications for update
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN'
    )
  );

create policy if not exists "communications_delete"
  on communications for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );

-- =============================================================================
-- DOCUMENTS
-- SALES_AGENT: only documents on their leads/deals/customers.
-- =============================================================================

create policy if not exists "documents_select"
  on documents for select
  using (organization_id = public.current_org_id());
  -- Granular agent filtering handled in Fastify layer (related entity check).
  -- RLS ensures cross-org isolation; within-org agent scoping stays in app layer
  -- to avoid complex RLS subqueries across polymorphic related_type.

create policy if not exists "documents_insert"
  on documents for insert
  with check (organization_id = public.current_org_id());

create policy if not exists "documents_update"
  on documents for update
  using (organization_id = public.current_org_id());

create policy if not exists "documents_delete"
  on documents for delete
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN'
    )
  );

-- =============================================================================
-- AUDIT LOGS
-- Read-only for non-admins. Immutable — no update/delete via browser.
-- =============================================================================

create policy if not exists "audit_logs_select"
  on audit_logs for select
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in (
      'COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN'
    )
  );

-- Audit logs only inserted by Fastify (service role) — no browser INSERT.

-- =============================================================================
-- SETTINGS TABLES (lead_status_configs, lead_scoring_rules, pipeline_stage_configs, assignment_rules)
-- =============================================================================

create policy if not exists "lead_status_configs_select"
  on lead_status_configs for select
  using (organization_id = public.current_org_id());

create policy if not exists "lead_status_configs_mutate"
  on lead_status_configs for all
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "lead_scoring_rules_select"
  on lead_scoring_rules for select
  using (organization_id = public.current_org_id());

create policy if not exists "lead_scoring_rules_mutate"
  on lead_scoring_rules for all
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "pipeline_stage_configs_select"
  on pipeline_stage_configs for select
  using (organization_id = public.current_org_id());

create policy if not exists "pipeline_stage_configs_mutate"
  on pipeline_stage_configs for all
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

create policy if not exists "assignment_rules_select"
  on assignment_rules for select
  using (organization_id = public.current_org_id());

create policy if not exists "assignment_rules_mutate"
  on assignment_rules for all
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  );

-- =============================================================================
-- REALTIME PUBLICATIONS (Phase J — enable only useful tables)
-- Enabled here so the publication exists; subscriptions added in Phase J.
-- =============================================================================

-- notifications: user-scoped realtime (bell icon live updates)

-- units: availability changes (reservation board live refresh)

-- communications: WhatsApp message inbox live updates
