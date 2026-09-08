-- =============================================================================
-- Migration: 00003_indexes.sql
-- Compound indexes for actual query patterns in the CRM
--
-- Naming: idx_{table}_{columns}
-- All tenant-scoped queries include organization_id first.
-- =============================================================================

-- ─── Organizations ────────────────────────────────────────────────────────────
create index idx_organizations_slug on organizations (slug);
create index idx_organizations_status on organizations (status);

-- ─── Users ────────────────────────────────────────────────────────────────────
create index idx_users_org on users (organization_id);
create index idx_users_auth_user_id on users (auth_user_id) where auth_user_id is not null;
create index idx_users_org_role on users (organization_id, role);
create index idx_users_org_status on users (organization_id, status);
create index idx_users_email on users (email);

-- ─── Teams ────────────────────────────────────────────────────────────────────
create index idx_teams_org on teams (organization_id);
create index idx_team_members_team on team_members (team_id);
create index idx_team_members_user on team_members (user_id);

-- ─── Leads ────────────────────────────────────────────────────────────────────
create index idx_leads_org on leads (organization_id);
create index idx_leads_org_agent on leads (organization_id, assigned_agent_id);
create index idx_leads_org_status on leads (organization_id, status);
create index idx_leads_org_temperature on leads (organization_id, temperature);
create index idx_leads_org_source on leads (organization_id, source);
create index idx_leads_org_created on leads (organization_id, created_at desc);
create index idx_leads_org_followup on leads (organization_id, next_followup_at)
  where next_followup_at is not null;
create index idx_leads_campaign on leads (campaign_id) where campaign_id is not null;
create index idx_leads_team on leads (team_id) where team_id is not null;

-- ─── Lead Activities ──────────────────────────────────────────────────────────
create index idx_lead_activities_lead on lead_activities (lead_id, created_at desc);
create index idx_lead_activities_org on lead_activities (organization_id);

-- ─── Customers ────────────────────────────────────────────────────────────────
create index idx_customers_org on customers (organization_id);
create index idx_customers_org_agent on customers (organization_id, assigned_agent_id);
create index idx_customers_org_created on customers (organization_id, created_at desc);
create index idx_customers_lead on customers (lead_id) where lead_id is not null;

-- ─── Projects ─────────────────────────────────────────────────────────────────
create index idx_projects_org on projects (organization_id);
create index idx_projects_org_status on projects (organization_id, status);

-- ─── Buildings ────────────────────────────────────────────────────────────────
create index idx_buildings_org on buildings (organization_id);
create index idx_buildings_project on buildings (project_id);

-- ─── Floors ───────────────────────────────────────────────────────────────────
create index idx_floors_building on floors (building_id);

-- ─── Units ────────────────────────────────────────────────────────────────────
create index idx_units_org on units (organization_id);
create index idx_units_org_status on units (organization_id, status);
create index idx_units_org_project on units (organization_id, project_id);
create index idx_units_org_project_status on units (organization_id, project_id, status);
create index idx_units_org_type on units (organization_id, unit_type);
create index idx_units_building on units (building_id) where building_id is not null;
create index idx_units_floor on units (floor_id) where floor_id is not null;

-- ─── Viewings ─────────────────────────────────────────────────────────────────
create index idx_viewings_org on viewings (organization_id);
create index idx_viewings_org_agent on viewings (organization_id, agent_id);
create index idx_viewings_org_status on viewings (organization_id, status);
create index idx_viewings_scheduled on viewings (organization_id, scheduled_at);
create index idx_viewings_lead on viewings (lead_id) where lead_id is not null;
create index idx_viewings_customer on viewings (customer_id) where customer_id is not null;
create index idx_viewings_unit on viewings (unit_id) where unit_id is not null;

