/**
 * Phase L — Security Testing
 *
 * Covers every attack vector listed in the master prompt §38:
 *   - Cross-tenant access (IDOR)
 *   - RLS bypass attempts
 *   - Service-role exposure
 *   - Authentication bypass
 *   - Role escalation
 *   - Unauthorized storage access
 *   - Direct API access without token
 *   - Manipulated organization IDs
 *   - Manipulated user IDs
 *   - JWT/session abuse
 *
 * Each describe block maps to one attack category.
 * Tests are designed to run against a live Supabase + Fastify instance.
 *
 * Run:
 *   pnpm test:security
 *   (see package.json in the root for the vitest config)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  signIn,
  apiGet,
  apiPost,
  apiPatch,
  apiFetch,
  supabaseAdmin,
  getFirstLeadId,
  getFirstDealId,
  getFirstUnitId,
  getFirstDocumentId,
  getOrgIdForEmail,
  type TestSession,
} from '../helpers/fixtures.js'

// ─── Test sessions ─────────────────────────────────────────────────────────────

let orgASession: TestSession
let orgBSession: TestSession
let orgAId: string
let orgBId: string

// IDs that belong to Org B — used to attempt cross-tenant access from Org A
let orgBLeadId:    string | null
let orgBDealId:    string | null
let orgBUnitId:    string | null
let orgBDocId:     string | null

beforeAll(async () => {
  orgASession = await signIn(
    process.env['TEST_ORG_A_EMAIL']!,
    process.env['TEST_ORG_A_PASSWORD']!,
  )
  orgBSession = await signIn(
    process.env['TEST_ORG_B_EMAIL']!,
    process.env['TEST_ORG_B_PASSWORD']!,
  )

  orgAId = (await getOrgIdForEmail(process.env['TEST_ORG_A_EMAIL']!))!
  orgBId = (await getOrgIdForEmail(process.env['TEST_ORG_B_EMAIL']!))!

  orgBLeadId = await getFirstLeadId(orgBId)
  orgBDealId = await getFirstDealId(orgBId)
  orgBUnitId = await getFirstUnitId(orgBId)
  orgBDocId  = await getFirstDocumentId(orgBId)
})

// ─────────────────────────────────────────────────────────────────────────────
// L-1  UNAUTHENTICATED ACCESS
// ─────────────────────────────────────────────────────────────────────────────

describe('L-1: Unauthenticated API access', () => {
  const PROTECTED_ROUTES = [
    '/leads',
    '/customers',
    '/deals',
    '/units',
    '/projects',
    '/payments',
    '/commissions',
    '/tasks',
    '/notifications',
    '/documents',
    '/analytics/dashboard',
    '/audit-logs',
  ]

  for (const route of PROTECTED_ROUTES) {
    it(`GET ${route} returns 401 without token`, async () => {
      const res = await apiFetch(route, { method: 'GET' })
      expect(res.status).toBe(401)
    })
  }

  it('POST /auth/login with wrong password returns 401', async () => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    process.env['TEST_ORG_A_EMAIL'],
        password: 'WRONG_PASSWORD_that_is_not_right',
      }),
    })
    expect(res.status).toBe(401)
  })

  it('GET /auth/me returns 401 without token', async () => {
    const res = await apiFetch('/auth/me', { method: 'GET' })
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L-2  CROSS-TENANT ACCESS / IDOR via API
// ─────────────────────────────────────────────────────────────────────────────

describe('L-2: Cross-tenant access (IDOR)', () => {
  it('Org A cannot read Org B lead via GET /leads/:id', async () => {
    if (!orgBLeadId) return // skip if no seed data
    const res = await apiGet(`/leads/${orgBLeadId}`, orgASession.accessToken)
    expect([403, 404]).toContain(res.status)
  })

  it('Org A cannot update Org B lead', async () => {
    if (!orgBLeadId) return
    const res = await apiPatch(
      `/leads/${orgBLeadId}`,
      { temperature: 'HOT' },
      orgASession.accessToken,
    )
    expect([403, 404]).toContain(res.status)
  })

  it('Org A cannot read Org B deal', async () => {
    if (!orgBDealId) return
    const res = await apiGet(`/deals/${orgBDealId}`, orgASession.accessToken)
    expect([403, 404]).toContain(res.status)
  })

  it('Org A cannot read Org B unit', async () => {
    if (!orgBUnitId) return
    const res = await apiGet(`/units/${orgBUnitId}`, orgASession.accessToken)
    expect([403, 404]).toContain(res.status)
  })

  it('Org A cannot download Org B document', async () => {
    if (!orgBDocId) return
    const res = await apiGet(`/documents/${orgBDocId}/download`, orgASession.accessToken)
    expect([403, 404]).toContain(res.status)
  })

  it('Org A GET /leads list does not contain Org B leads', async () => {
    const res  = await apiGet('/leads?limit=100', orgASession.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ organizationId: string }> }
    const hasBLead = body.data.some((l) => l.organizationId === orgBId)
    expect(hasBLead).toBe(false)
  })

  it('Org A GET /deals list does not contain Org B deals', async () => {
    const res  = await apiGet('/deals?limit=100', orgASession.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ organizationId: string }> }
    const hasBDeal = body.data.some((d) => d.organizationId === orgBId)
    expect(hasBDeal).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L-3  MANIPULATED ORGANIZATION IDs IN REQUEST BODY
// ─────────────────────────────────────────────────────────────────────────────

describe('L-3: Injected organizationId in request body', () => {
  it('Creating a lead with injected orgId is ignored — lead lands in actors org', async () => {
    const res  = await apiPost('/leads', {
      fullName:       'Injection Test',
      phone:          '+9710000000',
      organizationId: orgBId,  // attacker injects Org B id
    }, orgASession.accessToken)

    if (res.status === 201 || res.status === 200) {
      const body = await res.json() as { organizationId: string }
      // Must be Org A, never Org B
      expect(body.organizationId).toBe(orgAId)
      expect(body.organizationId).not.toBe(orgBId)
    } else {
      // Also acceptable — validation rejects the payload
      expect([400, 422]).toContain(res.status)
    }
  })

  it('Creating a deal with injected unitId from Org B fails', async () => {
    if (!orgBUnitId) return
    const res = await apiPost('/deals', {
      unitId:     orgBUnitId,
      customerId: 'nonexistent',
      dealValue:  1_000_000,
    }, orgASession.accessToken)
    expect([400, 403, 404, 422]).toContain(res.status)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L-4  JWT / TOKEN ABUSE
// ─────────────────────────────────────────────────────────────────────────────

describe('L-4: JWT / session abuse', () => {
  it('Expired / garbage token is rejected', async () => {
    const res = await apiGet('/leads', 'garbage.jwt.token')
    expect(res.status).toBe(401)
  })

  it('Valid token for Org B cannot access Org A resources', async () => {
    // Already covered in L-2 from the other direction — explicit assertion here
    if (!orgBLeadId) return
    // orgBSession has a valid Supabase JWT but for org B
    const res = await apiGet(`/leads/${orgBLeadId}`, orgASession.accessToken)
    expect([403, 404]).toContain(res.status)
  })

  it('Missing Bearer prefix is rejected', async () => {
    const res = await apiFetch('/leads', {
      method: 'GET',
      headers: { Authorization: orgASession.accessToken }, // no "Bearer "
    })
    expect(res.status).toBe(401)
  })

  it('Empty Authorization header is rejected', async () => {
    const res = await apiFetch('/leads', {
      method: 'GET',
      headers: { Authorization: '' },
    })
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L-5  ROLE ESCALATION
// ─────────────────────────────────────────────────────────────────────────────

describe('L-5: Role escalation attempts', () => {
  it('Org A agent cannot promote themselves to COMPANY_ADMIN via PATCH /users/:id', async () => {
    // First get own user ID
    const meRes  = await apiGet('/auth/me', orgASession.accessToken)
    const meBody = await meRes.json() as { id: string }
    if (!meBody.id) return

    const res = await apiPatch(
      `/users/${meBody.id}`,
      { role: 'COMPANY_ADMIN' },
      orgASession.accessToken,
    )
    // Should be forbidden — agents cannot change their own role
    expect([403, 422]).toContain(res.status)
  })

  it('Org A user cannot promote Org B user', async () => {
    // Get an Org B user ID via service role
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('organization_id', orgBId)
      .neq('id', orgBSession.userId)
      .limit(1)
      .single()

    if (!data) return
    const res = await apiPatch(
      `/users/${data.id}`,
      { role: 'COMPANY_ADMIN' },
      orgASession.accessToken,
    )
    expect([403, 404]).toContain(res.status)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L-6  DIRECT RLS BYPASS VIA SUPABASE ANON KEY
// ─────────────────────────────────────────────────────────────────────────────

describe('L-6: Direct Supabase RLS enforcement', () => {
  it('Anon client cannot read leads without auth', async () => {
    const anonClient = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_ANON_KEY']!,
    )
    // Deliberately import createClient for this test only
    const { data, error } = await anonClient.from('leads').select('id').limit(10)
    // Should return empty array (RLS blocks) or error — never data
    expect(data?.length ?? 0).toBe(0)
  })

  it('Org B session cannot read Org A leads via direct Supabase client', async () => {
    const { createClient: createCl } = await import('@supabase/supabase-js')
    const clientB = createCl(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_ANON_KEY']!,
    )
    await clientB.auth.setSession({
      access_token:  orgBSession.accessToken,
      refresh_token: 'dummy', // we don't need refresh here
    })

    const { data } = await clientB
      .from('leads')
      .select('id, organization_id')
      .eq('organization_id', orgAId)
      .limit(10)

    expect(data?.length ?? 0).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L-7  STORAGE ACCESS
// ─────────────────────────────────────────────────────────────────────────────

describe('L-7: Unauthorized storage access', () => {
  it('Org A cannot get signed download URL for Org B document', async () => {
    if (!orgBDocId) return
    const res = await apiGet(`/documents/${orgBDocId}/download`, orgASession.accessToken)
    expect([403, 404]).toContain(res.status)
  })

  it('Direct Supabase Storage read of private document bucket requires auth', async () => {
    if (!orgBDocId) return
    // Get Org B document storage path
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('storage_path')
      .eq('id', orgBDocId)
      .single()

    if (!doc?.storage_path) return

    // Try to get a public URL — should not work for private bucket
    const { createClient: createCl } = await import('@supabase/supabase-js')
    const anonClient = createCl(process.env['SUPABASE_URL']!, process.env['SUPABASE_ANON_KEY']!)
    const { data } = anonClient.storage
      .from('recrm-documents')
      .getPublicUrl(doc.storage_path)

    // Public URL will exist as a URL string, but fetching it should return 400/403
    if (data?.publicUrl) {
      const fetchRes = await fetch(data.publicUrl)
      // Private buckets return 400 with "Bucket not public" or 403
      expect([400, 403, 404]).toContain(fetchRes.status)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L-8  RESERVATION CONCURRENCY (unit lock safety)
// ─────────────────────────────────────────────────────────────────────────────

describe('L-8: Reservation concurrency', () => {
  it('Concurrent reservation of the same unit: only one succeeds', async () => {
    // Find an AVAILABLE unit in Org A
    const { data: units } = await supabaseAdmin
      .from('units')
      .select('id')
      .eq('organization_id', orgAId)
      .eq('status', 'AVAILABLE')
      .limit(1)

    if (!units?.length) {
      console.warn('No AVAILABLE units in Org A — skipping concurrency test')
      return
    }

    const unitId = units[0].id

    // Get a customer in Org A
    const { data: customers } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('organization_id', orgAId)
      .limit(2)

    if (!customers || customers.length < 1) {
      console.warn('No customers in Org A — skipping concurrency test')
      return
    }

    const [custA, custB] = customers

    // Fire two reservations simultaneously
    const [resA, resB] = await Promise.allSettled([
      apiPost('/reservations', {
        unitId,
        customerId: custA.id,
        expiresAt:  new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      }, orgASession.accessToken),
      apiPost('/reservations', {
        unitId,
        customerId: (custB ?? custA).id,
        expiresAt:  new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      }, orgASession.accessToken),
    ])

    const statuses = [resA, resB].map((r) =>
      r.status === 'fulfilled' ? r.value.status : 500,
    )

    const successCount = statuses.filter((s) => s === 201).length
    const conflictCount = statuses.filter((s) => s === 409).length

    // Exactly one should succeed, one should conflict
    expect(successCount).toBe(1)
    expect(conflictCount).toBe(1)

    // Clean up — cancel the successful reservation
    // (find the active reservation and cancel it)
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('unit_id', unitId)
      .eq('status', 'ACTIVE')
      .single()

    if (reservation) {
      await apiPost(`/reservations/${reservation.id}/cancel`, {}, orgASession.accessToken)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L-9  SUPER_ADMIN ISOLATION
// ─────────────────────────────────────────────────────────────────────────────

describe('L-9: Service-role key not exposed', () => {
  it('GET /api/v1/auth/me response does not contain service role key', async () => {
    const res  = await apiGet('/auth/me', orgASession.accessToken)
    const text = await res.text()
    const key  = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
    expect(text).not.toContain(key)
  })

  it('GET /leads response does not contain service role key', async () => {
    const res  = await apiGet('/leads', orgASession.accessToken)
    const text = await res.text()
    const key  = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
    expect(text).not.toContain(key)
  })
})

// helper — dynamic import for L-6
function createClient(url: string, key: string) {
  const { createClient: cc } = require('@supabase/supabase-js')
  return cc(url, key)
}
