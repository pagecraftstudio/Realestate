# ReCRM — Real Estate CRM / Sales Operating System

Full-stack, multi-tenant real estate CRM. **All 22 phases complete.**

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Quick Start (Local Dev)](#quick-start-local-dev)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Running Tests](#running-tests)
7. [Production Deployment](#production-deployment)
8. [API Reference](#api-reference)
9. [Roles & Permissions](#roles--permissions)
10. [Project Structure](#project-structure)

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Backend | Node.js 20 + TypeScript + Fastify 4 |
| ORM | Prisma 5 |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth (JWT) |
| Queue | BullMQ + Redis 7 |
| Storage | Supabase Storage |
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| i18n | next-intl (AR/EN, RTL/LTR) |
| WhatsApp | WhatsApp Cloud API |
| Infra | Docker + Docker Compose |
| Tests | Vitest (unit + integration + security + regression) |

---

## Architecture

**Multi-tenancy:** Shared database, shared schema. Every tenant-owned table has `organization_id`. Row-Level Security enforced at the Postgres layer via Supabase RLS policies. Prisma middleware enforces `organizationId` filter on every query as a second layer.

**Auth flow:** Supabase Auth issues JWTs → API middleware verifies via `supabaseAdmin.auth.getUser()` → looks up app user row → attaches `AuthUser` to request. Refresh tokens stored in Redis with per-user revocation support.

**Domain model:**
```
Organization (tenant)
├── Users (8 roles)
├── Teams
├── Leads → Customers
│    └── Lead Activities (timeline)
├── Projects → Buildings → Floors → Units
├── Viewings
├── Offers
├── Reservations (unit lock with expiry)
├── Deals → Payment Plans → Installments → Payments
├── Commissions
├── Tasks + Notifications
├── Communications (WhatsApp / Email / Call logs)
├── Documents (Supabase Storage)
└── Audit Logs
```

---

## Quick Start (Local Dev)

### Prerequisites

- Node.js 20+
- pnpm 9+  (`npm install -g pnpm@9`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- Docker Desktop (for local Supabase or Redis)

### 1. Clone and install

```bash
git clone <repo>
cd recrm20_working
pnpm install
```

### 2. Start local Supabase

```bash
supabase start
# Outputs: API URL, anon key, service role key — use these in .env
```

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.
```

### 4. Apply migrations

```bash
# Option A — Supabase CLI (recommended)
supabase db push

# Option B — SQL editor in order:
# supabase/migrations/00001_initial_schema.sql
# supabase/migrations/00003_indexes.sql
# supabase/migrations/00004_rls_policies.sql
# supabase/migrations/00005_auth_migration.sql
# supabase/migrations/00006_org_membership.sql
# supabase/migrations/00007_storage.sql
# supabase/migrations/00008_realtime.sql
```

### 5. Generate Prisma client and seed

```bash
pnpm db:generate
pnpm db:seed
```

### 6. Start Redis (for BullMQ + rate limiting)

```bash
docker compose up redis -d
# Or standalone: docker run -p 6379:6379 redis:7-alpine
```

### 7. Run dev servers

```bash
pnpm dev          # API (port 4000) + Web (port 3000) concurrently
pnpm dev:api      # API only
pnpm dev:web      # Web only
```

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key — server only, never expose |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret from Supabase dashboard |
| `SUPABASE_ANON_KEY` | ✅ | Anon/public key |
| `DATABASE_URL` | ✅ | Postgres connection string (use Session Pooler in prod) |
| `REDIS_URL` | ✅ | Redis connection URL |
| `COOKIE_SECRET` | ✅ | Min 32 random chars — generate: `openssl rand -hex 32` |
| `CORS_ORIGIN` | ✅ | Comma-separated allowed origins |
| `PORT` | — | Default: `4000` |
| `NODE_ENV` | — | `development` \| `production` |
| `LOG_LEVEL` | — | Default: `info` |
| `WHATSAPP_PROVIDER` | — | `null` \| `cloud` |

### Web (`apps/web/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Same as API `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon/public key — safe for browser |
| `NEXT_PUBLIC_API_URL` | ✅ | Fastify API base URL |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app URL |

---

## Database Setup

### Supabase Storage buckets

The migration `00007_storage.sql` creates three private buckets:
- `recrm-documents` — contract/document uploads
- `recrm-avatars` — user avatars
- `recrm-property` — unit/project images

### RLS

All tenant tables have RLS enabled (see `00004_rls_policies.sql`). The API uses the service role key for writes and the anon key for client-side reads, both gated behind JWT verification in the Fastify middleware.

### Realtime

Channels configured in `00008_realtime.sql`:
- `leads` — live lead pipeline updates
- `notifications` — real-time notification delivery
- `units` — unit status change broadcasts

---

## Running Tests

### Unit tests (module-level, no live DB needed)

```bash
pnpm test:unit            # All 21 module test suites
pnpm test:unit:watch      # Watch mode
```

Individual module:
```bash
cd apps/api
pnpm exec vitest run src/modules/leads/__tests__/leads.test.ts
```

### Integration + security tests (requires live Supabase + running API)

```bash
# 1. Copy and fill test env
cp tests/.env.test.example tests/.env.test.local

# 2. Start API
pnpm dev:api

# 3. Run
pnpm test:security     # RLS, IDOR, JWT abuse, role escalation
pnpm test:regression   # Full end-to-end smoke (M1–M19)
pnpm test:integration  # Both
```

### All tests

```bash
pnpm test    # unit → integration
```

### Test coverage

| Suite | Count | What it covers |
|-------|-------|----------------|
| Module unit tests | 21 files | Every API module: auth, leads, customers, properties, deals, payments, commissions, tasks, notifications, comms, documents, analytics, audit |
| Security tests | 1 file | IDOR, RLS bypass, JWT abuse, role escalation, storage access |
| Regression tests | 1 file | End-to-end workflows M1–M19 |

---

## Vercel Deployment (Recommended)

Both apps deploy as two separate Vercel projects.

### 1. Deploy the API

1. Import **`apps/api`** in Vercel — set **Root Directory** to `apps/api`
2. Framework preset: **Other**
3. Build command: `pnpm vercel-build`
4. Add these environment variables:

| Variable | Where to get it |
|----------|----------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same — server only, never expose |
| `SUPABASE_JWT_SECRET` | Same |
| `SUPABASE_ANON_KEY` | Same |
| `DATABASE_URL` | Supabase → Settings → Database → **Session Pooler** URL |
| `COOKIE_SECRET` | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Your web URL e.g. `https://recrm-web.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | [upstash.com](https://upstash.com) free Redis → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Same |
| `CRON_SECRET` | `openssl rand -hex 32` |

5. Deploy — note the URL e.g. `https://recrm-api.vercel.app`

### 2. Deploy the Web

1. Import **`apps/web`** — set **Root Directory** to `apps/web`
2. Framework preset: **Next.js** (auto-detected)
3. Update `apps/web/vercel.json` — replace `https://recrm-api.vercel.app` with your real API URL
4. Add environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe for browser) |
| `NEXT_PUBLIC_API_URL` | Your API Vercel URL |
| `NEXT_PUBLIC_APP_URL` | Your web Vercel URL |

5. Deploy

### Cron (reservation expiry)

Declared in `apps/api/vercel.json` — runs every 5 minutes automatically on Vercel Pro.
On the free Hobby plan: use [cron-job.org](https://cron-job.org) (free) to call
`POST /api/cron/expire-reservations` with header `Authorization: Bearer <CRON_SECRET>`.

---

## Production Deployment (Docker — Alternative)

### Docker (recommended)

```bash
# Build images
docker build -f apps/api/Dockerfile -t recrm-api:latest .
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx \
  --build-arg NEXT_PUBLIC_API_URL=https://api.your-app.com \
  --build-arg NEXT_PUBLIC_APP_URL=https://your-app.com \
  -t recrm-web:latest .

# Run with prod compose
cp .env.prod.example .env.prod
# fill in .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Health checks

- API: `GET /health` — returns `{ status: "ok"|"degraded", checks: { db, redis } }`
- Returns `503` if DB is unreachable (Redis failure = degraded, not fatal)

### Railway / Render / Fly.io

1. Set all env vars from `.env.prod.example` in the platform dashboard
2. For API: `pnpm build:api` → start command `node apps/api/dist/main.js`
3. For Web: `pnpm build:web` → Next.js auto-detected or `node apps/web/.next/standalone/apps/web/server.js`
4. Add a managed Redis instance (Railway Redis, Upstash, etc.)

### Database in production

Use Supabase's **Session Pooler** connection string (not Transaction Pooler) — Prisma requires sticky connections for transactions.

Dashboard → Settings → Database → Connection string → Session mode.

### Migrations in production

```bash
# Apply via Supabase CLI against prod
supabase db push --db-url $PRODUCTION_DATABASE_URL

# Or via Prisma (reads DATABASE_URL from env)
pnpm --filter api db:migrate:deploy
```

### Secrets checklist

Before go-live:
- [ ] `COOKIE_SECRET` — min 32 chars, randomly generated
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — stored in secrets manager, never in code
- [ ] `REDIS_PASSWORD` — set in prod compose, not empty
- [ ] `CORS_ORIGIN` — set to your exact domain(s), not `*`
- [ ] `WHATSAPP_APP_SECRET` — if WhatsApp is enabled
- [ ] All `NEXT_PUBLIC_*` vars point to prod URLs, not localhost

---

## API Reference

Base URL: `/api/v1`

All routes (except auth) require `Authorization: Bearer <supabase-jwt>`.

| Resource | Prefix | Notes |
|----------|--------|-------|
| Auth | `/auth` | `login`, `logout`, `register`, `me`, `refresh` |
| Users | `/users` | Team member management |
| Teams | `/teams` | Team CRUD |
| Projects | `/projects` | Property hierarchy root |
| Buildings | `/buildings` | Auto-creates floors on creation |
| Floors | `/floors` | `?buildingId=` required for list |
| Units | `/units` | Status transitions, bulk-status, availability |
| Leads | `/leads` | Timeline, scoring, assignment, conversion |
| Customers | `/customers` | Full CRM profile |
| Viewings | `/viewings` | Calendar + outcome tracking |
| Offers | `/offers` | Expiry-aware |
| Reservations | `/reservations` | Unit lock with expiry |
| Deals | `/deals` | Pipeline stages |
| Payment Plans | `/payment-plans` | Auto-generates installments |
| Installments | `/installments` | Mark paid |
| Payments | `/payments` | Record + receipt |
| Commissions | `/commissions` | Calculate, list, mark paid |
| Tasks | `/tasks` | Assignee + priority |
| Notifications | `/notifications` | Mark read |
| Communications | `/communications` | WhatsApp / Email / Call logs |
| Documents | `/documents` | Upload via multipart, signed download URLs |
| Analytics | `/analytics` | Dashboard KPIs, funnel, agent performance |
| Audit Logs | `/audit-logs` | Admin only |
| Campaigns | `/campaigns` | Lead source tracking |

---

## Roles & Permissions

| Role | Scope |
|------|-------|
| `SUPER_ADMIN` | All organizations, platform config |
| `COMPANY_ADMIN` | Full org scope |
| `SALES_MANAGER` | Leads, customers, team, deals, analytics (org scope) |
| `SALES_AGENT` | Own assigned leads / customers / viewings / deals only |
| `MARKETING_MANAGER` | Campaigns, lead sources, analytics |
| `ACCOUNTANT` | Payments, installments, commissions, financial reports |
| `PROPERTY_MANAGER` | Projects, buildings, floors, units |
| `VIEWER` | Read-only org scope |

Permission enforcement: API middleware → explicit allow per `role × resource × action` matrix. Deny by default. Not UI-only.

---

## CI / CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | Push / PR to `main` or `develop` | type-check → unit tests → lint → build → docker push (main only) |
| `deploy.yml` | CI passes on `main` | SSH into prod host, `docker compose pull && up` |

### Required GitHub Secrets

| Secret | Used by |
|--------|---------|
| `GITHUB_TOKEN` | Auto-provided — GHCR push |
| `NEXT_PUBLIC_SUPABASE_URL` | Web Docker build arg |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web Docker build arg |
| `NEXT_PUBLIC_API_URL` | Web Docker build arg |
| `NEXT_PUBLIC_APP_URL` | Web Docker build arg |
| `DEPLOY_HOST` | SSH deploy target |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | SSH private key |

Images pushed to GHCR: `ghcr.io/<org>/recrm-api:<sha>` and `ghcr.io/<org>/recrm-web:<sha>`, also tagged `latest`.

---

## Project Structure

```
/
├── apps/
│   ├── api/                        Fastify backend
│   │   ├── src/
│   │   │   ├── modules/            One folder per domain
│   │   │   │   ├── auth/           routes · service · schema · __tests__
│   │   │   │   ├── leads/
│   │   │   │   ├── deals/
│   │   │   │   └── ...             (21 modules total)
│   │   │   ├── middleware/         authenticate · rbac · audit
│   │   │   ├── lib/                prisma · redis · supabase · storage · whatsapp
│   │   │   ├── types/
│   │   │   ├── utils/              errors
│   │   │   └── main.ts             Fastify server entry
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── web/                        Next.js 14 frontend
│       ├── app/
│       │   ├── (auth)/             login · register
│       │   └── (app)/              dashboard · leads · customers · pipeline
│       │       │                   projects · units · deals · payments
│       │       │                   commissions · tasks · reports · analytics
│       │       │                   team · settings · calendar · communication
│       │       └── layout.tsx      Shell: sidebar + topbar
│       ├── components/
│       │   ├── ui/                 shadcn base components
│       │   └── modules/            leads · deals · units · commissions · ...
│       ├── lib/
│       │   ├── supabase/           server.ts · client.ts
│       │   ├── realtime/           subscriptions · hooks
│       │   ├── hooks/              use-leads · use-deals · use-units · ...
│       │   ├── auth.ts
│       │   └── api.ts
│       ├── stores/                 Zustand: auth · toast
│       ├── i18n/                   en.json · ar.json
│       ├── Dockerfile
│       └── next.config.ts
│
├── packages/
│   └── types/                      Shared TypeScript types
│
├── supabase/
│   ├── migrations/                 00001 → 00008 (apply in order)
│   ├── functions/                  Edge functions
│   └── config.toml
│
├── tests/
│   ├── helpers/fixtures.ts         Shared test helpers
│   ├── security/security.test.ts   RLS + auth attack vectors
│   └── regression/regression.test.ts  Full workflow M1–M19
│
├── scripts/
│   └── migrate-to-supabase.ts      Data migration helper
│
├── docs/
│   ├── architecture.md
│   ├── Master_Prompt.md
│   └── SUPABASE_MIGRATION_MASTER_PROMPT.md
│
├── docker-compose.yml              Local dev (Redis only — DB = local Supabase)
├── docker-compose.prod.yml         Production (Redis + API + Web)
├── .env.prod.example
├── .gitignore
└── README.md
```


