/**
 * Auth integration tests.
 * Run against a real test DB: DATABASE_URL pointing to recrm_test.
 * Uses vitest + supertest-style via Fastify inject.
 *
 * Setup: pnpm exec vitest run src/modules/auth/__tests__/auth.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../../main.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

// ─── Register ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  const payload = {
    orgName: 'Test Realty',
    orgSlug: `test-realty-${Date.now()}`,
    firstName: 'Admin',
    lastName: 'User',
    email: `admin-${Date.now()}@testrealty.com`,
    password: 'Secret123',
  }

  it('creates org + admin user and returns accessToken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.accessToken).toBeDefined()
    expect(body.user.role).toBe('COMPANY_ADMIN')
    expect(body.organization.slug).toBe(payload.orgSlug)
    // Cookie set
    expect(res.headers['set-cookie']).toMatch(/refreshToken/)
  })

  it('rejects duplicate slug', async () => {
    // First call to create
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { ...payload, email: `other-${Date.now()}@x.com` },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { ...payload, email: `other2-${Date.now()}@x.com` },
    })
    expect(res.statusCode).toBe(409)
  })

  it('rejects weak password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { ...payload, password: 'weak', orgSlug: `slug-${Date.now()}` },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  const slug = `login-test-${Date.now()}`
  const email = `agent-${Date.now()}@x.com`
  const password = 'Secret123'

  beforeAll(async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        orgName: 'Login Org',
        orgSlug: slug,
        firstName: 'A',
        lastName: 'B',
        email,
        password,
      },
    })
  })

  it('returns accessToken on valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().accessToken).toBeDefined()
  })

  it('rejects wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'WrongPass1' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@x.com', password },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── Me ───────────────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  it('returns current user when authenticated', async () => {
    const email = `me-${Date.now()}@x.com`
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        orgName: 'Me Org',
        orgSlug: `me-org-${Date.now()}`,
        firstName: 'Me',
        lastName: 'User',
        email,
        password: 'Secret123',
      },
    })
    const { accessToken } = regRes.json()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().email).toBe(email)
  })

  it('rejects unauthenticated request', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── Refresh ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('issues new accessToken using cookie', async () => {
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        orgName: 'Refresh Org',
        orgSlug: `refresh-org-${Date.now()}`,
        firstName: 'R',
        lastName: 'U',
        email: `refresh-${Date.now()}@x.com`,
        password: 'Secret123',
      },
    })
    const cookie = regRes.headers['set-cookie'] as string
    const token = cookie.split(';')[0]?.split('=')?.[1]

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refreshToken: token ?? '' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().accessToken).toBeDefined()
  })
})

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('invalidates access token after logout', async () => {
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        orgName: 'Logout Org',
        orgSlug: `logout-org-${Date.now()}`,
        firstName: 'L',
        lastName: 'U',
        email: `logout-${Date.now()}@x.com`,
        password: 'Secret123',
      },
    })
    const { accessToken } = regRes.json()

    // Logout
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(logoutRes.statusCode).toBe(200)

    // Access token should now be blacklisted
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(meRes.statusCode).toBe(401)
  })
})
