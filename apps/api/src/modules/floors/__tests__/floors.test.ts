/**
 * Phase 5 — Floors integration tests.
 * CRUD + duplicate floor guard + delete-with-units guard + tenant isolation
 * Run: pnpm exec vitest run src/modules/floors/__tests__/floors.test.ts
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
let floorId: string  // first auto-created floor from building creation

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
      orgName: 'Floors Test Realty',
      orgSlug: `floor-test-${Date.now()}`,
      firstName: 'Floor',
      lastName: 'Admin',
      email: `floor-admin-${Date.now()}@test.com`,
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
      orgName: 'Floors Other Org',
      orgSlug: `floor-other-${Date.now()}`,
      firstName: 'Other',
      lastName: 'Admin',
      email: `floor-other-${Date.now()}@test.com`,
      password: 'Secret123',
    },
  })
  expect(regB.statusCode).toBe(201)
  orgBToken = regB.json().accessToken

  // Project
  const proj = await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    headers: await h(adminToken),
    payload: { name: 'Floor Test Tower', developer: 'Dev', location: 'City' },
  })
  expect(proj.statusCode).toBe(201)
  projectId = proj.json().id

  // Building with 3 floors (auto-created)
  const bldg = await app.inject({
    method: 'POST',
    url: '/api/v1/buildings',
    headers: await h(adminToken),
    payload: { projectId, name: 'Block A', buildingNumber: 'A', floorsCount: 3 },
  })
  expect(bldg.statusCode).toBe(201)
  buildingId = bldg.json().id

  // Get auto-created floor id
  const detail = await app.inject({
    method: 'GET',
    url: `/api/v1/buildings/${buildingId}`,
    headers: await h(adminToken),
  })
  floorId = detail.json().floors[0].id
})

afterAll(async () => {
  await app.close()
})

// ─── List ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/floors', () => {
  it('lists floors for a building in ascending order', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/floors?buildingId=${buildingId}`,
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(3)
    // Ascending by floorNumber
    expect(body[0].floorNumber).toBe(1)
    expect(body[1].floorNumber).toBe(2)
    expect(body[2].floorNumber).toBe(3)
  })

  it('requires buildingId query param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/floors',
      headers: await h(adminToken),
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for building not in org', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/floors?buildingId=${buildingId}`,
      headers: await h(orgBToken),
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Create ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/floors', () => {
  it('creates a new floor with custom label', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/floors',
      headers: await h(adminToken),
      payload: {
        buildingId,
        floorNumber: 4,
        label: 'Penthouse',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.floorNumber).toBe(4)
    expect(body.label).toBe('Penthouse')
    expect(body.buildingId).toBe(buildingId)
  })

  it('rejects duplicate floor number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/floors',
      headers: await h(adminToken),
      payload: { buildingId, floorNumber: 1 }, // already exists
    })
    expect(res.statusCode).toBe(409)
  })

  it('rejects floor for building in another org', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/floors',
      headers: await h(orgBToken),
      payload: { buildingId, floorNumber: 99 },
    })
    expect(res.statusCode).toBe(404)
  })

  it('auto-labels floor when label not provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/floors',
      headers: await h(adminToken),
      payload: { buildingId, floorNumber: 5 },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().label).toBe('Floor 5')
  })
})

// ─── Update ───────────────────────────────────────────────────────────────────

describe('PATCH /api/v1/floors/:id', () => {
  it('updates floor label', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/floors/${floorId}`,
      headers: await h(adminToken),
      payload: { label: 'Ground Level' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().label).toBe('Ground Level')
  })

  it('org B cannot update org A floor', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/floors/${floorId}`,
      headers: await h(orgBToken),
      payload: { label: 'Hacked' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 404 for nonexistent floor', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/floors/00000000-0000-0000-0000-000000000000',
      headers: await h(adminToken),
      payload: { label: 'Ghost' },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Delete ───────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/floors/:id', () => {
  it('blocks delete when floor has units', async () => {
    // Add a unit to floorId first
    await app.inject({
      method: 'POST',
      url: '/api/v1/units',
      headers: await h(adminToken),
      payload: {
        projectId,
        buildingId,
        floorId,
        unitNumber: 'A-101-F',
        unitType: 'APARTMENT',
        area: 80,
        price: 500000,
        bedrooms: 2,
        bathrooms: 1,
      },
    })

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/floors/${floorId}`,
      headers: await h(adminToken),
    })
    expect(del.statusCode).toBe(409)
  })

  it('deletes empty floor', async () => {
    // Create fresh floor
    const fresh = await app.inject({
      method: 'POST',
      url: '/api/v1/floors',
      headers: await h(adminToken),
      payload: { buildingId, floorNumber: 99, label: 'Temp' },
    })
    expect(fresh.statusCode).toBe(201)
    const tempId = fresh.json().id

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/floors/${tempId}`,
      headers: await h(adminToken),
    })
    expect(del.statusCode).toBe(200)
    expect(del.json().success).toBe(true)
  })

  it('org B cannot delete org A floor', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/floors/${floorId}`,
      headers: await h(orgBToken),
    })
    expect(res.statusCode).toBe(404)
  })
})
