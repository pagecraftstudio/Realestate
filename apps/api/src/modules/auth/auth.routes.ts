/**
 * Phase E — Auth routes (Supabase Auth)
 *
 * POST /auth/register    — create org + admin user
 * POST /auth/login       — sign in (API clients / mobile)
 * POST /auth/logout      — server-side sign out
 * GET  /auth/me          — current user info
 * POST /auth/change-password  — update password via Supabase Admin
 * POST /auth/reset-password   — send password reset email
 *
 * Web frontend uses Supabase JS SDK directly for login/logout/session.
 * These routes exist for API/mobile consumers and server-side flows.
 */

import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import {
  RegisterOrgSchema,
  LoginSchema,
  ChangePasswordSchema,
} from './auth.schema.js'
import { z } from 'zod'
import {
  registerOrg,
  login,
  logout,
  getMe,
  changePassword,
  requestPasswordReset,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from './auth.service.js'
import type { AuthUser } from '../../types/auth.js'

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── POST /auth/register ──────────────────────────────────────────────────
  fastify.post('/register', async (request, reply) => {
    try {
      const input = RegisterOrgSchema.parse(request.body)
      const result = await registerOrg(input)
      return reply.status(201).send(result)
    } catch (err) {
      if (err instanceof ConflictError) return reply.status(409).send({ error: err.message })
      // Use console.error so it always appears in Vercel function logs
      console.error('[register] error:', err)
      fastify.log.error({ err }, 'register error')
      const message = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error: 'Internal server error', detail: message })
    }
  })

  // ─── POST /auth/login ─────────────────────────────────────────────────────
  // Returns Supabase access_token + refresh_token for API/mobile clients.
  // Web clients should use @supabase/ssr or supabase-js directly.
  fastify.post('/login', async (request, reply) => {
    const input = LoginSchema.parse(request.body)
    try {
      const result = await login(input)
      return reply.status(200).send(result)
    } catch (err) {
      if (err instanceof UnauthorizedError) return reply.status(401).send({ error: err.message })
      throw err
    }
  })

  // ─── POST /auth/logout ────────────────────────────────────────────────────
  fastify.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = (request as typeof request & { authUser: AuthUser }).authUser
    await logout(actor.supabaseUid)
    return reply.status(204).send()
  })

  // ─── GET /auth/me ─────────────────────────────────────────────────────────
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = (request as typeof request & { authUser: AuthUser }).authUser
    try {
      return getMe(actor.userId)
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message })
      throw err
    }
  })

  // ─── POST /auth/change-password ───────────────────────────────────────────
  fastify.post('/change-password', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = (request as typeof request & { authUser: AuthUser }).authUser
    const input = ChangePasswordSchema.parse(request.body)
    try {
      await changePassword(actor.supabaseUid, input)
      return reply.status(200).send({ message: 'Password updated' })
    } catch (err) {
      if (err instanceof BadRequestError) return reply.status(400).send({ error: err.message })
      throw err
    }
  })

  // ─── POST /auth/reset-password ────────────────────────────────────────────
  fastify.post('/reset-password', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body)
    await requestPasswordReset(email)
    // Always 200 — no email enumeration
    return reply.status(200).send({ message: 'If the email exists, a reset link will be sent.' })
  })
}
