# Phase 1: Architecture
## Real Estate CRM / Sales Operating System

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Backend** | Node.js + TypeScript + Fastify |
| **ORM** | Prisma |
| **DB** | PostgreSQL |
| **Auth** | JWT + refresh tokens (httpOnly cookies) |
| **Queue** | BullMQ + Redis |
| **Storage** | S3-compatible (MinIO local / AWS prod) |
| **Cache** | Redis |
| **Frontend** | Next.js 14 (App Router) + TypeScript |
| **UI** | Tailwind CSS + shadcn/ui |
| **State** | Zustand + React Query (TanStack) |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **i18n** | next-intl (AR/EN, RTL/LTR) |
| **WhatsApp** | WhatsApp Cloud API |
| **Infra** | Docker + Docker Compose (dev) → Railway/Render/VPS (prod) |

---

## Multi-Tenancy Model

**Strategy:** Shared DB, shared schema, `organization_id` on every tenant-owned table.

Row-Level Security via Postgres RLS + Prisma middleware enforcing `organizationId` filter on every query. No frontend-only filtering.

```
organizations → users → [leads, customers, properties, deals...]
                                ↑
                      organizationId FK on all
```

---

## Domain Model

```
ORGANIZATION (tenant)
├── USERS (roles: SUPER_ADMIN, COMPANY_ADMIN, SALES_MANAGER,
│         SALES_AGENT, MARKETING_MANAGER, ACCOUNTANT,
│         PROPERTY_MANAGER, VIEWER)
├── TEAMS
│
├── LEADS → CUSTOMERS
│    └── LEAD_ACTIVITIES (timeline)
│
├── PROJECTS
│    └── BUILDINGS
│         └── FLOORS
│              └── UNITS (status: AVAILABLE|RESERVED|SOLD|HOLD)
│
├── VIEWINGS (lead/customer + unit)
├── OFFERS
├── RESERVATIONS (unit lock + expiry)
├── DEALS
│    ├── PAYMENT_PLANS
│    ├── INSTALLMENTS
│    └── PAYMENTS
│
├── COMMISSIONS
├── TASKS
├── NOTIFICATIONS
├── COMMUNICATIONS (WhatsApp/Email/Call logs)
├── DOCUMENTS
└── AUDIT_LOGS
```

---

## Database Schema (Core Tables)

```sql
-- TENANT
organizations         id, name, slug, plan, status, settings, created_at

-- IDENTITY
users                 id, org_id, email, password_hash, role, status
user_profiles         user_id, first_name, last_name, phone, avatar

-- PROPERTY HIERARCHY
projects              id, org_id, name, developer, location, lat, lng, status, ...
buildings             id, org_id, project_id, name, floors_count, ...
floors                id, building_id, floor_number
units                 id, org_id, project_id, building_id, floor_id,
                      unit_number, type, area, price,
                      status(AVAILABLE/RESERVED/SOLD/HOLD),
                      bedroom_count, bathroom_count, ...

-- PIPELINE
leads                 id, org_id, assigned_agent_id, team_id,
                      full_name, phone, whatsapp, email,
                      source, campaign_id, status, temperature,
                      budget_min, budget_max, preferred_type,
                      preferred_location, bedrooms, area_min, area_max,
                      purchase_purpose, financing_preference,
                      lead_score, next_followup_at, last_contacted_at, ...

lead_activities       id, lead_id, org_id, actor_id, type, payload, created_at

customers             id, org_id, lead_id(nullable), assigned_agent_id,
                      full_name, phone, email, ...

viewings              id, org_id, lead_id, customer_id, unit_id, agent_id,
                      scheduled_at, status, outcome, notes

offers                id, org_id, lead_id, customer_id, unit_id, agent_id,
                      offered_price, status, expires_at, ...

reservations          id, org_id, unit_id, customer_id, deal_id,
                      reserved_at, expires_at, status
                      -- UNIQUE constraint: unit_id WHERE status=ACTIVE

deals                 id, org_id, customer_id, unit_id, agent_id,
                      deal_value, status, pipeline_stage, ...

payment_plans         id, deal_id, org_id, total_amount, down_payment,
                      installment_count, frequency, ...

installments          id, payment_plan_id, deal_id, org_id,
                      due_date, amount, status, ...

payments              id, org_id, deal_id, installment_id,
                      amount, paid_at, method, receipt_url, ...

commissions           id, org_id, deal_id, agent_id, manager_id,
                      agent_rate, manager_rate, agent_amount, manager_amount,
                      status, paid_at, ...

-- SUPPORT
tasks                 id, org_id, assignee_id, related_type, related_id,
                      title, due_at, priority, status

notifications         id, org_id, user_id, type, payload, read, created_at

communications        id, org_id, lead_id, customer_id, channel, direction,
                      content, sent_at, ...

documents             id, org_id, related_type, related_id, name, url, ...

audit_logs            id, org_id, actor_id, action, entity_type, entity_id,
                      before, after, created_at

campaigns             id, org_id, name, source, budget, ...

lead_scoring_rules    id, org_id, signal, points
```

