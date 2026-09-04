import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAdminClient, conflict, serverError, badRequest } from '@/lib/server/api-helpers'
import { z, ZodError } from 'zod'

const RegisterSchema = z.object({
  orgName:   z.string().min(2),
  orgSlug:   z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  password:  z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and a number'),
  phone:     z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = RegisterSchema.parse(body)
    const admin = getAdminClient()

    // Check slug uniqueness
    const { data: existingOrg } = await admin.from('organizations').select('id').eq('slug', input.orgSlug).single()
    if (existingOrg) return conflict('Organization slug already taken')

    // Check email uniqueness
    const { data: existingUser } = await admin.from('users').select('id').eq('email', input.email.toLowerCase()).single()
    if (existingUser) return conflict('Email already registered')

    // Create org
    const { data: org, error: orgErr } = await admin.from('organizations').insert({
      id:     randomUUID(),
      name:   input.orgName,
      slug:   input.orgSlug,
      plan:   'FREE',
      status: 'TRIAL',
    }).select('id').single()

    if (orgErr || !org) return serverError(orgErr)

    // Create Supabase Auth user
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email:         input.email.toLowerCase(),
      password:      input.password,
      email_confirm: true,
      user_metadata: {
        organization_id: org.id,
        role:            'COMPANY_ADMIN',
        first_name:      input.firstName,
        last_name:       input.lastName,
      },
    })

    if (authErr || !authData.user) {
      await admin.from('organizations').delete().eq('id', org.id)
      return serverError(authErr)
    }

    const authUserId = authData.user.id

    // Check if DB trigger created the user row
    await new Promise(r => setTimeout(r, 500)) // brief wait for trigger
    const { data: dbUser } = await admin.from('users').select('id').eq('auth_user_id', authUserId).single()

    if (!dbUser) {
      // Trigger didn't fire — create manually
      const { data: newUser, error: userErr } = await admin.from('users').insert({
        auth_user_id:    authUserId,
        organization_id: org.id,
        email:           input.email.toLowerCase(),
        role:            'COMPANY_ADMIN',
        status:          'ACTIVE',
        email_verified:  true,
      }).select('id').single()

      if (userErr || !newUser) return serverError(userErr)

      await admin.from('user_profiles').insert({
        user_id:    newUser.id,
        first_name: input.firstName,
        last_name:  input.lastName,
        phone:      input.phone ?? null,
      })
    } else {
      // Update trigger-created user
      await admin.from('users').update({ role: 'COMPANY_ADMIN', status: 'ACTIVE', email_verified: true }).eq('id', dbUser.id)
      await admin.from('user_profiles').upsert({
        user_id:    dbUser.id,
        first_name: input.firstName,
        last_name:  input.lastName,
        phone:      input.phone ?? null,
      }, { onConflict: 'user_id' })
    }

    return NextResponse.json({ organizationId: org.id, email: input.email.toLowerCase(), message: 'Organization registered. Please log in.' }, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation error', issues: err.issues.map(i => ({ field: i.path.join('.'), message: i.message })) }, { status: 400 })
    }
    return serverError(err)
  }
}
