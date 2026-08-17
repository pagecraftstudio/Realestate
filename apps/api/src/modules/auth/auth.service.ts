import type { Prisma } from '@prisma/client'
/**
 * Phase E — Auth Service (Supabase Auth)
 *
 * Replaces custom bcrypt/JWT flow with Supabase Auth.
 * Prisma still used for app-level user/org data.
 * Supabase Admin client (service role) used for auth operations.
 *
 * Login flow:
 *   POST /api/v1/auth/login
 *     → supabase.auth.signInWithPassword
 *     → return { accessToken, user: { id, orgId, role } }
 *
 * Logout:
 *   POST /api/v1/auth/logout
 *     → supabase.auth.admin.signOut(userId)  [server-side]
 *
 * Register org:
 *   POST /api/v1/auth/register
 *     → create org in DB
 *     → create admin app user in DB
 *     → supabase.auth.admin.createUser (with org metadata)
 *     → link auth_user_id on app user
 *
 * Invite user:
 *   POST /api/v1/users/invite  (users module)
 *     → create app user in DB
 *     → supabase.auth.admin.inviteUserByEmail
 *
 * Password reset:
 *   POST /api/v1/auth/reset-password
 *     → supabase.auth.admin.generateLink (type: recovery)
 *     → send via email (Supabase handles by default)
 */

import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma.js'
import { supabaseAdmin, createAuthUser } from '../../lib/supabase.js'
import { createClient } from '@supabase/supabase-js'
import type {
  RegisterOrgInput,
  LoginInput,
  ChangePasswordInput,
} from './auth.schema.js'
import { UserRole, UserStatus, OrgStatus, Plan } from '../../lib/enums.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(msg: string) { super(msg); this.name = 'ConflictError' }
}

export class UnauthorizedError extends Error {
  readonly statusCode = 401
  constructor(msg: string) { super(msg); this.name = 'UnauthorizedError' }
}

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class BadRequestError extends Error {
  readonly statusCode = 400
  constructor(msg: string) { super(msg); this.name = 'BadRequestError' }
}

// ─── Register Organization (first admin) ─────────────────────────────────────

export async function registerOrg(input: RegisterOrgInput) {
  // 1. Check slug uniqueness
  const existing = await prisma.organization.findUnique({
    where: { slug: input.orgSlug },
    select: { id: true },
  })
  if (existing) throw new ConflictError('Organization slug already taken')

  // 2. Check email not already registered
  const emailExists = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase() },
    select: { id: true },
  })
  if (emailExists) throw new ConflictError('Email already registered')

  const orgId  = nanoid()
  const userId = nanoid()

  // 3. Create Supabase Auth user first (so auth_user_id is available)
  const authUser = await createAuthUser({
    email:    input.email.toLowerCase(),
    password: input.password,
    metadata: {
      organization_id: orgId,
      role:            UserRole.COMPANY_ADMIN,
      first_name:      input.firstName,
      last_name:       input.lastName,
    },
  })

  // 4. Create org + app user in a transaction
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.organization.create({
      data: {
        id:     orgId,
        name:   input.orgName,
        slug:   input.orgSlug,
        plan:   Plan.FREE,
        status: OrgStatus.TRIAL,
      },
    })

    await tx.user.create({
      data: {
        id:             userId,
        organizationId: orgId,
        email:          input.email.toLowerCase(),
        passwordHash:   '',          // Supabase Auth manages passwords — placeholder
        role:           UserRole.COMPANY_ADMIN,
        status:         UserStatus.ACTIVE,
        emailVerified:  true,
      },
    })

    await tx.userProfile.create({
      data: {
        id:        nanoid(),
        userId:    userId,
        firstName: input.firstName,
        lastName:  input.lastName,
        phone:     input.phone ?? null,
      },
    })
  })

  // 5. Sign in to get initial session
  const { data: session, error: signInErr } = await supabaseAdmin.auth.admin.generateLink({
    type:  'magiclink',
    email: input.email.toLowerCase(),
  })

  // Return org info — client will do a login after registration
  return {
    organizationId: orgId,
    email:          input.email.toLowerCase(),
    message:        'Organization registered. Please log in.',
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
// NOTE: Supabase Auth signInWithPassword must be called from the browser
// using the anon key. Fastify cannot sign in on behalf of the user.
//
// This endpoint exists for API clients (e.g. mobile) that cannot use the
// browser SDK. For web, Next.js frontend calls Supabase Auth directly.

export async function login(input: LoginInput) {
  // Create a user-context Supabase client using anon key
  const supabaseUrl  = process.env['SUPABASE_URL']!
  const supabaseAnon = process.env['SUPABASE_ANON_KEY']!

  const client = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await client.auth.signInWithPassword({
    email:    input.email.toLowerCase(),
    password: input.password,
  })

  if (error || !data.session) {
    throw new UnauthorizedError('Invalid email or password')
  }

  // Fetch app user details
  const appUser = await prisma.user.findFirst({
    where: {
      email:  data.user.email?.toLowerCase() ?? '',
      status: UserStatus.ACTIVE,
    },
    select: {
      id:             true,
      organizationId: true,
      role:           true,
      profile: {
        select: { firstName: true, lastName: true, avatarUrl: true },
      },
    },
  })

  if (!appUser) {
    throw new UnauthorizedError('User account inactive or not found')
  }

  // Update last login
  await prisma.user.update({
    where: { id: appUser.id },
    data:  { lastLoginAt: new Date() },
  })

  return {
    accessToken:  data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt:    data.session.expires_at,
    user: {
      id:             appUser.id,
      organizationId: appUser.organizationId,
      role:           appUser.role,
      firstName:      appUser.profile?.firstName ?? '',
      lastName:       appUser.profile?.lastName  ?? '',
      avatarUrl:      appUser.profile?.avatarUrl ?? null,
    },
  }
}

// ─── Logout (server-side) ─────────────────────────────────────────────────────

export async function logout(supabaseUid: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.signOut(supabaseUid)
  if (error) {
    // Log but don't fail — token may already be expired
    console.warn('[auth] signOut warning:', error.message)
  }
}

// ─── Get current user ─────────────────────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.ACTIVE },
    select: {
      id:             true,
      email:          true,
      role:           true,
      organizationId: true,
      emailVerified:  true,
      lastLoginAt:    true,
      profile: {
        select: {
          firstName: true,
          lastName:  true,
          phone:     true,
          avatarUrl: true,
        },
      },
      organization: {
        select: { id: true, name: true, slug: true, plan: true },
      },
    },
  })

  if (!user) throw new NotFoundError('User not found')
  return user
}

// ─── Change password ──────────────────────────────────────────────────────────

export async function changePassword(
  supabaseUid: string,
  input: ChangePasswordInput,
): Promise<void> {
  // Supabase Admin API updates password directly
  const { error } = await supabaseAdmin.auth.admin.updateUserById(supabaseUid, {
    password: input.newPassword,
  })
  if (error) throw new BadRequestError(`Password update failed: ${error.message}`)
}

// ─── Password reset (send email) ──────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  // Use Supabase's built-in password reset email
  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type:  'recovery',
    email: email.toLowerCase(),
  })
  // Always return success to avoid email enumeration
  if (error) {
    console.warn('[auth] generateLink warning:', error.message)
  }
}
