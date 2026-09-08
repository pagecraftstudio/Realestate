/**
 * Phase 5 — Units integration tests.
 * CRUD + status transitions + bulk-status + availability + tenant isolation
 * Run: pnpm exec vitest run src/modules/units/__tests__/units.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../../main.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

let adminToken: string
let orgId: string
let orgBToken: string

let projectId: string
let buildingId: string
let floorId: string
let unitId: string
let unit2Id: string

async function h(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// Minimal unit payload
const baseUnit = (n: string) => ({
  unitNumber: n,
  unitType: 'APARTMENT',
  area: 100,
  price: 750000,
  bedrooms: 2,
  bathrooms: 1,
})

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  // Org A
  const reg = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      orgName: 'Units Test Realty',
      orgSlug: `unit-test-${Date.now()}`,
      firstName: 'Unit',
      lastName: 'Admin',
      email: `unit-admin-${Date.now()}@test.com`,
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
      orgName: 'Units Other Org',
      orgSlug: `unit-other-${Date.now()}`,
      firstName: 'Other',
      lastName: 'Admin',
      email: `unit-other-${Date.now()}@test.com`,
      password: 'Secret123',
    },
  })
  expect(regB.statusCode).toBe(201)
  orgBToken = regB.json().accessToken

  // Project → Building → Floor
  const proj = await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    headers: await h(adminToken),
    payload: { name: 'Unit Test Towers', developer: 'Dev', location: 'City' },
  })
  expect(proj.statusCode).toBe(201)
  projectId = proj.json().id

  const bldg = await app.inject({
    method: 'POST',
    url: '/api/v1/buildings',
    headers: await h(adminToken),
    payload: { projectId, name: 'Block U', buildingNumber: 'U', floorsCount: 3 },
  })
  expect(bldg.statusCode).toBe(201)
  buildingId = bldg.json().id

  const bldgDetail = await app.inject({
    method: 'GET',
    url: `/api/v1/buildings/${buildingId}`,
    headers: await h(adminToken),
  })
  floorId = bldgDetail.json().floors[0].id
})

afterAll(async () => {
  await app.close()
})

// ─── Create ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/units', () => {
  it('creates unit with full property details', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: {
        projectId,
        buildingId,
        floorId,
        ...baseUnit('U-101'),
        finishing: 'FULLY_FINISHED',
        view: 'GARDEN',
        parking: 1,
        notes: 'Corner unit',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.unitNumber).toBe('U-101')
    expect(body.status).toBe('AVAILABLE')
    expect(body.organizationId).toBe(orgId)
    unitId = body.id
  })

  it('creates a second unit for bulk tests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: { projectId, buildingId, floorId, ...baseUnit('U-102') },
    })
    expect(res.statusCode).toBe(201)
    unit2Id = res.json().id
  })

  it('rejects unit with nonexistent project', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: { projectId: 'fake-project', ...baseUnit('U-999') },
    })
    expect(res.statusCode).toBe(404)
  })

  it('rejects unit for project in another org', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(orgBToken),
      payload: { projectId, ...baseUnit('U-888') },
    })
    expect(res.statusCode).toBe(404)
  })

  it('requires auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      payload: { projectId, ...baseUnit('U-000') },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── List ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/units', () => {
  it('returns paginated units for org', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/units',
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(2)
    expect(body.meta.total).toBeGreaterThanOrEqual(2)
    expect(body.data.every((u: any) => u.organizationId === orgId)).toBe(true)
  })

  it('filters by projectId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/units?projectId=${projectId}`,
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.every((u: any) => u.projectId === projectId)).toBe(true)
  })

  it('filters by status=AVAILABLE', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/units?status=AVAILABLE',
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.every((u: any) => u.status === 'AVAILABLE')).toBe(true)
  })

  it('org B sees no org A units', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/units',
      headers: await h(orgBToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.map((u: any) => u.id)).not.toContain(unitId)
  })
})

// ─── Get ──────────────────────────────────────────────────────────────────────

describe('GET /api/v1/units/:id', () => {
  it('returns unit detail with relations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/units/${unitId}`,
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(unitId)
    expect(body.project?.id).toBe(projectId)
    expect(body.building?.id).toBe(buildingId)
    expect(body.floor?.id).toBe(floorId)
  })

  it('org B cannot get org A unit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/units/${unitId}`,
      headers: await h(orgBToken),
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 404 for nonexistent id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/units/00000000-0000-0000-0000-000000000000',
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Update ───────────────────────────────────────────────────────────────────

describe('PATCH /api/v1/units/:id', () => {
  it('updates price and notes', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/units/${unitId}`,
      headers: await h(adminToken),
      payload: { price: 800000, notes: 'Price increased' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().price).toBe(800000)
    expect(res.json().notes).toBe('Price increased')
  })

  it('allows AVAILABLE → ON_HOLD transition', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/units/${unit2Id}`,
      headers: await h(adminToken),
      payload: { status: 'ON_HOLD' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ON_HOLD')
  })

  it('org B cannot update org A unit', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/units/${unitId}`,
      headers: await h(orgBToken),
      payload: { price: 1 },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Status transitions ───────────────────────────────────────────────────────

describe('Status transition guards', () => {
  it('blocks SOLD → AVAILABLE direct transition', async () => {
    // Force unit to SOLD (allowed from AVAILABLE)
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/units/${unitId}`,
      headers: await h(adminToken),
      payload: { status: 'SOLD' },
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/units/${unitId}`,
      headers: await h(adminToken),
      payload: { status: 'AVAILABLE' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('blocks SOLD → ON_HOLD direct transition', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/units/${unitId}`,
      headers: await h(adminToken),
      payload: { status: 'ON_HOLD' },
    })
    expect(res.statusCode).toBe(409)
  })
})

// ─── Bulk status ──────────────────────────────────────────────────────────────

describe('POST /api/v1/units/bulk-status', () => {
  let bulkUnit1: string
  let bulkUnit2: string

  beforeAll(async () => {
    const r1 = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: { projectId, buildingId, ...baseUnit('BULK-1') },
    })
    bulkUnit1 = r1.json().id

    const r2 = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: { projectId, buildingId, ...baseUnit('BULK-2') },
    })
    bulkUnit2 = r2.json().id
  })

  it('bulk-updates status for multiple units', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/units/bulk-status',
      headers: await h(adminToken),
      payload: { unitIds: [bulkUnit1, bulkUnit2], status: 'ON_HOLD' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.updated).toBe(2)
  })

  it('ignores unit IDs from another org silently', async () => {
    // Org B tries to bulk-update Org A units
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/units/bulk-status',
      headers: await h(orgBToken),
      payload: { unitIds: [bulkUnit1, bulkUnit2], status: 'AVAILABLE' },
    })
    // Should succeed (0 units matched) or return 404 — not crash
    expect([200, 404]).toContain(res.statusCode)
    if (res.statusCode === 200) {
      expect(res.json().updated).toBe(0)
    }
  })
})

// ─── Availability check ───────────────────────────────────────────────────────

describe('GET /api/v1/units/:id/availability', () => {
  it('returns availability info for an available unit', async () => {
    const fresh = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: { projectId, buildingId, ...baseUnit('AVAIL-CHECK') },
    })
    const freshId = fresh.json().id

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/units/${freshId}/availability`,
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('AVAILABLE')
    expect(body.isAvailable).toBe(true)
  })

  it('org B cannot check org A unit availability', async () => {
    const fresh = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: { projectId, buildingId, ...baseUnit('AVAIL-GUARD') },
    })
    const freshId = fresh.json().id

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/units/${freshId}/availability`,
      headers: await h(orgBToken),
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Delete ───────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/units/:id', () => {
  it('deletes an available unit', async () => {
    const fresh = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: { projectId, buildingId, ...baseUnit('DEL-ME') },
    })
    const freshId = fresh.json().id

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/units/${freshId}`,
      headers: await h(adminToken),
    })
    expect(del.statusCode).toBe(200)
    expect(del.json().success).toBe(true)

    // Verify gone
    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/units/${freshId}`,
      headers: await h(adminToken),
    })
    expect(get.statusCode).toBe(404)
  })

  it('org B cannot delete org A unit', async () => {
    const fresh = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: { projectId, buildingId, ...baseUnit('NO-DEL') },
    })
    const freshId = fresh.json().id

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/units/${freshId}`,
      headers: await h(orgBToken),
    })
    expect(del.statusCode).toBe(404)
  })
})
