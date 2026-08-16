/**
 * Phase H — Fastify authenticate middleware (Supabase Auth)
 *
 * Flow:
 *   1. Extract Bearer token from Authorization header
 *   2. Verify with Supabase Admin (supabaseAdmin.auth.getUser)
 *   3. Look up app user by auth_user_id
 *   4. Build AuthUser with both `id` and `userId` (same value) for compatibility
 *   5. Set request.authUser
 *
 * request.authUser is also aliased to request.user for modules that
 * were scaffolded using the old req.user pattern (phases 13–15).
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifySupabaseToken } from '../lib/supabase.js'
import { prisma } from '../lib/prisma.js'
import type { AuthUser } from '../types/auth.js'
import type { UserRole } from '@prisma/client'

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser
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

    // Look up app user
    const appUser = await prisma.user.findFirst({
      where: {
        authUserId:     supabaseUser.id,
        status:         'ACTIVE',
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

    // Fire-and-forget lastSeenAt — non-critical but log failures for visibility
    prisma.user.update({
      where: { id: appUser.id },
      data:  { lastSeenAt: new Date() },
    }).catch((err: unknown) => {
      // Use console.warn — fastify instance not in scope here
      console.warn('[authenticate] Failed to update lastSeenAt:', (err as Error)?.message)
    })

  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}
