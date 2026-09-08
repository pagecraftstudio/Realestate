import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../../main.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let adminToken: string
let agentId: string
let teamId: string

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      orgName: 'Teams Test Org',
      orgSlug: `teams-test-${Date.now()}`,
      firstName: 'Admin',
      lastName: 'Test',
      email: `teams-admin-${Date.now()}@test.com`,
      password: 'Secret123',
    },
  })
  adminToken = res.json().accessToken

  // Invite an agent
  const agentRes = await app.inject({
    method: 'POST',
    url: '/api/v1/users/invite',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      email: `team-agent-${Date.now()}@test.com`,
      role: 'SALES_AGENT',
      firstName: 'Tom',
      lastName: 'Agent',
      temporaryPassword: 'Temp1234',
    },
  })
  agentId = agentRes.json().id
})

afterAll(async () => {
  await app.close()
})

describe('POST /api/v1/teams', () => {
  it('creates a team', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/teams',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Alpha Team', description: 'Primary sales team' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Alpha Team')
    teamId = body.id
  })

  it('rejects duplicate team name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/teams',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Alpha Team' },
    })
    expect(res.statusCode).toBe(409)
  })
})

describe('GET /api/v1/teams', () => {
  it('lists teams', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/teams',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('PATCH /api/v1/teams/:id', () => {
  it('updates team name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/teams/${teamId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Alpha Team Updated' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Alpha Team Updated')
  })
})

describe('POST /api/v1/teams/:id/members', () => {
  it('adds agent to team', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/teams/${teamId}/members`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { userId: agentId, isLead: false },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().user.id).toBe(agentId)
  })

  it('rejects duplicate member', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/teams/${teamId}/members`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { userId: agentId, isLead: false },
    })
    expect(res.statusCode).toBe(409)
  })
})

describe('POST /api/v1/teams/:id/lead/:userId', () => {
  it('sets team lead', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/teams/${teamId}/lead/${agentId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const member = res.json().members.find((m: { user: { id: string }; isLead: boolean }) => m.user.id === agentId)
    expect(member?.isLead).toBe(true)
  })
})

describe('DELETE /api/v1/teams/:id/members/:userId', () => {
  it('removes member from team', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/teams/${teamId}/members/${agentId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(204)
  })
})

describe('DELETE /api/v1/teams/:id', () => {
  it('deletes team', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/teams/${teamId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(204)
  })
})
