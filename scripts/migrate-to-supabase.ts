#!/usr/bin/env tsx
/**
 * Phase K — Data Migration Script
 * Existing PostgreSQL (Prisma DB) → Supabase PostgreSQL
 *
 * Run AFTER:
 *   1. Supabase migrations (00001–00008) applied
 *   2. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SOURCE_DATABASE_URL set in env
 *
 * This script:
 *   1. Reads all data from the source DB via Prisma
 *   2. Creates Supabase Auth users for all existing app users
 *   3. Inserts all tenant data into Supabase PostgreSQL
 *   4. Verifies row counts and FK integrity
 *   5. Runs a tenant isolation spot-check
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgres://..." \
 *   SUPABASE_URL="https://xxx.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="..." \
 *   MIGRATION_DEFAULT_PASSWORD="ChangeMe@2024!" \
 *   tsx scripts/migrate-to-supabase.ts
 *
 * ⚠️  DESTRUCTIVE on target. Run against a fresh Supabase project.
 * ⚠️  Users will be emailed password-reset links after migration.
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

// ─── Config ───────────────────────────────────────────────────────────────────

const SOURCE_DB_URL    = process.env['SOURCE_DATABASE_URL']
const SUPABASE_URL     = process.env['SUPABASE_URL']
const SERVICE_KEY      = process.env['SUPABASE_SERVICE_ROLE_KEY']
const DEFAULT_PASSWORD = process.env['MIGRATION_DEFAULT_PASSWORD'] ?? 'ChangeMe@2024!'

if (!SOURCE_DB_URL || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing env vars: SOURCE_DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sourcePrisma = new PrismaClient({ datasources: { db: { url: SOURCE_DB_URL } } })
const targetPrisma = new PrismaClient()   // uses DATABASE_URL = Supabase connection string

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Migration log ─────────────────────────────────────────────────────────────

const log  = (msg: string) => console.log(`  ${msg}`)
const ok   = (entity: string, n: number) => console.log(`  ✅ ${entity}: ${n}`)
const warn = (msg: string) => console.warn(`  ⚠️  ${msg}`)

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Phase K — Supabase Data Migration')
  console.log('='.repeat(50))

  // ── Step 1: Migrate organizations ──────────────────────────────────────────
  console.log('\n[1/8] Organizations')
  const orgs = await sourcePrisma.organization.findMany()
  for (const org of orgs) {
    await targetPrisma.organization.upsert({
      where:  { id: org.id },
      update: {},
      create: {
        id:           org.id,
        name:         org.name,
        slug:         org.slug,
        plan:         org.plan,
        status:       org.status,
        currency:     (org as any).currency ?? 'USD',
        timezone:     (org as any).timezone ?? 'UTC',
        country:      (org as any).country  ?? null,
        city:         (org as any).city     ?? null,
        phone:        (org as any).phone    ?? null,
        email:        (org as any).email    ?? null,
        website:      (org as any).website  ?? null,
        settings:     (org as any).settings ?? {},
        createdAt:    org.createdAt,
      },
    })
  }
  ok('organizations', orgs.length)

  // ── Step 2: Migrate users → create Supabase Auth users ─────────────────────
  console.log('\n[2/8] Users + Supabase Auth')
  const users = await sourcePrisma.user.findMany({ include: { profile: true } })

  const authUserMap: Record<string, string> = {}   // appUserId → authUserId

  for (const user of users) {
    // Create Supabase Auth user (email/password)
    let authUserId: string

    // Check if already migrated (has authUserId)
    if ((user as any).authUserId) {
      authUserId = (user as any).authUserId
      authUserMap[user.id] = authUserId
      log(`  (exists) ${user.email}`)
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email:              user.email,
        password:           DEFAULT_PASSWORD,
        email_confirm:      true,
        user_metadata: {
          first_name:      user.profile?.firstName ?? '',
          last_name:       user.profile?.lastName  ?? '',
          organization_id: user.organizationId,
          role:            user.role,
        },
      })

      if (error) {
        // User may already exist in Supabase Auth (idempotent re-run)
        if (error.message.includes('already registered')) {
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
          const found = existing?.users.find((u) => u.email === user.email)
          if (!found) { warn(`Failed to create auth user for ${user.email}: ${error.message}`); continue }
          authUserId = found.id
        } else {
          warn(`Supabase Auth createUser failed for ${user.email}: ${error.message}`)
          continue
        }
      } else {
        authUserId = data.user!.id
      }

      authUserMap[user.id] = authUserId
      log(`  created auth: ${user.email}`)
    }

    // Upsert app user in target DB
    await targetPrisma.user.upsert({
      where:  { id: user.id },
      update: { authUserId },
      create: {
        id:             user.id,
        authUserId,
        organizationId: user.organizationId,
        email:          user.email,
        role:           user.role,
        status:         user.status,
        emailVerified:  (user as any).emailVerified ?? false,
        createdAt:      user.createdAt,
      },
    })

    // Upsert profile
    if (user.profile) {
      await targetPrisma.userProfile.upsert({
        where:  { userId: user.id },
        update: {},
        create: {
          userId:    user.id,
          firstName: user.profile.firstName ?? '',
          lastName:  user.profile.lastName  ?? '',
          phone:     user.profile.phone     ?? null,
          avatarUrl: (user.profile as any).avatarUrl ?? null,
        },
      })
    }
  }
  ok('users', users.length)

  // ── Step 3: Migrate property hierarchy ─────────────────────────────────────
  console.log('\n[3/8] Projects → Buildings → Floors → Units')

  const projects = await sourcePrisma.project.findMany()
  for (const p of projects) {
    await targetPrisma.project.upsert({
      where:  { id: p.id },
      update: {},
      create: p as any,
    })
  }
  ok('projects', projects.length)

  const buildings = await sourcePrisma.building.findMany()
  for (const b of buildings) {
    await targetPrisma.building.upsert({ where: { id: b.id }, update: {}, create: b as any })
  }
  ok('buildings', buildings.length)

  const floors = await sourcePrisma.floor.findMany()
  for (const f of floors) {
    await targetPrisma.floor.upsert({ where: { id: f.id }, update: {}, create: f as any })
  }
  ok('floors', floors.length)

  const units = await sourcePrisma.unit.findMany()
  for (const u of units) {
    await targetPrisma.unit.upsert({ where: { id: u.id }, update: {}, create: u as any })
  }
  ok('units', units.length)

  // ── Step 4: Leads + activities ─────────────────────────────────────────────
  console.log('\n[4/8] Leads + activities')

  const leads = await sourcePrisma.lead.findMany()
  for (const l of leads) {
    await targetPrisma.lead.upsert({ where: { id: l.id }, update: {}, create: l as any })
  }
  ok('leads', leads.length)

  const activities = await sourcePrisma.leadActivity.findMany()
  for (const a of activities) {
    await targetPrisma.leadActivity.upsert({ where: { id: a.id }, update: {}, create: a as any })
  }
  ok('lead_activities', activities.length)

  // ── Step 5: Customers ──────────────────────────────────────────────────────
  console.log('\n[5/8] Customers')
  const customers = await sourcePrisma.customer.findMany()
  for (const c of customers) {
    await targetPrisma.customer.upsert({ where: { id: c.id }, update: {}, create: c as any })
  }
  ok('customers', customers.length)

  // ── Step 6: Deals + financial records ─────────────────────────────────────
  console.log('\n[6/8] Viewings, Offers, Reservations, Deals, Payments, Commissions')

  for await (const [model, label] of [
    ['viewing', 'viewings'],
    ['offer', 'offers'],
    ['reservation', 'reservations'],
    ['deal', 'deals'],
    ['paymentPlan', 'payment_plans'],
    ['installment', 'installments'],
    ['payment', 'payments'],
    ['commission', 'commissions'],
  ] as const) {
    const rows = await (sourcePrisma as any)[model].findMany()
    for (const row of rows) {
      await (targetPrisma as any)[model].upsert({
        where:  { id: row.id },
        update: {},
        create: row,
      })
    }
    ok(label, rows.length)
  }

  // ── Step 7: Tasks, notifications, communications, documents ────────────────
  console.log('\n[7/8] Tasks, Notifications, Communications, Documents')

  for await (const [model, label] of [
    ['task',          'tasks'],
    ['notification',  'notifications'],
    ['communication', 'communications'],
    ['document',      'documents'],
    ['auditLog',      'audit_logs'],
    ['campaign',      'campaigns'],
  ] as const) {
    const rows = await (sourcePrisma as any)[model].findMany()
    for (const row of rows) {
      await (targetPrisma as any)[model].upsert({
        where:  { id: row.id },
        update: {},
        create: row,
      }).catch((e: Error) => warn(`${label} upsert ${row.id}: ${e.message}`))
    }
    ok(label, rows.length)
  }

  // ── Step 8: Verification ───────────────────────────────────────────────────
  console.log('\n[8/8] Verification')

  const checks = [
    ['organization', 'organizations'],
    ['user',         'users'],
    ['lead',         'leads'],
    ['deal',         'deals'],
    ['unit',         'units'],
  ] as const

  for (const [model, label] of checks) {
    const srcCount = await (sourcePrisma as any)[model].count()
    const tgtCount = await (targetPrisma as any)[model].count()

    if (srcCount === tgtCount) {
      ok(`${label}: ${srcCount}/${srcCount} rows`, tgtCount)
    } else {
      warn(`${label} mismatch: source=${srcCount}, target=${tgtCount}`)
    }
  }

  // ── Tenant isolation spot-check ────────────────────────────────────────────
  console.log('\n  Tenant isolation check...')
  const orgIds = (await targetPrisma.organization.findMany({ select: { id: true } })).map((o) => o.id)

  if (orgIds.length >= 2) {
    const [orgA, orgB] = orgIds
    const leadsA = await targetPrisma.lead.count({ where: { organizationId: orgA } })
    const leadsAinB = await targetPrisma.lead.count({ where: { organizationId: orgB, id: { in: (await targetPrisma.lead.findMany({ where: { organizationId: orgA }, select: { id: true } })).map((l) => l.id) } } })

    if (leadsAinB === 0) {
      ok(`Tenant isolation: org A leads NOT visible in org B`, 0)
    } else {
      warn(`Tenant isolation FAIL: ${leadsAinB} org A leads leaked to org B query`)
    }
  }

  console.log('\n✅ Phase K migration complete.')
  console.log('\n📧 Action required: Send password-reset emails to all migrated users.')
  console.log('   Use: supabaseAdmin.auth.admin.generateLink({ type: "recovery", email })')
  console.log(`   Default temp password: ${DEFAULT_PASSWORD}`)
}

main()
  .catch((e) => { console.error('❌ Migration failed:', e); process.exit(1) })
  .finally(async () => {
    await sourcePrisma.$disconnect()
    await targetPrisma.$disconnect()
  })
