# SUPABASE MIGRATION MASTER PROMPT
## Real Estate CRM / Sales Operating System
### Migrate the EXISTING Phase 1–20 implementation — DO NOT rebuild from scratch

---

# 1. YOUR ROLE

You are a senior:

- Software Architect
- Supabase Architect
- PostgreSQL Engineer
- Backend Engineer
- Security Engineer
- Full-Stack Engineer
- DevOps Engineer

You are working on an EXISTING Real Estate CRM / Real Estate Sales Operating System.

The project has already completed Phases 1–20.

DO NOT rebuild the application from scratch.

DO NOT discard existing functionality.

DO NOT redesign the product unnecessarily.

Your job is to migrate the existing architecture and implementation to use Supabase as the core managed backend infrastructure while preserving the existing business functionality and UI.

---

# 2. CURRENT ARCHITECTURE

The existing project currently uses:

Frontend:
- Next.js 14
- App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- React Hook Form
- Zod
- Recharts
- next-intl

Backend:
- Node.js
- TypeScript
- Fastify

Database:
- PostgreSQL
- Prisma

Authentication:
- Custom JWT
- Refresh tokens
- httpOnly cookies

Infrastructure:
- Redis
- BullMQ
- S3-compatible storage

Communication:
- WhatsApp Cloud API

The existing application is a multi-tenant Real Estate CRM.

---

# 3. TARGET ARCHITECTURE

Migrate the infrastructure to:

Frontend:
Next.js

Authentication:
Supabase Auth

Database:
Supabase PostgreSQL

Database security:
PostgreSQL Row Level Security

Storage:
Supabase Storage

Realtime:
Supabase Realtime where useful

Backend:
Fastify remains in the architecture.

Redis:
Keep Redis where caching/background infrastructure benefits from it.

BullMQ:
Keep BullMQ for background jobs where appropriate.

WhatsApp:
Keep WhatsApp Cloud API.

---

# 4. CRITICAL MIGRATION PRINCIPLE

This is a MIGRATION.

It is NOT a rewrite.

Before modifying anything:

1. Inspect the entire existing repository.
2. Understand the current database schema.
3. Understand the Prisma schema.
4. Understand authentication.
5. Understand middleware.
6. Understand tenant isolation.
7. Understand RBAC.
8. Understand file storage.
9. Understand API routes.
10. Understand frontend data fetching.
11. Understand existing migrations.
12. Understand existing seed data.

Create a migration plan based on the ACTUAL code.

Do not assume that the existing implementation matches the architectural documentation perfectly.

If implementation and documentation differ, inspect the implementation and preserve working functionality unless there is a security or architectural reason to change it.

---

# 5. DO NOT BREAK EXISTING FEATURES

The migration must preserve:

- Organizations
- Users
- Roles
- Teams
- Leads
- Customers
- Projects
- Buildings
- Floors
- Units
- Viewings
- Offers
- Reservations
- Deals
- Payment plans
- Installments
- Payments
- Commissions
- Tasks
- Notifications
- Communications
- Documents
- Audit logs
- Campaigns
- Lead scoring
- Analytics
- Dashboard
- Settings

---

# 6. SUPABASE PROJECT SETUP

Create a proper Supabase project structure.

Include:

supabase/
├── migrations/
├── seed.sql
├── functions/
└── config.toml

Do not put production secrets into the repository.

Create/update:

.env.example

Include appropriate Supabase environment variables.

---

# 7. DATABASE MIGRATION

Move the existing PostgreSQL database schema into Supabase PostgreSQL.

Preserve the existing domain model.

Core entities include:

organizations
users
user_profiles
teams
leads
lead_activities
customers
projects
buildings
floors
units
viewings
offers
reservations
deals
payment_plans
installments
payments
commissions
tasks
notifications
communications
documents
audit_logs
campaigns
lead_scoring_rules

Do not casually rename tables or columns.

Avoid unnecessary breaking changes.

---

# 8. PRISMA DECISION

Evaluate the current Prisma implementation.

The target architecture should prioritize Supabase-native functionality.

However:

DO NOT remove Prisma blindly.

If Prisma is currently deeply integrated into Fastify business logic, determine whether it should temporarily remain as the backend database access layer while Supabase manages the underlying PostgreSQL infrastructure.

If Prisma remains:

- Configure it against Supabase PostgreSQL correctly.
- Preserve migrations carefully.
- Avoid conflicting migration systems.
- Establish ONE clear source of truth for schema migrations.

If Prisma is removed:

- Replace its functionality with a clean Supabase/PostgreSQL data-access layer.
- Preserve type safety.
- Preserve transactions.
- Preserve validation.
- Preserve existing business logic.

Choose the lowest-risk architecture based on the actual repository.

Document the decision.

---

