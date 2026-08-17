/**
 * authenticate middleware — Supabase Auth JWT verification.
 *
 * Flow:
 *   1. Extract Bearer token from Authorization header
 *   2. Verify with Supabase Admin (supabaseAdmin.auth.getUser)
 *   3. Look up app user by email (schema has no authUserId column)
 *   4. Build AuthUser and set on request.authUser
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifySupabaseToken } from '../lib/supabase.js'
import { prisma } from '../lib/prisma.js'
import type { AuthUser } from '../types/auth.js'
import type { UserRole } from '@prisma/client'

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser
    // compat alias used by some older modules
    user?: AuthUser
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply:   FastifyReply,
): Promise<void> {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing authorization token' })
    }

    const accessToken = authHeader.slice(7)

    // Verify with Supabase — returns auth.users row
    const supabaseUser = await verifySupabaseToken(accessToken)
    if (!supabaseUser) {
      return reply.status(401).send({ error: 'Invalid or expired token' })
    }

    // Look up app user by email (organizationId+email is unique)
    const appUser = await prisma.user.findFirst({
      where: {
        email:  supabaseUser.email ?? '',
        status: 'ACTIVE',
      },
      select: {
        id:             true,
        organizationId: true,
        role:           true,
        status:         true,
      },
    })

    if (!appUser) {
      return reply.status(401).send({ error: 'User account not found or inactive' })
    }

    const authUser: AuthUser = {
      id:             appUser.id,
      userId:         appUser.id,   // alias — same value
      organizationId: appUser.organizationId,
      role:           appUser.role as UserRole,
      supabaseUid:    supabaseUser.id,
    }

    request.authUser = authUser
    // compat alias
    request.user = authUser

    // Fire-and-forget lastLoginAt update (field exists on User model)
    prisma.user.update({
      where: { id: appUser.id },
      data:  { lastLoginAt: new Date() },
    }).catch((err: unknown) => {
      console.warn('[authenticate] Failed to update lastLoginAt:', (err as Error)?.message)
    })

  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}
