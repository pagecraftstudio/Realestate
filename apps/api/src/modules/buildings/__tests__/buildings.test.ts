/**
 * Phase 5 — Buildings integration tests.
 * CRUD + auto-floor creation + delete-with-units guard + tenant isolation
 * Run: pnpm exec vitest run src/modules/buildings/__tests__/buildings.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../../main.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

let adminToken: string
let orgId: string

// Org B (cross-tenant isolation)
let orgBToken: string

let projectId: string
let buildingId: string
let floorCount: number

async function h(token: string) {
  return { Authorization: `Bearer ${token}` }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  // Org A
  const reg = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      orgName: 'Buildings Test Realty',
      orgSlug: `bldg-test-${Date.now()}`,
      firstName: 'Bldg',
      lastName: 'Admin',
      email: `bldg-admin-${Date.now()}@test.com`,
      password: 'Secret123',
    },
  })
  expect(reg.statusCode).toBe(201)
  adminToken = reg.json().accessToken
  orgId = reg.json().organization.id

  // Org B
  const regB = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      orgName: 'Bldg Other Org',
      orgSlug: `bldg-other-${Date.now()}`,
      firstName: 'Other',
      lastName: 'Admin',
      email: `bldg-other-${Date.now()}@test.com`,
      password: 'Secret123',
    },
  })
  expect(regB.statusCode).toBe(201)
  orgBToken = regB.json().accessToken

  // Create a project for Org A
  const proj = await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    headers: await h(adminToken),
    payload: {
      name: 'Test Tower',
      developer: 'Test Dev',
      location: 'Test City',
    },
  })
  expect(proj.statusCode).toBe(201)
  projectId = proj.json().id
})

afterAll(async () => {
  await app.close()
})

// ─── Create ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/buildings', () => {
  it('creates building with auto-generated floors', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/buildings',
      headers: await h(adminToken),
      payload: {
        projectId,
        name: 'Tower A',
        buildingNumber: 'A',
        floorsCount: 5,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.name).toBe('Tower A')
    expect(body.floorsCount).toBe(5)
    expect(body.organizationId).toBe(orgId)
    buildingId = body.id
    floorCount = body.floorsCount
  })

  it('rejects building for project that does not exist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/buildings',
      headers: await h(adminToken),
      payload: {
        projectId: 'nonexistent-project-id',
        name: 'Ghost Tower',
        buildingNumber: 'G',
        floorsCount: 3,
      },
    })
    expect(res.statusCode).toBe(404)
  })

  it('rejects building for project owned by another org', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/buildings',
      headers: await h(orgBToken),
      payload: {
        projectId,       // Org A's project
        name: 'Stolen Tower',
        buildingNumber: 'X',
        floorsCount: 2,
      },
    })
    expect(res.statusCode).toBe(404)
  })

  it('requires auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/buildings',
      payload: { projectId, name: 'No Auth', buildingNumber: 'N', floorsCount: 1 },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── List ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/buildings', () => {
  it('returns buildings for org', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/buildings',
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    expect(body.data.every((b: any) => b.organizationId === orgId)).toBe(true)
  })

  it('filters by projectId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/buildings?projectId=${projectId}`,
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.every((b: any) => b.projectId === projectId)).toBe(true)
  })

  it('org B cannot see org A buildings', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/buildings',
      headers: await h(orgBToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    // None of Org B's results should include buildingId (Org A's building)
    expect(body.data.map((b: any) => b.id)).not.toContain(buildingId)
  })
})

// ─── Get ──────────────────────────────────────────────────────────────────────

describe('GET /api/v1/buildings/:id', () => {
  it('returns building with floors', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(buildingId)
    expect(Array.isArray(body.floors)).toBe(true)
    expect(body.floors.length).toBe(floorCount)
    // Auto-created floors sorted ascending
    expect(body.floors[0].floorNumber).toBe(1)
    expect(body.floors[floorCount - 1].floorNumber).toBe(floorCount)
  })

  it('org B cannot get org A building', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await h(orgBToken),
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 404 for nonexistent id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/buildings/00000000-0000-0000-0000-000000000000',
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Update ───────────────────────────────────────────────────────────────────

describe('PATCH /api/v1/buildings/:id', () => {
  it('updates name and description', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await h(adminToken),
      payload: { name: 'Tower A (Renamed)', description: 'Updated desc' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Tower A (Renamed)')
    expect(res.json().description).toBe('Updated desc')
  })

  it('increases floorsCount and auto-creates new floors', async () => {
    const newCount = floorCount + 2
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await h(adminToken),
      payload: { floorsCount: newCount },
    })
    expect(res.statusCode).toBe(200)

    // Verify new floors exist
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await h(adminToken),
    })
    expect(detail.json().floors.length).toBeGreaterThanOrEqual(newCount)
  })

  it('org B cannot update org A building', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await h(orgBToken),
      payload: { name: 'Hijacked' },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Delete ───────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/buildings/:id', () => {
  it('blocks delete when building has units', async () => {
    // Create a unit in the building first
    const unitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: {
        projectId,
        buildingId,
        unitNumber: 'A-101',
        unitType: 'APARTMENT',
        area: 80,
        price: 500000,
        bedrooms: 2,
        bathrooms: 1,
      },
    })
    expect(unitRes.statusCode).toBe(201)

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await h(adminToken),
    })
    expect(del.statusCode).toBe(409)
  })

  it('deletes empty building', async () => {
    // Create a fresh building with no units
    const newBldg = await app.inject({
      method: 'POST',
      url: '/api/v1/buildings',
      headers: await h(adminToken),
      payload: {
        projectId,
        name: 'Temp Tower',
        buildingNumber: 'T',
        floorsCount: 1,
      },
    })
    expect(newBldg.statusCode).toBe(201)
    const tempId = newBldg.json().id

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/buildings/${tempId}`,
      headers: await h(adminToken),
    })
    expect(del.statusCode).toBe(200)
    expect(del.json().success).toBe(true)
  })

  it('org B cannot delete org A building', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await h(orgBToken),
    })
    expect(res.statusCode).toBe(404)
  })
})