# 9. AUTHENTICATION MIGRATION

Replace the existing custom JWT authentication system with:

SUPABASE AUTH

Support:

- Email/password
- Login
- Logout
- Session refresh
- Password reset
- Email verification
- Current-user retrieval

Do NOT implement a second competing JWT authentication system.

Supabase Auth should become the authentication authority.

---

# 10. USER MODEL

Do NOT confuse Supabase Auth users with application users.

Use:

auth.users

for authentication identity.

Use an application-level profile/user table for CRM-specific information.

Example:

auth.users
    ↓
users
    ↓
organization membership
    ↓
role/team/profile

The application user table can contain:

- id
- auth_user_id
- organization_id
- role
- status
- team_id
- first_name
- last_name
- phone
- avatar

Do not store passwords in the application database.

---

# 11. ORGANIZATION MEMBERSHIP

Implement explicit organization membership.

A user must belong to one or more organizations only if the existing product requires this.

Prefer a membership model:

organization_members
- id
- organization_id
- user_id
- role
- status
- created_at

This makes future multi-organization access possible.

Do not rely on a frontend-selected organization ID for security.

---

# 12. MULTI-TENANCY

This is one of the highest-priority parts of the migration.

Every tenant-owned entity must have:

organization_id

Examples:

leads.organization_id
customers.organization_id
projects.organization_id
units.organization_id
deals.organization_id
payments.organization_id
documents.organization_id

etc.

Tenant isolation must be enforced by PostgreSQL RLS.

---

# 13. RLS ARCHITECTURE

Implement RLS for every tenant-owned table.

The basic security model:

authenticated user
        ↓
organization membership
        ↓
organization_id
        ↓
RLS policy
        ↓
allowed rows only

Do NOT depend on:

- React filtering
- Next.js filtering
- Fastify filtering
- Prisma middleware alone

for tenant isolation.

The database itself must enforce isolation.

---

# 14. RLS SECURITY MODEL

Create reusable authorization logic.

For example:

A user may access a row when:

1. The user is authenticated.
2. The user has membership in the row's organization.
3. Their organization membership is active.
4. Their role permits the requested operation where role-specific RLS is appropriate.

Do not create overly permissive policies such as:

USING (true)

for tenant-owned production tables.

Never expose all organizations to authenticated users.

---

# 15. SUPER ADMIN

SUPER_ADMIN requires special consideration.

Do NOT bypass tenant security simply because the role is called SUPER_ADMIN.

Platform-level access should happen through a controlled server-side mechanism.

Never expose a Supabase service-role key to the browser.

If Super Admin requires cross-tenant access:

- Perform it through trusted server-side Fastify operations.
- Use the Supabase service role only on the server.
- Audit every cross-tenant operation.

---

# 16. FASTIFY + SUPABASE

Keep Fastify as the domain/business backend unless the existing implementation makes this impractical.

Fastify responsibilities:

- Business logic
- Complex workflows
- RBAC
- Transactions
- Reservations
- Commission calculations
- Financial operations
- Webhooks
- Integrations
- Background jobs
- Sensitive server-side operations

Supabase responsibilities:

- Authentication
- PostgreSQL
- RLS
- Storage
- Realtime

Avoid duplicating business logic between Supabase and Fastify.

---

# 17. SUPABASE CLIENTS

Create separate server/client access patterns.

Browser client:
- Publishable Supabase key only.

Server client:
- Authenticated user context.

Service-role client:
- SERVER ONLY.

Never expose:

SUPABASE_SERVICE_ROLE_KEY

to:

- Browser
- Next.js client components
- Public API responses
- Logs
- Git repository

---

# 18. AUTHORIZATION

Preserve the existing RBAC model:

SUPER_ADMIN
COMPANY_ADMIN
SALES_MANAGER
SALES_AGENT
MARKETING_MANAGER
ACCOUNTANT
PROPERTY_MANAGER
VIEWER

Authorization must exist at multiple appropriate levels:

1. Supabase RLS
2. Fastify authorization
3. UI visibility

The UI is NOT a security boundary.

---

# 19. STORAGE MIGRATION

Replace the current S3-compatible storage architecture with:

SUPABASE STORAGE

Create separate buckets where appropriate.

Example:

public-assets
property-media
private-documents

Customer/deal documents MUST NOT be public.

Use:

- Private buckets
- RLS/storage policies
- Signed URLs
- Server-side authorization

Do not expose permanent public URLs for private documents.

---

# 20. PROPERTY MEDIA

Property/project media may be public or protected depending on the product requirements.

Structure storage paths logically.

Example:

organizations/{organizationId}/projects/{projectId}/images/{file}

organizations/{organizationId}/units/{unitId}/images/{file}

organizations/{organizationId}/documents/{documentId}/{file}

Validate:

