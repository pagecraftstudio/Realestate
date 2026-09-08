# Supabase Migration Plan
## Real Estate CRM — Phases A–M

> Generated after full repository audit. Do not start destructive changes before reviewing this document.

---

## Phase A — Repository Audit Findings

### A1. Current Database Implementation

- **ORM:** Prisma 5.x — deeply integrated into ALL 20+ service files via `prisma.$transaction`, `prisma.findFirst`, `prisma.updateMany`, etc.
- **DB:** PostgreSQL via `DATABASE_URL` env var
- **Schema:** `apps/api/prisma/schema.prisma` — 1,302 lines, 35 models, 31 enums
- **Migrations:** None yet committed (schema-first via `prisma db push` or `prisma migrate dev` in dev)
- **Seed:** `apps/api/prisma/seed.ts` — creates demo org, users, properties, leads

### A2. All 35 Prisma Models → SQL Tables

| Prisma Model | SQL Table | Tenant-owned |
|---|---|---|
| Organization | organizations | — (root tenant) |
| User | users | yes (organizationId) |
| UserProfile | user_profiles | via user |
| RefreshToken | refresh_tokens | via user |
| Team | teams | yes |
| TeamMember | team_members | via team |
| Campaign | campaigns | yes |
| Lead | leads | yes |
| LeadActivity | lead_activities | yes |
| LeadSavedUnit | lead_saved_units | via lead |
| Customer | customers | yes |
| CustomerSavedUnit | customer_saved_units | via customer |
| Project | projects | yes |
| Building | buildings | yes |
| Floor | floors | via building |
| Unit | units | yes |
| PaymentPlanTemplate | payment_plan_templates | via project |
| Viewing | viewings | yes |
| Offer | offers | yes |
| Reservation | reservations | yes |
| Deal | deals | yes |
| PaymentPlan | payment_plans | yes |
| Installment | installments | yes |
| Payment | payments | yes |
| CommissionRule | commission_rules | yes |
| Commission | commissions | yes |
| Task | tasks | yes |
| Notification | notifications | yes |
| Communication | communications | yes |
| Document | documents | yes |
| AuditLog | audit_logs | yes |
| LeadStatusConfig | lead_status_configs | yes |
| LeadScoringRule | lead_scoring_rules | yes |
| PipelineStageConfig | pipeline_stage_configs | yes |
| AssignmentRule | assignment_rules | yes |

### A3. Current Authentication

- **Method:** Custom JWT (`@fastify/jwt`) + httpOnly refresh token cookie + Redis blacklist
- **Flow:** `POST /api/v1/auth/login` → bcrypt compare → sign access+refresh JWTs → store refresh JTI in Redis → return access token in JSON body
- **Frontend:** Access token stored in `localStorage`, attached via Axios interceptor. Refresh via `POST /api/v1/auth/refresh` on 401.
- **Middleware:** `authenticate.ts` — `request.jwtVerify()` + Redis blacklist check → injects `authUser` onto request
- **Key files:** `auth.service.ts`, `authenticate.ts`, `redis.ts`, `web/lib/auth.ts`, `web/lib/api.ts`

### A4. Current RBAC

- **Location:** `apps/api/src/lib/rbac.ts`
- **Model:** Static role×resource×action permission matrix (8 roles × 25 resources)
- **Enforcement:** `requirePermission(resource, action)` Fastify preHandler → calls `assertCan(role, resource, action)`
- **Roles:** `SUPER_ADMIN`, `COMPANY_ADMIN`, `SALES_MANAGER`, `SALES_AGENT`, `MARKETING_MANAGER`, `ACCOUNTANT`, `PROPERTY_MANAGER`, `VIEWER`
- **Source of role:** JWT payload `role` field (set at login, sourced from DB)

### A5. Current Tenant Isolation

- **Strategy:** `organization_id` FK on every tenant-owned table
- **Enforcement:** Prisma middleware injects `organizationId` from JWT into every query's `where` clause
- **NOT enforced at DB level** — no RLS exists yet; isolation is application-layer only
- **Risk:** A compromised Fastify service could access any org's data

### A6. Current Storage

- **Implementation:** `apps/api/src/lib/storage.ts` — AWS SDK S3 client
- **Local dev:** MinIO via Docker Compose
- **Production:** AWS S3 (when `S3_ENDPOINT` is omitted)
- **Pattern:** Private bucket, presigned GET URLs (15 min TTL), org-prefixed keys: `orgs/{orgId}/{type}/{id}/{ts}-{rand}.ext`
- **Auth:** S3 upload via `PutObjectCommand` with `ServerSideEncryption: AES256`

### A7. Current API Auth Flow

```
Browser → Axios (Bearer token from localStorage)
  → Fastify authenticate middleware
  → jwtVerify() → Redis blacklist check
  → inject authUser { userId, organizationId, role, jti }
  → RBAC preHandler
  → service (uses authUser.organizationId for all queries)
```

### A8. Current Frontend Auth Flow

```
Login form → POST /api/v1/auth/login
  → store accessToken in localStorage
  → Axios interceptor attaches Bearer header
  → 401 → auto-refresh → retry
  → logout → DELETE localStorage + POST /api/v1/auth/logout
```

Middleware (`web/middleware.ts`) checks `refreshToken` cookie for existence — not cryptographically verified.

### A9. Current Environment Variables

