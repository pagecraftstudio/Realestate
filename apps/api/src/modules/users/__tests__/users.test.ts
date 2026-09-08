import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../../main.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

// Shared state across tests
let adminToken: string
let agentId: string

const slug = `users-test-${Date.now()}`
const adminEmail = `admin-${Date.now()}@userstest.com`

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  // Register org + admin
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      orgName: 'Users Test Org',
      orgSlug: slug,
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: 'Secret123',
    },
  })
  adminToken = res.json().accessToken
})

afterAll(async () => {
  await app.close()
})

describe('GET /api/v1/users', () => {
  it('lists users in org', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.meta.total).toBeGreaterThanOrEqual(1)
  })

  it('rejects unauthenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /api/v1/users/invite', () => {
  it('invites a SALES_AGENT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/invite',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        email: `agent-${Date.now()}@test.com`,
        role: 'SALES_AGENT',
        firstName: 'Jane',
        lastName: 'Agent',
        temporaryPassword: 'Temp1234',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.role).toBe('SALES_AGENT')
    expect(body.status).toBe('INVITED')
    agentId = body.id
  })

  it('rejects duplicate email', async () => {
    const email = `dup-${Date.now()}@test.com`
    await app.inject({
      method: 'POST',
      url: '/api/v1/users/invite',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email, role: 'SALES_AGENT', firstName: 'A', lastName: 'B', temporaryPassword: 'Temp1234' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/invite',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email, role: 'SALES_AGENT', firstName: 'A', lastName: 'B', temporaryPassword: 'Temp1234' },
    })
    expect(res.statusCode).toBe(409)
  })
})

describe('GET /api/v1/users/:id', () => {
  it('returns user detail', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${agentId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe(agentId)
  })

  it('returns 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/nonexistent-id',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /api/v1/users/:id', () => {
  it('updates user role', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${agentId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'SALES_MANAGER' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().role).toBe('SALES_MANAGER')
  })
})

describe('POST /api/v1/users/:id/deactivate + reactivate', () => {
  it('deactivates a user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${agentId}/deactivate`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('INACTIVE')
  })

  it('reactivates a user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${agentId}/reactivate`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ACTIVE')
  })
})

describe('PATCH /api/v1/users/me', () => {
  it('updates own profile', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { title: 'Head of Sales', bio: 'Manages everything' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().profile.title).toBe('Head of Sales')
  })
})
