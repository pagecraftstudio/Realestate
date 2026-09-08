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

    const supabaseUser = await verifySupabaseToken(accessToken)
    if (!supabaseUser) {
      return reply.status(401).send({ error: 'Invalid or expired token' })
    }

    // Look up by authUserId first (fast, unique), fall back to email
    const appUser = await prisma.user.findFirst({
      where: {
        OR: [
          { authUserId: supabaseUser.id },
          { email: supabaseUser.email ?? '' },
        ],
        status: 'ACTIVE',
      },
      select: { id: true, organizationId: true, role: true },
    })

    if (!appUser) {
      return reply.status(401).send({ error: 'User account not found or inactive' })
    }

    request.authUser = {
      id:             appUser.id,
      userId:         appUser.id,
      organizationId: appUser.organizationId,
      role:           appUser.role as UserRole,
      supabaseUid:    supabaseUser.id,
    }

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
