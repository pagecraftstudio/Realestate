/**
 * Phase 5 — Property hierarchy integration tests.
 * Projects → Buildings → Floors → Units
 * Run: pnpm exec vitest run src/modules/projects/__tests__/projects.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../../main.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let accessToken: string
let orgId: string

// IDs shared across suites
let projectId: string
let buildingId: string
let floorId: string
let unitId: string

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeader() {
  return { Authorization: `Bearer ${accessToken}` }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  // Register fresh org + admin
  const reg = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      orgName: 'Property Test Realty',
      orgSlug: `prop-test-${Date.now()}`,
      firstName: 'Admin',
      lastName: 'Tester',
      email: `prop-admin-${Date.now()}@test.com`,
      password: 'Secret123',
    },
  })
  expect(reg.statusCode).toBe(201)
  const body = reg.json()
  accessToken = body.accessToken
  orgId = body.organization.id
})

afterAll(async () => {
  await app.close()
})

// ─── Projects ─────────────────────────────────────────────────────────────────

describe('Projects CRUD', () => {
  it('POST /projects — creates a project', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: await authHeader(),
      payload: {
        name: 'Marina Heights',
        developer: 'Blue Sky Development',
        propertyType: 'RESIDENTIAL',
        status: 'UNDER_CONSTRUCTION',
        city: 'Cairo',
        country: 'Egypt',
        startingPrice: 2500000,
        amenities: ['Pool', 'Gym', 'Security'],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Marina Heights')
    expect(body.organizationId).toBe(orgId)
    projectId = body.id
  })

  it('GET /projects — lists projects', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.meta.total).toBeGreaterThan(0)
  })

  it('GET /projects?search=Marina — filters by name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects?search=Marina',
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.some((p: any) => p.name === 'Marina Heights')).toBe(true)
  })

  it('GET /projects/:id — returns project with buildings', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}`,
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(projectId)
    expect(Array.isArray(body.buildings)).toBe(true)
  })

  it('PATCH /projects/:id — updates project', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}`,
      headers: await authHeader(),
      payload: { status: 'READY', city: 'New Cairo' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('READY')
    expect(res.json().city).toBe('New Cairo')
  })

  it('GET /projects/:id/stats — returns unit stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/stats`,
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.units).toBeDefined()
    expect(body.units.total).toBeDefined()
  })

  it('GET /projects/nonexistent — returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/nonexistent-id',
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Buildings ────────────────────────────────────────────────────────────────

describe('Buildings CRUD', () => {
  it('POST /buildings — creates building + auto-creates floors', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/buildings',
      headers: await authHeader(),
      payload: {
        projectId,
        name: 'Tower A',
        buildingNumber: 'A',
        floorsCount: 3,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Tower A')
    expect(body._count.floors).toBe(3)
    buildingId = body.id
  })

  it('GET /buildings?projectId=x — lists buildings', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/buildings?projectId=${projectId}`,
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.length).toBeGreaterThan(0)
  })

  it('GET /buildings/:id — returns building with floors', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.floors.length).toBe(3)
    floorId = body.floors[0].id
  })

  it('PATCH /buildings/:id — updates building name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/buildings/${buildingId}`,
      headers: await authHeader(),
      payload: { name: 'Tower Alpha' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Tower Alpha')
  })
})

// ─── Floors ───────────────────────────────────────────────────────────────────

describe('Floors', () => {
  it('GET /floors?buildingId=x — lists floors', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/floors?buildingId=${buildingId}`,
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
    expect(res.json().length).toBe(3)
  })

  it('POST /floors — creates a new floor', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/floors',
      headers: await authHeader(),
      payload: { buildingId, floorNumber: 4, label: 'Penthouse Level' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().label).toBe('Penthouse Level')
  })

  it('POST /floors — conflict on duplicate floor number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/floors',
      headers: await authHeader(),
      payload: { buildingId, floorNumber: 4 },
    })
    expect(res.statusCode).toBe(409)
  })

  it('PATCH /floors/:id — updates label', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/floors/${floorId}`,
      headers: await authHeader(),
      payload: { label: 'Ground Floor (G)' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().label).toBe('Ground Floor (G)')
  })
})

// ─── Units ────────────────────────────────────────────────────────────────────

describe('Units CRUD', () => {
  it('POST /units — creates a unit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await authHeader(),
      payload: {
        projectId,
        buildingId,
        floorId,
        unitNumber: '101',
        unitType: 'APARTMENT',
        propertyType: 'RESIDENTIAL',
        area: 120.5,
        bedrooms: 3,
        bathrooms: 2,
        finishing: 'FULLY_FINISHED',
        price: 3200000,
        pricePerMeter: 26556,
        parking: 1,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.unitNumber).toBe('101')
    expect(body.status).toBe('AVAILABLE')
    unitId = body.id
  })

  it('GET /units?projectId=x — lists units with filters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/units?projectId=${projectId}&status=AVAILABLE`,
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data[0].status).toBe('AVAILABLE')
  })

  it('GET /units/:id — returns full unit with relations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/units/${unitId}`,
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(unitId)
    expect(body.project.name).toBe('Marina Heights')
  })

  it('GET /units/:id/availability — returns availability info', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/units/${unitId}/availability`,
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().isAvailable).toBe(true)
    expect(res.json().status).toBe('AVAILABLE')
  })

  it('PATCH /units/:id — updates unit price', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/units/${unitId}`,
      headers: await authHeader(),
      payload: { price: 3400000, status: 'ON_HOLD' },
    })
    expect(res.statusCode).toBe(200)
    expect(Number(res.json().price)).toBe(3400000)
    expect(res.json().status).toBe('ON_HOLD')
  })

  it('POST /units/bulk-status — bulk update status', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/units/bulk-status',
      headers: await authHeader(),
      payload: { unitIds: [unitId], status: 'AVAILABLE' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().updated).toBe(1)
  })

  it('DELETE /units/:id — deletes available unit', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/units/${unitId}`,
      headers: await authHeader(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })
})

// ─── Tenant isolation ─────────────────────────────────────────────────────────

describe('Tenant isolation', () => {
  let otherToken: string

  beforeAll(async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        orgName: 'Rogue Realty',
        orgSlug: `rogue-${Date.now()}`,
        firstName: 'Rogue',
        lastName: 'User',
        email: `rogue-${Date.now()}@test.com`,
        password: 'Secret123',
      },
    })
    otherToken = reg.json().accessToken
  })

  it('cannot access another org project', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}`,
      headers: { Authorization: `Bearer ${otherToken}` },
    })
    expect(res.statusCode).toBe(404)
  })
})
