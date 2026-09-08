/**
 * Phase 6 — Lead management integration tests.
 * CRUD + assign + timeline + scoring + conversion + saved units
 * Run: pnpm exec vitest run src/modules/leads/__tests__/leads.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../../main.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

// Admin
let adminToken: string
let orgId: string

// Agent
let agentToken: string
let agentId: string

// IDs
let leadId: string
let unitId: string
let projectId: string

async function headers(token: string) {
  return { Authorization: `Bearer ${token}` }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  // Register org + admin
  const reg = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      orgName: 'Leads Test Realty',
      orgSlug: `leads-test-${Date.now()}`,
      firstName: 'Lead',
      lastName: 'Admin',
      email: `lead-admin-${Date.now()}@test.com`,
      password: 'Secret123',
    },
  })
  expect(reg.statusCode).toBe(201)
  adminToken = reg.json().accessToken
  orgId = reg.json().organization.id

  // Create a sales agent
  const agentReg = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: await headers(adminToken),
    payload: {
      firstName: 'Sales',
      lastName: 'Agent',
      email: `agent-${Date.now()}@test.com`,
      password: 'Secret123',
      role: 'SALES_AGENT',
    },
  })
  expect(agentReg.statusCode).toBe(201)
  agentId = agentReg.json().id

  // Login as agent
  const agentLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: agentReg.json().email,
      password: 'Secret123',
    },
  })
  expect(agentLogin.statusCode).toBe(200)
  agentToken = agentLogin.json().accessToken

  // Create a project + unit for saved-units tests
  const proj = await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    headers: await headers(adminToken),
    payload: {
      name: 'Test Project',
      developer: 'Test Dev',
      propertyType: 'RESIDENTIAL',
      status: 'UNDER_CONSTRUCTION',
      city: 'Cairo',
      country: 'Egypt',
      startingPrice: 1000000,
    },
  })
  expect(proj.statusCode).toBe(201)
  projectId = proj.json().id

  const unit = await app.inject({
    method: 'POST',
    url: '/api/v1/units',
    headers: await headers(adminToken),
    payload: {
      projectId,
      unitNumber: 'A-101',
      unitType: 'APARTMENT',
      propertyType: 'RESIDENTIAL',
      price: 1500000,
    },
  })
  expect(unit.statusCode).toBe(201)
  unitId = unit.json().id
})

afterAll(async () => {
  await app.close()
})

// ─── Create ───────────────────────────────────────────────────────────────────

describe('Lead CRUD', () => {
  it('POST /leads — creates a lead', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: await headers(adminToken),
      payload: {
        fullName: 'Ahmed Hassan',
        phone: '+201012345678',
        whatsapp: '+201012345678',
        email: 'ahmed@example.com',
        source: 'FACEBOOK',
        temperature: 'WARM',
        budgetMin: 1000000,
        budgetMax: 2000000,
        preferredType: 'RESIDENTIAL',
        preferredLocation: 'New Cairo',
        bedrooms: 3,
        purchasePurpose: 'INVESTMENT',
        tags: ['hot-area', 'investor'],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.fullName).toBe('Ahmed Hassan')
    expect(body.source).toBe('FACEBOOK')
    expect(body.organizationId).toBe(orgId)
    leadId = body.id
  })

  it('GET /leads — lists leads', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/leads?page=1&limit=10',
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.meta.total).toBeGreaterThan(0)
  })

  it('GET /leads — filter by temperature', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/leads?temperature=WARM',
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    body.data.forEach((l: any) => expect(l.temperature).toBe('WARM'))
  })

  it('GET /leads — search by name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/leads?search=Ahmed',
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.length).toBeGreaterThan(0)
  })

  it('GET /leads/:id — get lead detail', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${leadId}`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe(leadId)
    expect(res.json().savedUnits).toBeInstanceOf(Array)
  })

  it('PATCH /leads/:id — updates lead', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/leads/${leadId}`,
      headers: await headers(adminToken),
      payload: { temperature: 'HOT', status: 'CONTACTED' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().temperature).toBe('HOT')
    expect(res.json().status).toBe('CONTACTED')
  })

  it('GET /leads/:id — returns 404 for wrong org', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/leads/nonexistent-id',
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Assignment ───────────────────────────────────────────────────────────────

describe('Lead Assignment', () => {
  it('POST /leads/:id/assign — assigns to agent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadId}/assign`,
      headers: await headers(adminToken),
      payload: { agentId },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().assignedAgent.id).toBe(agentId)
  })

  it('Agent sees assigned lead', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/leads',
      headers: await headers(agentToken),
    })
    expect(res.statusCode).toBe(200)
    const ids = res.json().data.map((l: any) => l.id)
    expect(ids).toContain(leadId)
  })

  it('Agent cannot see unassigned leads', async () => {
    // Create another lead not assigned to agent
    const other = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: await headers(adminToken),
      payload: { fullName: 'Unassigned Lead', source: 'MANUAL' },
    })
    expect(other.statusCode).toBe(201)

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/leads',
      headers: await headers(agentToken),
    })
    const ids = res.json().data.map((l: any) => l.id)
    expect(ids).not.toContain(other.json().id)
  })
})

// ─── Timeline ─────────────────────────────────────────────────────────────────

describe('Lead Timeline', () => {
  it('POST /leads/:id/timeline — adds note', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadId}/timeline`,
      headers: await headers(adminToken),
      payload: {
        type: 'NOTE_ADDED',
        payload: { note: 'Called the lead, very interested in 3BR units.' },
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().type).toBe('NOTE_ADDED')
  })

  it('POST /leads/:id/timeline — logs call and updates lastContactedAt', async () => {
    const before = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${leadId}`,
      headers: await headers(adminToken),
    })
    const prevContacted = before.json().lastContactedAt

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadId}/timeline`,
      headers: await headers(adminToken),
      payload: { type: 'CALL_LOGGED', payload: { duration: 180, outcome: 'ANSWERED' } },
    })
    expect(res.statusCode).toBe(201)

    const after = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${leadId}`,
      headers: await headers(adminToken),
    })
    expect(after.json().lastContactedAt).not.toBe(prevContacted)
  })

  it('GET /leads/:id/timeline — returns all activities', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${leadId}/timeline`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toBeInstanceOf(Array)
    expect(res.json().length).toBeGreaterThan(0)

    const types = res.json().map((a: any) => a.type)
    expect(types).toContain('NOTE_ADDED')
    expect(types).toContain('CALL_LOGGED')
    expect(types).toContain('STATUS_CHANGED')
    expect(types).toContain('ASSIGNED')
  })
})

// ─── Scoring ──────────────────────────────────────────────────────────────────

describe('Lead Scoring', () => {
  it('POST /leads/:id/score — recalculates score', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadId}/score`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().leadId).toBe(leadId)
    expect(typeof res.json().score).toBe('number')
    expect(res.json().score).toBeGreaterThanOrEqual(0)
    expect(res.json().score).toBeLessThanOrEqual(1000)
  })
})

// ─── Saved Units ──────────────────────────────────────────────────────────────

describe('Saved Units', () => {
  it('POST /leads/:id/saved-units — saves a unit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadId}/saved-units`,
      headers: await headers(adminToken),
      payload: { unitId },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().unitId).toBe(unitId)
  })

  it('POST /leads/:id/saved-units — conflict on duplicate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadId}/saved-units`,
      headers: await headers(adminToken),
      payload: { unitId },
    })
    expect(res.statusCode).toBe(409)
  })

  it('GET /leads/:id/saved-units — lists saved units', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${leadId}/saved-units`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toBeInstanceOf(Array)
    expect(res.json()[0].unit.id).toBe(unitId)
  })

  it('DELETE /leads/:id/saved-units/:unitId — removes saved unit', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/leads/${leadId}/saved-units/${unitId}`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })
})

// ─── Convert ──────────────────────────────────────────────────────────────────

describe('Lead Conversion', () => {
  it('POST /leads/:id/convert — converts lead to customer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadId}/convert`,
      headers: await headers(adminToken),
      payload: { nationality: 'Egyptian' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().fullName).toBe('Ahmed Hassan')
    expect(res.json().id).toBeDefined()
  })

  it('POST /leads/:id/convert — 409 on double conversion', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadId}/convert`,
      headers: await headers(adminToken),
      payload: {},
    })
    expect(res.statusCode).toBe(409)
  })

  it('Lead status updated to WON after conversion', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${leadId}`,
      headers: await headers(adminToken),
    })
    expect(res.json().status).toBe('WON')
  })
})

// ─── Delete ───────────────────────────────────────────────────────────────────

describe('Lead Deletion', () => {
  it('Agent cannot delete lead', async () => {
    const newLead = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: await headers(adminToken),
      payload: { fullName: 'Delete Me', source: 'MANUAL', assignedAgentId: agentId },
    })
    const nid = newLead.json().id

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/leads/${nid}`,
      headers: await headers(agentToken),
    })
    expect(res.statusCode).toBe(403)
  })

  it('Admin can delete unconverted lead', async () => {
    const newLead = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: await headers(adminToken),
      payload: { fullName: 'Delete Me', source: 'MANUAL' },
    })
    const nid = newLead.json().id

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/leads/${nid}`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })

  it('Cannot delete converted lead', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/leads/${leadId}`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(409)
  })
})