-- ─── Offers ───────────────────────────────────────────────────────────────────
create index idx_offers_org on offers (organization_id);
create index idx_offers_org_agent on offers (organization_id, agent_id);
create index idx_offers_org_status on offers (organization_id, status);
create index idx_offers_unit on offers (unit_id);
create index idx_offers_lead on offers (lead_id) where lead_id is not null;
create index idx_offers_customer on offers (customer_id) where customer_id is not null;

-- ─── Reservations ─────────────────────────────────────────────────────────────
create index idx_reservations_org on reservations (organization_id);
create index idx_reservations_org_status on reservations (organization_id, status);
create index idx_reservations_unit on reservations (unit_id);
create index idx_reservations_customer on reservations (customer_id);
create index idx_reservations_expires on reservations (expires_at)
  where status = 'ACTIVE' and expires_at is not null;

-- ─── Deals ────────────────────────────────────────────────────────────────────
create index idx_deals_org on deals (organization_id);
create index idx_deals_org_agent on deals (organization_id, agent_id);
create index idx_deals_org_status on deals (organization_id, status);
create index idx_deals_org_pipeline on deals (organization_id, pipeline_stage);
create index idx_deals_org_created on deals (organization_id, created_at desc);
create index idx_deals_customer on deals (customer_id);
create index idx_deals_unit on deals (unit_id);

-- ─── Payment Plans ────────────────────────────────────────────────────────────
create index idx_payment_plans_org on payment_plans (organization_id);
create index idx_payment_plans_deal on payment_plans (deal_id);

-- ─── Installments ─────────────────────────────────────────────────────────────
create index idx_installments_org on installments (organization_id);
create index idx_installments_deal on installments (deal_id);
create index idx_installments_plan on installments (payment_plan_id);
create index idx_installments_status on installments (organization_id, status);
create index idx_installments_due on installments (due_date, status)
  where status in ('UPCOMING', 'DUE', 'OVERDUE');

-- ─── Payments ─────────────────────────────────────────────────────────────────
create index idx_payments_org on payments (organization_id);
create index idx_payments_deal on payments (deal_id);
create index idx_payments_installment on payments (installment_id) where installment_id is not null;
create index idx_payments_org_paid_at on payments (organization_id, paid_at desc);

-- ─── Commissions ──────────────────────────────────────────────────────────────
create index idx_commissions_org on commissions (organization_id);
create index idx_commissions_agent on commissions (organization_id, agent_id);
create index idx_commissions_org_status on commissions (organization_id, status);
create index idx_commissions_deal on commissions (deal_id);

-- ─── Tasks ────────────────────────────────────────────────────────────────────
create index idx_tasks_org on tasks (organization_id);
create index idx_tasks_org_assignee on tasks (organization_id, assignee_id);
create index idx_tasks_org_status on tasks (organization_id, status);
create index idx_tasks_related on tasks (organization_id, related_type, related_id)
  where related_type is not null;
create index idx_tasks_due on tasks (due_at, status)
  where status in ('TODO', 'IN_PROGRESS') and due_at is not null;

-- ─── Notifications ────────────────────────────────────────────────────────────
create index idx_notifications_user on notifications (user_id, created_at desc);
create index idx_notifications_org_unread on notifications (organization_id, user_id)
  where is_read = false;

-- ─── Communications ───────────────────────────────────────────────────────────
create index idx_communications_org on communications (organization_id);
create index idx_communications_lead on communications (lead_id) where lead_id is not null;
create index idx_communications_customer on communications (customer_id) where customer_id is not null;
create index idx_communications_org_sent on communications (organization_id, sent_at desc);

-- ─── Documents ────────────────────────────────────────────────────────────────
create index idx_documents_org on documents (organization_id);
create index idx_documents_related on documents (organization_id, related_type, related_id);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
create index idx_audit_logs_org on audit_logs (organization_id, created_at desc);
create index idx_audit_logs_actor on audit_logs (actor_id, created_at desc);
create index idx_audit_logs_entity on audit_logs (organization_id, entity_type, entity_id);

-- ─── Campaigns ────────────────────────────────────────────────────────────────
create index idx_campaigns_org on campaigns (organization_id);