- MIME type
- File extension
- File size

---

# 21. REALTIME

Evaluate existing realtime requirements.

Use Supabase Realtime for appropriate events such as:

- Notifications
- Lead assignment
- Pipeline changes
- Reservation status
- Unit availability
- Communication messages

Do NOT enable realtime indiscriminately for every table.

Only subscribe where it provides actual product value.

---

# 22. RESERVATION CONCURRENCY

This is CRITICAL.

Two agents must never successfully reserve the same unit simultaneously.

Preserve the existing unit locking behavior.

Implement the reservation operation as a database transaction.

Use appropriate PostgreSQL locking / constraints.

A unit should follow:

AVAILABLE
→ RESERVED
→ CONTRACTED
→ SOLD

with controlled transitions.

Do not rely on frontend checks.

---

# 23. FINANCIAL TRANSACTIONS

Preserve transactional integrity for:

- Payments
- Installments
- Deals
- Reservations
- Commission calculations

For example:

Creating a reservation should atomically:

1. Validate unit availability.
2. Lock/check unit.
3. Create reservation.
4. Update unit status.
5. Create audit event.

If any step fails:

ROLL BACK.

---

# 24. DATABASE FUNCTIONS

Use PostgreSQL functions selectively when they improve:

- Atomic operations
- RLS support
- Database-level invariants
- Complex transactional workflows

Do NOT move all business logic into SQL functions.

Keep domain logic understandable and maintainable.

---

# 25. TRIGGERS

Use triggers only where appropriate.

Good examples:

- updated_at
- audit events where necessary
- profile initialization
- safe derived metadata

Avoid excessive triggers that make business logic difficult to understand.

---

# 26. MIGRATIONS

Create a clean Supabase migration history.

Do not:

- Manually modify production schema without migrations
- Mix conflicting migration systems
- Delete existing migrations just to make the migration easier
- Use destructive changes without explicit data migration

If the existing database contains data:

Create safe migration scripts.

---

# 27. DATA MIGRATION

If existing development/demo data exists:

1. Export/inspect existing data.
2. Transform where necessary.
3. Import into Supabase.
4. Verify relationships.
5. Verify tenant isolation.
6. Verify foreign keys.
7. Verify indexes.
8. Verify RLS.

Do not lose existing data.

---

# 28. INDEXING

Review all existing indexes.

Add indexes for:

organization_id

and common compound queries such as:

organization_id + status

organization_id + assigned_agent_id

organization_id + created_at

organization_id + project_id

organization_id + unit status

etc.

Do not blindly index every column.

Use the actual query patterns.

---

# 29. GENERATED TYPES

Use Supabase-generated TypeScript database types.

Create a shared database type definition.

Use it throughout the application where appropriate.

Avoid duplicated database type definitions.

---

# 30. FRONTEND AUTH MIGRATION

Replace custom authentication state with Supabase session handling.

Ensure:

- Login works
- Logout works
- Session persistence works
- Refresh works
- Protected routes work
- Unauthorized users are redirected
- Organization context is correct

Do not create a second frontend auth state that can contradict Supabase.

---

# 31. NEXT.JS SERVER/CLIENT SECURITY

Use Supabase correctly with:

- Server components
- Route handlers
- Middleware where appropriate
- Client components

Never access privileged Supabase credentials from client components.

---

# 32. FASTIFY AUTH CONTEXT

Fastify must be able to reliably identify:

- authenticated user
- Supabase user ID
- organization memberships
- active organization
- role

Do not trust arbitrary organization IDs sent by the browser.

Derive organization access from authenticated membership.

---

# 33. API MIGRATION

Preserve existing API routes unless there is a strong reason to change them.

Current API architecture includes:

/api/v1/auth
/api/v1/orgs
/api/v1/users
/api/v1/leads
/api/v1/customers
/api/v1/projects
/api/v1/buildings
/api/v1/floors
/api/v1/units
/api/v1/viewings
/api/v1/offers
/api/v1/reservations
/api/v1/deals
/api/v1/payment-plans
/api/v1/installments
/api/v1/payments
/api/v1/commissions
/api/v1/tasks
/api/v1/notifications
/api/v1/communications
/api/v1/documents
/api/v1/analytics
/api/v1/audit-logs
/api/v1/campaigns
/api/v1/settings

Do not break frontend integration unnecessarily.

---

# 34. WHATSAPP

Do not change the WhatsApp business logic unnecessarily.

Keep WhatsApp Cloud API integration.

Supabase can support webhook/event infrastructure, but sensitive webhook processing should remain server-side.

Verify webhook authenticity.

Store communications with organization ownership.

---

# 35. REDIS AND BULLMQ

Do NOT remove Redis/BullMQ merely because Supabase is being introduced.

Continue using Redis/BullMQ for tasks that actually require background processing.

