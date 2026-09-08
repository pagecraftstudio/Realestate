# Changelog

All phases of the Real Estate CRM / Sales OS.

---

## [1.0.0] — Phase 22 complete

### Phase 22 — Production Hardening + README
- Multi-stage `Dockerfile` for API (non-root user, `dumb-init`, healthcheck)
- Multi-stage `Dockerfile` for Web (Next.js standalone output)
- `docker-compose.prod.yml` — Redis + API (2 replicas) + Web with rolling update config
- `.env.prod.example` — full production secrets template with comments
- `.gitignore` — covers node_modules, .next, dist, all .env except examples
- `.dockerignore` (root + per-app) — excludes tests, docs, .git from image context
- `GET /health` endpoint — probes DB + Redis, returns 200/503
- `.github/workflows/ci.yml` — type-check → unit tests → lint → build → docker push
- `.github/workflows/deploy.yml` — SSH rolling deploy on CI success
- `README.md` — complete quick-start, env reference, test guide, deployment, API table, RBAC, project structure, CI/CD secrets

### Phase 21 — Testing
- `buildings/__tests__/buildings.test.ts` — CRUD, auto-floor creation, delete guard, tenant isolation
- `floors/__tests__/floors.test.ts` — CRUD, duplicate floor guard, delete guard
- `units/__tests__/units.test.ts` — CRUD, status transition guards, bulk-status, availability, tenant isolation
- `tests/security/security.test.ts` — IDOR, RLS bypass, JWT abuse, role escalation, storage access
- `tests/regression/regression.test.ts` — end-to-end M1–M19 smoke tests
- Root `package.json` test scripts: `test`, `test:unit`, `test:unit:watch`, `test:security`, `test:regression`, `test:integration`

### Phase 20 — All Module UI Pages
- All frontend pages: dashboard, leads, customers, pipeline, projects, buildings, units, viewings, offers, reservations, deals, payments, installments, commissions, tasks, calendar, communication, reports, analytics, team, settings
- Detail pages: leads/[id], customers/[id], projects/[id], units/[id], deals/[id]

### Phase 19 — Dashboard (role-aware)
- Dashboard KPI cards, pipeline funnel, agent leaderboard
- Role-filtered view per RBAC

### Phase 18 — Frontend Shell + Auth Pages
- Next.js 14 App Router shell — sidebar, topbar, breadcrumbs
- Login + register org pages
- Zustand auth store + toast store
- Supabase SSR client (`@supabase/ssr`)
- next-intl AR/EN, RTL/LTR support

### Phase 17 — Audit Logs
- `audit_logs` table, RLS
- `auditLogsRoutes` — admin-only list with filters
- Audit middleware auto-logs mutations

### Phase 16 — Analytics + Reports
- Dashboard KPIs: revenue, conversion rate, pipeline value, unit availability
- Sales funnel: lead → viewing → offer → reservation → deal
- Agent performance: deals closed, commission earned
- Property analytics: project/unit status breakdown

### Phase 15 — Documents
- Multipart upload via `@fastify/multipart`
- Supabase Storage (replaces MinIO/S3): `recrm-documents`, `recrm-avatars`, `recrm-property` buckets
- Signed download URL generation
- Document polymorphic relation (leads, customers, deals, units)

### Phase 14 — Communications + WhatsApp Webhook
- `communications` table — WhatsApp / Email / Call logs
- WhatsApp Cloud API provider + null provider for dev
- Webhook verification + inbound message ingestion

### Phase 13 — Tasks + Notifications
- `tasks` table — assignee, due_at, priority, status, polymorphic related entity
- `notifications` table — user-scoped, read/unread, real-time delivery
- Supabase Realtime channel for `notifications`

### Phase 12 — Commissions
- `commissions` table — agent + manager rates, amounts, status
- Auto-calculate on deal close
- Mark paid workflow

### Phase 11 — Payment Plans + Installments + Payments
- `payment_plans` → `installments` — auto-generated schedule (monthly/quarterly/annually)
- `payments` — record payment against installment, receipt URL
- Overdue installment detection

### Phase 10 — Deals + Pipeline
- `deals` table with pipeline stages
- Stage transition validation
- Deal → reservation → unit SOLD flow

### Phase 9 — Offers + Reservations
- `offers` — expiry-aware, status lifecycle
- `reservations` — unit lock with unique constraint on active reservation
- Reservation expiry via BullMQ job

### Phase 8 — Viewings
- `viewings` — scheduled_at, status, outcome, notes
- Calendar view support

### Phase 7 — Customer Management
- `customers` — CRM profile, lead conversion
- Full profile with deal/payment history

### Phase 6 — Lead Management
- `leads` — full qualification fields, temperature, budget, preferences
- Lead timeline (`lead_activities`)
- Lead scoring engine + rules
- Round-robin and manual assignment

### Phase 5 — Property Hierarchy
- `projects` → `buildings` → `floors` → `units`
- Building creation auto-generates floors
- Unit status machine (AVAILABLE / RESERVED / SOLD / ON_HOLD / CONTRACTED)
- Bulk status update

### Phase 4 — User & Team Management
- `users` + `user_profiles` — 8 roles
- `teams` — assignment groups
- Invite member flow

### Phase 3 — Auth
- Supabase Auth integration
- Register org flow (creates org + admin user)
- JWT middleware + RBAC permission matrix
- Refresh token rotation via Redis
- Access token blacklist on logout

### Phase 2 — DB Schema + Prisma + Seed
- Full Prisma schema (all tables from architecture)
- Supabase migrations 00001–00008
- RLS policies per table per role
- Seed data (org, admin, projects, units, leads, deals)

### Phase 1 — Architecture
- Tech stack, multi-tenancy strategy, domain model, RBAC matrix, API structure, folder layout, implementation roadmap
