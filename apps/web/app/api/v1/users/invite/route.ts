import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, forbidden, hasRole } from '@/lib/server/api-helpers'
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  if (!hasRole(user, 'COMPANY_ADMIN')) return forbidden()
  const body = await req.json()
  const admin = getAdminClient()
  // Create user row first
  const { data: newUser, error: userErr } = await admin.from('users')
    .insert({ email: body.email.toLowerCase(), role: body.role, status: 'INVITED', organization_id: user.organizationId, email_verified: false }).select('id').single()
  if (userErr || !newUser) return serverError(userErr)
  if (body.firstName || body.lastName) {
    await admin.from('user_profiles').insert({ user_id: newUser.id, first_name: body.firstName ?? null, last_name: body.lastName ?? null })
  }
  // Invite via Supabase Auth
  await admin.auth.admin.inviteUserByEmail(body.email.toLowerCase(), {
    data: { organization_id: user.organizationId, role: body.role },
  })
  const { data } = await admin.from('users').select('*, user_profiles(first_name,last_name,phone,avatar_url)').eq('id', newUser.id).single()
  return NextResponse.json(camelize(data), { status: 201 })
}