**Backend (`apps/api/.env.example`):**
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis for token blacklist + BullMQ
- `JWT_SECRET` — HMAC secret for `@fastify/jwt`
- `COOKIE_SECRET` — Fastify cookie signing
- `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
- `WHATSAPP_*` — WhatsApp Cloud API credentials

**Frontend (`apps/web/.env.example`):**
- `NEXT_PUBLIC_API_URL` — Fastify URL
- `NEXT_PUBLIC_APP_URL` — Next.js URL

### A10. Existing Migrations

None committed. Schema managed via `prisma db push` (dev) or `prisma migrate dev`.

### A11. Existing Seed Data

`prisma/seed.ts`: demo org + admin user + sales manager + 2 agents + 3 projects + buildings + units + leads.

### A12. Existing Tests

Vitest unit tests per module (in `__tests__/` dirs). All use `vi.mock('../../../lib/prisma.js')` — mock-based, no DB integration tests.

---

## Prisma Decision

**Decision: KEEP PRISMA for now.**

Rationale:
- Prisma is in every service file. Removing it during migration = two breaking changes simultaneously.
- Supabase PostgreSQL is standard PostgreSQL — Prisma connects to it with zero code changes (only `DATABASE_URL` changes).
- RLS is enforced at the DB layer (Supabase) independently of Prisma.
- Prisma remains the type-safe query layer; Supabase provides the managed PG infrastructure + Auth + Storage + Realtime.
- Migration path: `DATABASE_URL` → Supabase PostgreSQL connection string. Done.
- Future: Can migrate individual modules to Supabase client if desired, but not required.

**Single source of truth for schema:** Supabase migration SQL files in `supabase/migrations/`. Prisma schema stays in sync but does NOT manage migrations in production. `prisma generate` is still used for types.

---

## Files to Modify

| File | Change |
|---|---|
| `apps/api/.env.example` | Add Supabase vars, replace DATABASE_URL |
| `apps/api/src/lib/prisma.ts` | Point to Supabase PG (env var only) |
| `apps/api/src/lib/storage.ts` | Replace S3 client with Supabase Storage client |
| `apps/api/src/middleware/authenticate.ts` | Replace JWT verify with Supabase JWT verify |
| `apps/api/src/modules/auth/auth.service.ts` | Replace custom JWT/bcrypt with Supabase Auth Admin SDK |
| `apps/api/src/modules/auth/auth.routes.ts` | Adapt endpoints to proxy Supabase Auth |
| `apps/api/src/modules/users/users.service.ts` | Add `authUserId` (Supabase UID) to user model |
| `apps/web/.env.example` | Add Supabase public vars |
| `apps/web/lib/auth.ts` | Replace with Supabase client auth |
| `apps/web/lib/api.ts` | Use Supabase session token instead of localStorage |
| `apps/web/middleware.ts` | Use Supabase SSR session check |

## Files to Create

| File | Purpose |
|---|---|
| `supabase/config.toml` | Supabase CLI config |
| `supabase/migrations/00001_initial_schema.sql` | Full schema as Supabase migration |
| `supabase/migrations/00002_rls_policies.sql` | RLS for all tenant tables |
| `supabase/migrations/00003_indexes.sql` | Compound indexes for query patterns |
| `supabase/seed.sql` | Seed for Supabase (enums + demo data) |
| `apps/api/src/lib/supabase.ts` | Supabase Admin client (server-only) |
| `apps/web/lib/supabase/client.ts` | Supabase browser client |
| `apps/web/lib/supabase/server.ts` | Supabase SSR server client |
| `packages/types/database.types.ts` | Generated Supabase DB types |

## Files to Remove (after migration complete)

| File | Reason |
|---|---|
| `apps/api/src/lib/storage.ts` | Replaced by Supabase Storage |
| (partial) `apps/api/src/modules/auth/auth.service.ts` | bcrypt + JWT logic removed |

---

## Risks

| Risk | Mitigation |
|---|---|
| Prisma vs Supabase migration conflict | Supabase migrations are source of truth; Prisma uses `prisma db pull` to sync |
| RLS blocking Prisma queries | Fastify uses service-role connection (bypasses RLS); per-user queries use anon+JWT |
| Token format change (custom JWT → Supabase JWT) | All existing tokens invalidated on cutover — planned maintenance window |
| localStorage access token exposure | Replaced by Supabase httpOnly cookie session |
| Storage key format change | Preserve existing `orgs/{orgId}/...` key prefix in Supabase Storage |

## Rollback Strategy

1. Keep `DATABASE_URL` pointing to old PostgreSQL until Supabase DB verified
2. Feature flag: `USE_SUPABASE_AUTH=true` env var gates auth path
3. Prisma schema unchanged — rollback = revert `DATABASE_URL`
4. Git tag `pre-supabase-migration` before any destructive change

---

## Phase Execution Order

- **Phase A** — This document ✓
- **Phase B** — Supabase project config + environment setup
- **Phase C** — DB schema SQL migration files
- **Phase D** — RLS policies
- **Phase E** — Auth migration (Supabase Auth replacing custom JWT)
- **Phase F** — User/org membership model update
- **Phase G** — Storage migration (S3 → Supabase Storage)
- **Phase H** — Fastify auth context update
- **Phase I** — Frontend auth migration
- **Phase J** — Realtime integration
- **Phase K** — Data migration scripts
- **Phase L** — Security testing
- **Phase M** — Regression testing