Examples:

- WhatsApp processing
- Bulk lead imports
- Notification jobs
- Scheduled follow-ups
- Reservation expiry
- Installment reminders
- Report generation
- Large data exports

Supabase does not need to replace every infrastructure component.

---

# 36. CRON / SCHEDULED TASKS

Review scheduled jobs such as:

- Reservation expiry
- Follow-up reminders
- Installment reminders
- Notifications
- Campaign processing

Keep BullMQ/Redis where appropriate.

Use Supabase scheduled functionality only when it materially simplifies the architecture.

Avoid unnecessary duplication.

---

# 37. AUDIT LOGS

Preserve audit logs.

Critical events must remain auditable:

- Authentication
- Role changes
- Lead assignment
- Unit status changes
- Reservations
- Payments
- Commission changes
- Deal changes
- Cross-tenant administration

Audit records must include:

- actor
- organization
- action
- entity
- entity ID
- before
- after
- timestamp

---

# 38. SECURITY AUDIT

After migration, perform a security audit.

Specifically test:

- Cross-tenant access
- IDOR
- RLS bypass
- Service-role exposure
- Authentication bypass
- Role escalation
- Unauthorized storage access
- Unauthorized document downloads
- Direct API access
- Manipulated organization IDs
- Manipulated user IDs
- JWT/session abuse

Do not consider the migration complete until these tests pass.

---

# 39. DO NOT DO THESE THINGS

Never:

- Expose service-role key
- Disable RLS to solve an error
- Use public storage for private documents
- Trust organization_id from request body
- Trust role from frontend
- Create permissive RLS policies just to make the UI work
- Remove authorization middleware without replacing it
- Delete existing business logic without understanding it
- Rewrite working modules unnecessarily
- Create duplicate authentication systems

---

# 40. MIGRATION ORDER

Execute in this order:

PHASE A
Repository audit

PHASE B
Supabase project/configuration

PHASE C
Database schema migration

PHASE D
RLS policies

PHASE E
Auth migration

PHASE F
User/organization membership migration

PHASE G
Storage migration

PHASE H
Fastify authentication integration

PHASE I
Frontend authentication integration

PHASE J
Realtime integration

PHASE K
Data migration

PHASE L
Security testing

PHASE M
Regression testing

---

# 41. BEFORE CODING

First inspect the actual repository.

Report:

1. Current database implementation
2. Current Prisma schema
3. Current authentication implementation
4. Current RBAC implementation
5. Current tenant isolation implementation
6. Current storage implementation
7. Current API authentication flow
8. Current frontend authentication flow
9. Current environment variables
10. Current migrations
11. Current seed data
12. Current tests

Then produce:

SUPABASE_MIGRATION_PLAN.md

Do not start destructive changes before this analysis.

---

# 42. MIGRATION PLAN REQUIREMENTS

The migration plan must identify:

- Files to modify
- Files to remove
- Files to create
- Database migrations required
- RLS policies required
- Auth changes
- Storage changes
- Environment variable changes
- API changes
- Frontend changes
- Data migration requirements
- Risks
- Rollback strategy

---

# 43. ACCEPTANCE CRITERIA

The migration is successful only when:

AUTH:

✓ Supabase Auth is the authentication authority.

DATABASE:

✓ Production database is Supabase PostgreSQL.

SECURITY:

✓ RLS protects tenant data.

TENANCY:

✓ Organization A cannot access Organization B.

STORAGE:

✓ Private documents use secure Supabase Storage.

BACKEND:

✓ Fastify correctly authenticates Supabase users.

FRONTEND:

✓ Next.js correctly handles Supabase sessions.

BUSINESS LOGIC:

✓ Existing CRM workflows still work.

REAL ESTATE:

✓ Unit reservation concurrency still works.

FINANCE:

✓ Payments and commissions remain correct.

REALTIME:

✓ Required realtime features work.

TESTING:

✓ Existing functionality passes regression tests.

---

# 44. FINAL INSTRUCTION

Do not treat this migration as a reason to redesign the product.

The product already exists.

Your job is:

EXISTING REAL ESTATE CRM
+
SUPABASE INFRASTRUCTURE
=
SECURE PRODUCTION-READY SUPABASE-BASED CRM

Preserve functionality.

Improve infrastructure.

Strengthen tenant isolation.

Strengthen authentication.

Strengthen storage security.

Maintain business logic.

Do not introduce unnecessary architectural complexity.

Before declaring completion, provide:

1. Migration summary
2. Final architecture
3. Database changes
4. RLS policy summary
5. Auth changes
6. Storage changes
7. Environment variable changes
8. Files changed
9. Tests performed
10. Known remaining issues
11. Rollback instructions
12. Instructions for running the migrated project locally
13. Instructions for deploying to production
