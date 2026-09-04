import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse, camelize } from '@/lib/server/api-helpers'
export async function GET(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const url = new URL(req.url); const { page, limit, from, to } = paginate(url)
  const { data, count, error } = await getAdminClient().from('teams')
    .select('*, manager:users!teams_manager_id_fkey(id,user_profiles(first_name,last_name))', { count: 'exact' })
    .eq('organization_id', user.organizationId).order('created_at', { ascending: false }).range(from, to)
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('teams')
    .insert({ ...body, organization_id: user.organizationId }).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(camelize(data), { status: 201 })
}
