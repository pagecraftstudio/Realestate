import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, forbidden, hasRole, camelize} from '@/lib/server/api-helpers'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  if (!hasRole(user, 'COMPANY_ADMIN')) return forbidden()
  const { id } = await params; const body = await req.json()
  const { data, error } = await getAdminClient().from('users').update(body).eq('id', id).eq('organization_id', user.organizationId).select('*, user_profiles(first_name,last_name)').single()
  if (error) return serverError(error)
  return NextResponse.json(camelize(data))
}
