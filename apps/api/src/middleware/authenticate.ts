import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifySupabaseToken } from '../lib/supabase.js'
import { prisma } from '../lib/prisma.js'
import type { AuthUser } from '../types/auth.js'
import type { UserRole } from '@prisma/client'
import { nanoid } from 'nanoid'

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
    console.log('[authenticate] token prefix:', accessToken.slice(0, 20), 'len:', accessToken.length)

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
      // ── Auto-recovery: public.users row missing (DB trigger failed during registration)
      // Reconstruct from Supabase user metadata and create the missing row.
      const meta = (supabaseUser.user_metadata ?? {}) as Record<string, unknown>
      const orgId = meta['organization_id'] as string | undefined

      if (orgId && supabaseUser.email) {
        try {
          const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } })
          if (org) {
            const userId = nanoid()
            const created = await prisma.user.create({
              data: {
                id:             userId,
                authUserId:     supabaseUser.id,
                organizationId: orgId,
                email:          supabaseUser.email,
                role:           (meta['role'] as UserRole) ?? 'COMPANY_ADMIN',
                status:         'ACTIVE',
                emailVerified:  true,
              },
              select: { id: true, organizationId: true, role: true },
            })
            // Create profile if we have name data
            const firstName = meta['first_name'] as string | undefined
            const lastName  = meta['last_name']  as string | undefined
            if (firstName) {
              await prisma.userProfile.create({
                data: { id: nanoid(), userId, firstName, lastName: lastName ?? '' },
              }).catch(() => {/* non-critical */})
            }
            console.log('[authenticate] auto-recovered missing user row for', supabaseUser.email)
            request.authUser = {
              id: created.id, userId: created.id,
              organizationId: created.organizationId,
              role: created.role as UserRole,
              supabaseUid: supabaseUser.id,
            }
            return
          }
        } catch (recoverErr) {
          console.error('[authenticate] auto-recovery failed:', recoverErr)
        }
      }
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
