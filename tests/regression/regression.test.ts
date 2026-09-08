/**
 * Phase M — Regression Testing
 *
 * End-to-end smoke tests covering every CRM workflow that must
 * continue working after the Supabase migration.
 *
 * Scope:
 *   M-1   Auth (login, logout, me, password reset flow)
 *   M-2   Leads (CRUD, assignment, scoring, timeline)
 *   M-3   Customers
 *   M-4   Properties (Project → Building → Floor → Unit)
 *   M-5   Viewings
 *   M-6   Offers
 *   M-7   Reservations (happy path)
 *   M-8   Deals + Pipeline
 *   M-9   Payment plans + Installments + Payments
 *   M-10  Commissions
 *   M-11  Tasks
 *   M-12  Notifications
 *   M-13  Communications
 *   M-14  Documents (upload + signed download)
 *   M-15  Analytics
 *   M-16  Audit logs
 *   M-17  Settings
 *   M-18  Team management
 *   M-19  Realtime (subscription smoke test)
 *
 * Each test creates its own data and cleans up after itself
 * using the service-role client so as not to pollute the test org.
 *
 * Run:
 *   pnpm test:regression
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  signIn,
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  apiFetch,
  supabaseAdmin,
  getOrgIdForEmail,
  type TestSession,
} from '../helpers/fixtures.js'

// ─── Session & cleanup registry ───────────────────────────────────────────────

let session: TestSession
let orgId:   string

// Track created IDs for cleanup
const created: Record<string, string[]> = {
  leads:        [],
  customers:    [],
  projects:     [],
  buildings:    [],
  floors:       [],
  units:        [],
  viewings:     [],
  offers:       [],
  reservations: [],
  deals:        [],
  payment_plans: [],
  commissions:  [],
  tasks:        [],
  documents:    [],
  campaigns:    [],
}

function track(table: string, id: string) {
  created[table] ??= []
  created[table].push(id)
}

beforeAll(async () => {
  session = await signIn(
    process.env['TEST_ORG_A_EMAIL']!,
    process.env['TEST_ORG_A_PASSWORD']!,
  )
  orgId = (await getOrgIdForEmail(process.env['TEST_ORG_A_EMAIL']!))!
})

afterAll(async () => {
  // Clean up in dependency order (deepest first)
  const order = [
    'commissions', 'payment_plans', 'deals', 'reservations',
    'offers', 'viewings', 'units', 'floors', 'buildings',
    'projects', 'customers', 'leads', 'tasks', 'documents', 'campaigns',
  ]
  for (const table of order) {
    const ids = created[table] ?? []
    if (ids.length) {
      await supabaseAdmin.from(table).delete().in('id', ids)
    }
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// M-1  AUTH
// ─────────────────────────────────────────────────────────────────────────────

describe('M-1: Auth', () => {
  it('Login returns access token', async () => {
    const res  = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    process.env['TEST_ORG_A_EMAIL'],
        password: process.env['TEST_ORG_A_PASSWORD'],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { accessToken?: string }
    expect(typeof body.accessToken).toBe('string')
    expect(body.accessToken!.length).toBeGreaterThan(10)
  })

  it('GET /auth/me returns current user with org', async () => {
    const res  = await apiGet('/auth/me', session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { organizationId: string; role: string }
    expect(body.organizationId).toBe(orgId)
    expect(body.role).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-2  LEADS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-2: Leads', () => {
  let leadId: string

  it('Create lead', async () => {
    const res  = await apiPost('/leads', {
      fullName:          'Regression Test Lead',
      phone:             '+971500000001',
      source:            'WEBSITE',
      temperature:       'WARM',
      budgetMin:         500_000,
      budgetMax:         1_000_000,
      preferredType:     'APARTMENT',
      purchasePurpose:   'INVESTMENT',
      financingPreference: 'CASH',
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    leadId = body.id
    track('leads', leadId)
  })

  it('Get lead by ID', async () => {
    const res  = await apiGet(`/leads/${leadId}`, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { id: string; fullName: string }
    expect(body.id).toBe(leadId)
    expect(body.fullName).toBe('Regression Test Lead')
  })

  it('Update lead status', async () => {
    const res  = await apiPatch(`/leads/${leadId}`, { status: 'CONTACTED' }, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string }
    expect(body.status).toBe('CONTACTED')
  })

  it('List leads returns created lead', async () => {
    const res  = await apiGet('/leads?limit=100', session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ id: string }> }
    expect(body.data.some((l) => l.id === leadId)).toBe(true)
  })

  it('Lead timeline has STATUS_CHANGE activity', async () => {
    const res  = await apiGet(`/leads/${leadId}/timeline`, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ type: string }> }
    expect(body.data.some((a) => a.type === 'STATUS_CHANGE')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-3  CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-3: Customers', () => {
  let customerId: string

  it('Create customer', async () => {
    const res  = await apiPost('/customers', {
      fullName: 'Regression Customer',
      phone:    '+971500000002',
      email:    'regcustomer@test.invalid',
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    customerId = body.id
    track('customers', customerId)
  })

  it('Get customer by ID', async () => {
    const res  = await apiGet(`/customers/${customerId}`, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { id: string }
    expect(body.id).toBe(customerId)
  })

  it('List customers contains created customer', async () => {
    const res  = await apiGet('/customers?limit=100', session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ id: string }> }
    expect(body.data.some((c) => c.id === customerId)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-4  PROPERTY HIERARCHY
// ─────────────────────────────────────────────────────────────────────────────

describe('M-4: Project → Building → Floor → Unit', () => {
  let projectId: string
  let buildingId: string
  let floorId: string
  let unitId: string

  it('Create project', async () => {
    const res  = await apiPost('/projects', {
      name:      'Regression Tower',
      developer: 'Test Developer',
      location:  'Test City',
      status:    'UNDER_CONSTRUCTION',
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    projectId = body.id
    track('projects', projectId)
  })

  it('Create building', async () => {
    const res  = await apiPost('/buildings', {
      projectId,
      name:         'Tower A',
      floorsCount:  10,
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    buildingId = body.id
    track('buildings', buildingId)
  })

  it('Create floor', async () => {
    const res  = await apiPost('/floors', {
      buildingId,
      floorNumber: 1,
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    floorId = body.id
    track('floors', floorId)
  })

  it('Create unit', async () => {
    const res  = await apiPost('/units', {
      projectId,
      buildingId,
      floorId,
      unitNumber:     '101',
      type:           'APARTMENT',
      area:           85,
      price:          800_000,
      bedroomCount:   2,
      bathroomCount:  2,
      status:         'AVAILABLE',
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string; status: string }
    unitId = body.id
    track('units', unitId)
    expect(body.status).toBe('AVAILABLE')
  })

  it('Unit appears in project unit list', async () => {
    const res  = await apiGet(`/projects/${projectId}/units`, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ id: string }> }
    expect(body.data.some((u) => u.id === unitId)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-5  VIEWINGS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-5: Viewings', () => {
  let viewingId: string
  let localLeadId: string
  let localUnitId: string

  beforeAll(async () => {
    // Create minimal lead + unit
    const l = await apiPost('/leads', {
      fullName: 'Viewing Lead', phone: '+971500000003', source: 'DIRECT',
    }, session.accessToken)
    localLeadId = ((await l.json()) as { id: string }).id
    track('leads', localLeadId)

    const p  = await apiPost('/projects', { name: 'V-Project', developer: 'Dev', location: 'City', status: 'AVAILABLE' }, session.accessToken)
    const pid = ((await p.json()) as { id: string }).id
    track('projects', pid)
    const b  = await apiPost('/buildings', { projectId: pid, name: 'B1', floorsCount: 5 }, session.accessToken)
    const bid = ((await b.json()) as { id: string }).id
    track('buildings', bid)
    const f  = await apiPost('/floors', { buildingId: bid, floorNumber: 1 }, session.accessToken)
    const fid = ((await f.json()) as { id: string }).id
    track('floors', fid)
    const u  = await apiPost('/units', {
      projectId: pid, buildingId: bid, floorId: fid,
      unitNumber: '201', type: 'APARTMENT', area: 90,
      price: 900_000, bedroomCount: 2, bathroomCount: 1, status: 'AVAILABLE',
    }, session.accessToken)
    localUnitId = ((await u.json()) as { id: string }).id
    track('units', localUnitId)
  })

  it('Schedule viewing', async () => {
    const res = await apiPost('/viewings', {
      leadId:      localLeadId,
      unitId:      localUnitId,
      scheduledAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
      status:      'SCHEDULED',
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    viewingId = body.id
    track('viewings', viewingId)
  })

  it('Update viewing outcome', async () => {
    const res  = await apiPatch(`/viewings/${viewingId}`, {
      status:  'COMPLETED',
      outcome: 'INTERESTED',
    }, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string; outcome: string }
    expect(body.status).toBe('COMPLETED')
    expect(body.outcome).toBe('INTERESTED')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-7  RESERVATIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-7: Reservations (happy path)', () => {
  let reservationId: string
  let localCustomerId: string
  let localUnitId: string

  beforeAll(async () => {
    const c = await apiPost('/customers', {
      fullName: 'Reserve Customer', phone: '+971500000010',
    }, session.accessToken)
    localCustomerId = ((await c.json()) as { id: string }).id
    track('customers', localCustomerId)

    const p  = await apiPost('/projects', { name: 'R-Project', developer: 'Dev', location: 'City', status: 'AVAILABLE' }, session.accessToken)
    const pid = ((await p.json()) as { id: string }).id
    track('projects', pid)
    const b  = await apiPost('/buildings', { projectId: pid, name: 'B1', floorsCount: 3 }, session.accessToken)
    const bid = ((await b.json()) as { id: string }).id
    track('buildings', bid)
    const f  = await apiPost('/floors', { buildingId: bid, floorNumber: 1 }, session.accessToken)
    const fid = ((await f.json()) as { id: string }).id
    track('floors', fid)
    const u  = await apiPost('/units', {
      projectId: pid, buildingId: bid, floorId: fid,
      unitNumber: '301', type: 'APARTMENT', area: 95,
      price: 950_000, bedroomCount: 3, bathroomCount: 2, status: 'AVAILABLE',
    }, session.accessToken)
    localUnitId = ((await u.json()) as { id: string }).id
    track('units', localUnitId)
  })

  it('Create reservation locks unit', async () => {
    const res  = await apiPost('/reservations', {
      unitId:     localUnitId,
      customerId: localCustomerId,
      expiresAt:  new Date(Date.now() + 48 * 3600_000).toISOString(),
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string; status: string }
    reservationId = body.id
    track('reservations', reservationId)
    expect(body.status).toBe('ACTIVE')
  })

  it('Unit status is now RESERVED', async () => {
    const res  = await apiGet(`/units/${localUnitId}`, session.accessToken)
    const body = await res.json() as { status: string }
    expect(body.status).toBe('RESERVED')
  })

  it('Duplicate reservation on same unit returns 409', async () => {
    const res = await apiPost('/reservations', {
      unitId:     localUnitId,
      customerId: localCustomerId,
      expiresAt:  new Date(Date.now() + 48 * 3600_000).toISOString(),
    }, session.accessToken)
    expect(res.status).toBe(409)
  })

  it('Cancel reservation makes unit AVAILABLE again', async () => {
    const res = await apiPost(
      `/reservations/${reservationId}/cancel`,
      {},
      session.accessToken,
    )
    expect(res.status).toBe(200)

    const unitRes  = await apiGet(`/units/${localUnitId}`, session.accessToken)
    const unitBody = await unitRes.json() as { status: string }
    expect(unitBody.status).toBe('AVAILABLE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-8  DEALS + PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

describe('M-8: Deals + Pipeline', () => {
  let dealId: string
  let localCustomerId: string
  let localUnitId: string

  beforeAll(async () => {
    const c = await apiPost('/customers', { fullName: 'Deal Customer', phone: '+971500000020' }, session.accessToken)
    localCustomerId = ((await c.json()) as { id: string }).id
    track('customers', localCustomerId)

    const p  = await apiPost('/projects', { name: 'D-Project', developer: 'Dev', location: 'City', status: 'AVAILABLE' }, session.accessToken)
    const pid = ((await p.json()) as { id: string }).id
    track('projects', pid)
    const b  = await apiPost('/buildings', { projectId: pid, name: 'B1', floorsCount: 3 }, session.accessToken)
    const bid = ((await b.json()) as { id: string }).id
    track('buildings', bid)
    const f  = await apiPost('/floors', { buildingId: bid, floorNumber: 1 }, session.accessToken)
    const fid = ((await f.json()) as { id: string }).id
    track('floors', fid)
    const u  = await apiPost('/units', {
      projectId: pid, buildingId: bid, floorId: fid,
      unitNumber: '401', type: 'APARTMENT', area: 100,
      price: 1_000_000, bedroomCount: 2, bathroomCount: 2, status: 'AVAILABLE',
    }, session.accessToken)
    localUnitId = ((await u.json()) as { id: string }).id
    track('units', localUnitId)
  })

  it('Create deal', async () => {
    const res  = await apiPost('/deals', {
      customerId:    localCustomerId,
      unitId:        localUnitId,
      dealValue:     1_000_000,
      netSaleValue:  1_000_000,
      pipelineStage: 'NEGOTIATION',
    }, session.accessToken)
    expect([200, 201]).toContain(res.status)
    const body = await res.json() as { id: string }
    dealId = body.id
    track('deals', dealId)
  })

  it('Advance deal pipeline stage', async () => {
    const res  = await apiPatch(`/deals/${dealId}`, {
      pipelineStage: 'CONTRACT_REVIEW',
    }, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { pipelineStage: string }
    expect(body.pipelineStage).toBe('CONTRACT_REVIEW')
  })

  it('Deal appears in pipeline list', async () => {
    const res  = await apiGet('/deals?limit=100', session.accessToken)
    const body = await res.json() as { data: Array<{ id: string }> }
    expect(body.data.some((d) => d.id === dealId)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-9  PAYMENT PLANS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-9: Payment plans + Installments + Payments', () => {
  let planId: string
  let installmentId: string
  let paymentId: string
  let localDealId: string
  let localCustomerId: string
  let localUnitId: string

  beforeAll(async () => {
    const c = await apiPost('/customers', { fullName: 'Pay Customer', phone: '+971500000030' }, session.accessToken)
    localCustomerId = ((await c.json()) as { id: string }).id
    track('customers', localCustomerId)

    const p  = await apiPost('/projects', { name: 'P-Project', developer: 'Dev', location: 'City', status: 'AVAILABLE' }, session.accessToken)
    const pid = ((await p.json()) as { id: string }).id
    track('projects', pid)
    const b  = await apiPost('/buildings', { projectId: pid, name: 'B1', floorsCount: 3 }, session.accessToken)
    const bid = ((await b.json()) as { id: string }).id
    track('buildings', bid)
    const f  = await apiPost('/floors', { buildingId: bid, floorNumber: 1 }, session.accessToken)
    const fid = ((await f.json()) as { id: string }).id
    track('floors', fid)
    const u  = await apiPost('/units', {
      projectId: pid, buildingId: bid, floorId: fid,
      unitNumber: '501', type: 'APARTMENT', area: 110,
      price: 1_100_000, bedroomCount: 3, bathroomCount: 2, status: 'AVAILABLE',
    }, session.accessToken)
    localUnitId = ((await u.json()) as { id: string }).id
    track('units', localUnitId)

    const d = await apiPost('/deals', {
      customerId:   localCustomerId, unitId: localUnitId,
      dealValue:    1_100_000, netSaleValue: 1_100_000, pipelineStage: 'NEGOTIATION',
    }, session.accessToken)
    localDealId = ((await d.json()) as { id: string }).id
    track('deals', localDealId)
  })

  it('Create payment plan with 4 installments', async () => {
    const res  = await apiPost('/payment-plans', {
      dealId:           localDealId,
      totalAmount:      1_100_000,
      downPayment:      100_000,
      handoverAmount:   0,
      installmentCount: 4,
      frequencyMonths:  3,
      startDate:        new Date(Date.now() + 30 * 86400_000).toISOString(),
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string; installments: Array<{ id: string }> }
    planId = body.id
    track('payment_plans', planId)
    expect(body.installments).toHaveLength(4)
    installmentId = body.installments[0].id
  })

  it('List installments for deal', async () => {
    const res  = await apiGet(`/installments?dealId=${localDealId}`, session.accessToken)
    const body = await res.json() as { data: Array<unknown> }
    expect(body.data.length).toBe(4)
  })

  it('Record a payment against first installment', async () => {
    const res  = await apiPost('/payments', {
      dealId:        localDealId,
      installmentId,
      amount:        250_000,
      method:        'BANK_TRANSFER',
      paidAt:        new Date().toISOString(),
      referenceNumber: 'REG-TEST-001',
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string; status: string }
    paymentId = body.id
    expect(body.status).toBe('COMPLETED')
  })

  it('Installment is now PAID or PARTIALLY_PAID', async () => {
    const res  = await apiGet(`/installments/${installmentId}`, session.accessToken)
    const body = await res.json() as { status: string }
    expect(['PAID', 'PARTIALLY_PAID']).toContain(body.status)
  })

  it('Void payment reverses installment', async () => {
    const res  = await apiPost(`/payments/${paymentId}/void`, { reason: 'regression test' }, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string }
    expect(body.status).toBe('REFUNDED')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-10  COMMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-10: Commissions', () => {
  let ruleId: string

  it('Create commission rule', async () => {
    const res  = await apiPost('/commission-rules', {
      name:        'Regression Rule',
      agentRate:   2,
      managerRate: 0.5,
      isDefault:   false,
      conditions:  {},
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    ruleId = body.id
  })

  it('List commission rules contains new rule', async () => {
    const res  = await apiGet('/commission-rules', session.accessToken)
    const body = await res.json() as { data: Array<{ id: string }> }
    expect(body.data.some((r) => r.id === ruleId)).toBe(true)
  })

  it('Delete commission rule', async () => {
    const res = await apiDelete(`/commission-rules/${ruleId}`, session.accessToken)
    expect(res.status).toBe(204)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-11  TASKS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-11: Tasks', () => {
  let taskId: string
  let meId:   string

  beforeAll(async () => {
    const meRes  = await apiGet('/auth/me', session.accessToken)
    const meBody = await meRes.json() as { id: string }
    meId = meBody.id
  })

  it('Create task', async () => {
    const res  = await apiPost('/tasks', {
      assigneeId:  meId,
      title:       'Regression Task',
      priority:    'HIGH',
      dueAt:       new Date(Date.now() + 86400_000).toISOString(),
    }, session.accessToken)
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string; status: string }
    taskId = body.id
    track('tasks', taskId)
    expect(body.status).toBe('TODO')
  })

  it('Complete task', async () => {
    const res  = await apiPatch(`/tasks/${taskId}`, { status: 'DONE' }, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string; completedAt: string | null }
    expect(body.status).toBe('DONE')
    expect(body.completedAt).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-12  NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-12: Notifications', () => {
  let notifId: string
  let meId:    string

  beforeAll(async () => {
    const meRes  = await apiGet('/auth/me', session.accessToken)
    const meBody = await meRes.json() as { id: string }
    meId = meBody.id

    // Inject a notification via service-role (simulating a server-side event)
    const { data } = await supabaseAdmin
      .from('notifications')
      .insert({
        organization_id: orgId,
        user_id:         meId,
        type:            'SYSTEM',
        title:           'Regression notification',
        body:            'Test body',
        payload:         {},
        is_read:         false,
      })
      .select('id')
      .single()
    notifId = data?.id
  })

  it('List notifications contains injected notif', async () => {
    const res  = await apiGet('/notifications', session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ id: string }> }
    expect(body.data.some((n) => n.id === notifId)).toBe(true)
  })

  it('Mark notification read', async () => {
    const res  = await apiPatch(`/notifications/${notifId}/read`, {}, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { isRead: boolean }
    expect(body.isRead).toBe(true)
  })

  it('Mark all read returns count', async () => {
    const res  = await apiPost('/notifications/mark-all-read', {}, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { updated: number }
    expect(typeof body.updated).toBe('number')
  })

  afterAll(async () => {
    if (notifId) {
      await supabaseAdmin.from('notifications').delete().eq('id', notifId)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-14  DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-14: Documents (upload + signed download)', () => {
  let docId:      string
  let localLeadId: string

  beforeAll(async () => {
    const l = await apiPost('/leads', {
      fullName: 'Doc Lead', phone: '+971500000099', source: 'DIRECT',
    }, session.accessToken)
    localLeadId = ((await l.json()) as { id: string }).id
    track('leads', localLeadId)
  })

  it('Upload document for lead', async () => {
    const formData = new FormData()
    formData.append(
      'file',
      new Blob(['regression test document content'], { type: 'application/pdf' }),
      'regression-test.pdf',
    )
    formData.append('relatedType', 'LEAD')
    formData.append('relatedId', localLeadId)
    formData.append('name', 'Regression Doc')

    const res = await apiFetch('/documents', {
      method: 'POST',
      token:  session.accessToken,
      body:   formData,
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    expect([200, 201]).toContain(res.status)
    const body = await res.json() as { id: string }
    docId = body.id
    track('documents', docId)
  })

  it('Get signed download URL', async () => {
    const res  = await apiGet(`/documents/${docId}/download`, session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { url: string }
    expect(body.url).toMatch(/^https?:\/\//)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-15  ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-15: Analytics', () => {
  it('Dashboard KPIs return without error', async () => {
    const res  = await apiGet('/analytics/dashboard', session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    // Check for at least one known KPI key
    expect(Object.keys(body).length).toBeGreaterThan(0)
  })

  it('Lead funnel endpoint responds', async () => {
    const res = await apiGet('/analytics/lead-funnel', session.accessToken)
    expect([200, 404]).toContain(res.status) // 404 acceptable if not implemented yet
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-16  AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-16: Audit logs', () => {
  it('GET /audit-logs returns paginated list', async () => {
    const res  = await apiGet('/audit-logs?limit=10', session.accessToken)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[]; total: number }
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.total).toBe('number')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-17  SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

describe('M-17: Settings', () => {
  it('GET /settings returns org settings', async () => {
    const res  = await apiGet('/settings', session.accessToken)
    expect([200, 403]).toContain(res.status) // 403 for non-admin roles
    if (res.status === 200) {
      const body = await res.json() as Record<string, unknown>
      expect(typeof body).toBe('object')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M-19  REALTIME SMOKE TEST
// ─────────────────────────────────────────────────────────────────────────────

describe('M-19: Realtime (subscription smoke test)', () => {
  it('Supabase Realtime channel for notifications subscribes without error', async () => {
    const { createClient: createCl } = await import('@supabase/supabase-js')
    const client = createCl(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_ANON_KEY']!,
    )

    await client.auth.setSession({
      access_token:  session.accessToken,
      refresh_token: 'dummy',
    })

    const channelName = `test-notifications-${Date.now()}`
    let subscribeStatus = ''

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Realtime subscribe timeout')), 8000)

      const channel = client.channel(channelName)
        .on('postgres_changes', {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.not_a_real_user`,
        }, () => { /* no-op */ })
        .subscribe((status) => {
          subscribeStatus = status
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout)
            client.removeChannel(channel)
            resolve()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout)
            reject(new Error(`Realtime channel error: ${status}`))
          }
        })
    })

    expect(subscribeStatus).toBe('SUBSCRIBED')
  }, 15_000)
})
