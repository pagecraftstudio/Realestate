/**
 * Phase 7 — Customer management integration tests.
 * CRUD + assign + saved units + match units + agent scope
 * Run: pnpm exec vitest run src/modules/customers/__tests__/customers.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../../main.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

let adminToken: string
let orgId: string
let agentToken: string
let agentId: string

let customerId: string
let unitId: string
let projectId: string

// Customer created from lead conversion (phase 6)
let convertedCustomerId: string

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
      orgName: 'Customer Test Realty',
      orgSlug: `cust-test-${Date.now()}`,
      firstName: 'Cust',
      lastName: 'Admin',
      email: `cust-admin-${Date.now()}@test.com`,
      password: 'Secret123',
    },
  })
  expect(reg.statusCode).toBe(201)
  adminToken = reg.json().accessToken
  orgId = reg.json().organization.id

  // Create agent
  const agentRes = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: await headers(adminToken),
    payload: {
      firstName: 'Agent',
      lastName: 'Seven',
      email: `agent7-${Date.now()}@test.com`,
      password: 'Secret123',
      role: 'SALES_AGENT',
    },
  })
  expect(agentRes.statusCode).toBe(201)
  agentId = agentRes.json().id

  const agentLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: agentRes.json().email, password: 'Secret123' },
  })
  agentToken = agentLogin.json().accessToken

  // Project + unit for saved-units / match-units
  const proj = await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    headers: await headers(adminToken),
    payload: {
      name: 'Customer Test Project',
      developer: 'Dev Co',
      propertyType: 'RESIDENTIAL',
      status: 'UNDER_CONSTRUCTION',
      city: 'New Cairo',
      country: 'Egypt',
      startingPrice: 1000000,
    },
  })
  projectId = proj.json().id

  const unit = await app.inject({
    method: 'POST',
    url: '/api/v1/units',
    headers: await headers(adminToken),
    payload: {
      projectId,
      unitNumber: 'B-201',
      unitType: 'APARTMENT',
      propertyType: 'RESIDENTIAL',
      price: 1800000,
      bedrooms: 3,
      area: 140,
    },
  })
  unitId = unit.json().id

  // Create customer via lead conversion (exercise phase 6 integration)
  const lead = await app.inject({
    method: 'POST',
    url: '/api/v1/leads',
    headers: await headers(adminToken),
    payload: {
      fullName: 'Converted Customer',
      phone: '+201099999999',
      source: 'REFERRAL',
      budgetMin: 1500000,
      budgetMax: 2000000,
      preferredType: 'RESIDENTIAL',
      bedrooms: 3,
    },
  })
  const leadId = lead.json().id

  const conv = await app.inject({
    method: 'POST',
    url: `/api/v1/leads/${leadId}/convert`,
    headers: await headers(adminToken),
    payload: { nationality: 'Egyptian' },
  })
  expect(conv.statusCode).toBe(201)
  convertedCustomerId = conv.json().id
})

afterAll(async () => {
  await app.close()
})

// ─── Create ───────────────────────────────────────────────────────────────────

describe('Customer CRUD', () => {
  it('POST /customers — creates standalone customer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      headers: await headers(adminToken),
      payload: {
        fullName: 'Sara Mostafa',
        phone: '+201011112222',
        email: 'sara@example.com',
        nationality: 'Egyptian',
        country: 'Egypt',
        city: 'Alexandria',
        budgetMin: 800000,
        budgetMax: 1500000,
        preferredType: 'RESIDENTIAL',
        bedrooms: 2,
        tags: ['cash-buyer'],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.fullName).toBe('Sara Mostafa')
    expect(body.organizationId).toBe(orgId)
    expect(body.leadId).toBeNull()
    customerId = body.id
  })

  it('GET /customers — lists customers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customers?page=1&limit=20',
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.meta.total).toBeGreaterThanOrEqual(2) // standalone + converted
  })

  it('GET /customers — converted customer has leadId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/customers/${convertedCustomerId}`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().leadId).not.toBeNull()
    expect(res.json().fullName).toBe('Converted Customer')
  })

  it('GET /customers — search by name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customers?search=Sara',
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.length).toBeGreaterThan(0)
    expect(res.json().data[0].fullName).toContain('Sara')
  })

  it('GET /customers/:id — full profile with relations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/customers/${customerId}`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.savedUnits).toBeInstanceOf(Array)
    expect(body.viewings).toBeInstanceOf(Array)
    expect(body.deals).toBeInstanceOf(Array)
  })

  it('PATCH /customers/:id — updates profile', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/customers/${customerId}`,
      headers: await headers(adminToken),
      payload: { city: 'Cairo', notes: 'Prefers ground floor' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().city).toBe('Cairo')
    expect(res.json().notes).toBe('Prefers ground floor')
  })

  it('GET /customers/:id — 404 for nonexistent', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/nonexistent-id',
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Assignment ───────────────────────────────────────────────────────────────

describe('Customer Assignment', () => {
  it('POST /customers/:id/assign — assigns to agent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/customers/${customerId}/assign`,
      headers: await headers(adminToken),
      payload: { agentId },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().assignedAgent.id).toBe(agentId)
  })

  it('Agent sees assigned customer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customers',
      headers: await headers(agentToken),
    })
    expect(res.statusCode).toBe(200)
    const ids = res.json().data.map((c: any) => c.id)
    expect(ids).toContain(customerId)
  })

  it('Agent cannot see unassigned customers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/customers',
      headers: await headers(agentToken),
    })
    const ids = res.json().data.map((c: any) => c.id)
    expect(ids).not.toContain(convertedCustomerId)
  })
})

// ─── Saved Units ──────────────────────────────────────────────────────────────

describe('Customer Saved Units', () => {
  it('POST /customers/:id/saved-units — saves unit with matchScore', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/customers/${customerId}/saved-units`,
      headers: await headers(adminToken),
      payload: {
        unitId,
        matchScore: 85,
        matchReasons: ['Within budget', 'Correct bedrooms'],
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().unitId).toBe(unitId)
    expect(res.json().matchScore).toBe(85)
  })

  it('POST — 409 on duplicate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/customers/${customerId}/saved-units`,
      headers: await headers(adminToken),
      payload: { unitId },
    })
    expect(res.statusCode).toBe(409)
  })

  it('GET /customers/:id/saved-units — lists saved units sorted by matchScore', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/customers/${customerId}/saved-units`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toBeInstanceOf(Array)
    expect(res.json()[0].unit.id).toBe(unitId)
    expect(res.json()[0].matchScore).toBe(85)
  })

  it('DELETE /customers/:id/saved-units/:unitId — removes', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/customers/${customerId}/saved-units/${unitId}`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })
})

// ─── Match Units ──────────────────────────────────────────────────────────────

describe('Match Units', () => {
  it('GET /customers/:id/match-units — returns scored units', async () => {
    // converted customer has budget + bedroom prefs set
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/customers/${convertedCustomerId}/match-units`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toBeInstanceOf(Array)
    // Each result should have matchScore and unit
    if (res.json().length > 0) {
      const first = res.json()[0]
      expect(first).toHaveProperty('unit')
      expect(first).toHaveProperty('matchScore')
      expect(first).toHaveProperty('matchReasons')
      expect(first.matchScore).toBeGreaterThanOrEqual(0)
      expect(first.matchScore).toBeLessThanOrEqual(100)
    }
  })

  it('Results sorted by matchScore descending', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/customers/${convertedCustomerId}/match-units`,
      headers: await headers(adminToken),
    })
    const scores = res.json().map((r: any) => r.matchScore)
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1])
    }
  })
})

// ─── Delete ───────────────────────────────────────────────────────────────────

describe('Customer Deletion', () => {
  it('Agent cannot delete', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/customers/${customerId}`,
      headers: await headers(agentToken),
    })
    expect(res.statusCode).toBe(403)
  })

  it('Admin can delete customer without deals', async () => {
    const fresh = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      headers: await headers(adminToken),
      payload: { fullName: 'Delete Me', phone: '+200000000000' },
    })
    const fid = fresh.json().id

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/customers/${fid}`,
      headers: await headers(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })
})