---

## RBAC Model

| Role | Scope |
|------|-------|
| `SUPER_ADMIN` | All orgs, platform config |
| `COMPANY_ADMIN` | Full org scope |
| `SALES_MANAGER` | Leads, customers, team, deals, analytics (org scope) |
| `SALES_AGENT` | Own assigned leads/customers/viewings/deals only |
| `MARKETING_MANAGER` | Campaigns, lead sources, analytics |
| `ACCOUNTANT` | Payments, installments, commissions, financial reports |
| `PROPERTY_MANAGER` | Projects, buildings, floors, units |
| `VIEWER` | Read-only org scope |

Permission check: `middleware(role, resource, action)` → deny by default, explicit allow per role×resource×action matrix. Enforced at API layer, not UI.

---

## API Architecture

```
/api/v1/
  auth/           login, refresh, logout, me
  orgs/           CRUD (SUPER_ADMIN)
  users/          team management
  leads/          CRUD + assign + timeline + score
  customers/      CRUD + full profile
  projects/       CRUD
  buildings/      CRUD
  floors/         CRUD
  units/          CRUD + availability
  viewings/       CRUD + calendar
  offers/         CRUD
  reservations/   reserve + cancel + expire
  deals/          CRUD + pipeline
  payment-plans/  generate + CRUD
  installments/   list + mark paid
  payments/       record + history
  commissions/    calculate + list + pay
  tasks/          CRUD
  notifications/  list + mark read
  communications/ log + WhatsApp webhook
  documents/      upload + list
  analytics/      dashboard KPIs, funnel, agent perf
  audit-logs/     list (admin only)
  campaigns/      CRUD
  settings/       org config, lead statuses, scoring rules
```

All routes: authenticate → extract `organizationId` from JWT → inject into every query.

---

## Frontend Architecture

```
app/
  (auth)/           login, register org
  (app)/
    layout.tsx      shell: sidebar + topbar
    dashboard/
    leads/          [id]/
    customers/      [id]/
    pipeline/
    projects/       [id]/
    buildings/
    units/          [id]/
    viewings/
    offers/
    reservations/
    deals/          [id]/
    payments/
    installments/
    commissions/
    tasks/
    calendar/
    communication/
    reports/
    analytics/
    team/
    settings/
    admin/          (SUPER_ADMIN only)
```

Server components for data fetch. Client components for interactivity. TanStack Query for mutations + cache invalidation.

---

## Folder Structure

```
/
├── apps/
│   ├── api/                      Fastify backend
│   │   ├── src/
│   │   │   ├── modules/          one folder per domain
│   │   │   │   ├── leads/        routes, service, schema, types
│   │   │   │   ├── deals/
│   │   │   │   └── ...
│   │   │   ├── middleware/       auth, tenant, rbac, audit
│   │   │   ├── lib/              prisma, redis, s3, queue
│   │   │   ├── utils/
│   │   │   └── main.ts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── migrations/
│   │       └── seed.ts
│   └── web/                      Next.js frontend
│       ├── app/
│       ├── components/
│       │   ├── ui/               shadcn base
│       │   ├── shared/           reusable app components
│       │   └── modules/          leads/, deals/, ...
│       ├── lib/                  api client, auth, hooks
│       ├── stores/               zustand
│       └── i18n/                 en.json, ar.json
├── packages/
│   ├── types/                    shared TS types
│   └── utils/                    shared utils
├── docker-compose.yml
└── .env.example
```

Monorepo via **pnpm workspaces**.

---

## Implementation Roadmap

| Phase | Scope |
|-------|-------|
| 2 | DB schema + Prisma setup + seed |
| 3 | Auth (register org, login, JWT, RBAC middleware) |
| 4 | User & team management |
| 5 | Property hierarchy (Project→Building→Floor→Unit) |
| 6 | Lead management + timeline + scoring + assignment |
| 7 | Customer management |
| 8 | Viewings |
| 9 | Offers + Reservations (with unit lock) |
| 10 | Deals + Pipeline |
| 11 | Payment plans + Installments + Payments |
| 12 | Commissions |
| 13 | Tasks + Notifications |
| 14 | Communications + WhatsApp webhook |
| 15 | Documents |
| 16 | Analytics + Reports |
| 17 | Audit logs |
| 18 | Frontend shell + auth pages |
| 19 | Dashboard (role-aware) |
| 20 | All module UI pages |
| 21 | Testing |
| 22 | Production hardening + README |