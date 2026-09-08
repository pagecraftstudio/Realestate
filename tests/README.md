# Integration & Security Tests — Setup Guide

These tests require two live test organisations seeded in your Supabase project.
They **cannot** run against the production database.

---

## Prerequisites

1. A running local or staging Supabase project
2. `apps/api/.env` (or `apps/api/.env.test`) pointing at that project
3. Two test orgs created via the register endpoint (see below)

---

## Step 1 — Create test organisations

Run these two `curl` calls against your local API (`pnpm dev:api` first):

```bash
# Org A
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "orgName":    "Test Org A",
    "orgSlug":    "test-org-a",
    "firstName":  "Admin",
    "lastName":   "A",
    "email":      "admin-a@test.recrm.dev",
    "password":   "TestPass123"
  }'

# Org B
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "orgName":    "Test Org B",
    "orgSlug":    "test-org-b",
    "firstName":  "Admin",
    "lastName":   "B",
    "email":      "admin-b@test.recrm.dev",
    "password":   "TestPass123"
  }'
```

---

## Step 2 — Create `tests/.env.test`

Copy the example and fill in the values from Step 1:

```bash
cp tests/.env.test.example tests/.env.test
```

```env
# tests/.env.test

# API base URL
API_URL=http://localhost:4000

# Org A credentials (created in Step 1)
TEST_ORG_A_EMAIL=admin-a@test.recrm.dev
TEST_ORG_A_PASSWORD=TestPass123

# Org B credentials (created in Step 1)
TEST_ORG_B_EMAIL=admin-b@test.recrm.dev
TEST_ORG_B_PASSWORD=TestPass123
```

> **Do not commit `tests/.env.test`** — it is gitignored.

---

## Step 3 — Run the tests

```bash
# Security tests (cross-tenant isolation, RBAC, rate limiting)
pnpm --filter api exec vitest run tests/security/security.test.ts

# Regression tests (end-to-end flow: lead → deal → payment)
pnpm --filter api exec vitest run tests/regression/regression.test.ts
```

---

## What the tests cover

| Suite | What it checks |
|-------|---------------|
| `security.test.ts` | Org A cannot read/write Org B data (RLS isolation); unauthenticated routes return 401; role gates return 403 |
| `regression.test.ts` | Full happy path: register org → create lead → qualify → create deal → payment plan → record payment |

---

## Resetting test data

The tests are **not idempotent** — re-running them against the same orgs may
cause unique constraint errors. Reset by either:

- Deleting the two test orgs from Supabase Auth dashboard + running `prisma migrate reset` on the test DB, or
- Using a fresh Supabase project for each CI run (recommended for CI).
