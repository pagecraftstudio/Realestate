import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse, camelize, snakify } from '@/lib/server/api-helpers'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const admin = getAdminClient()
  const url = new URL(req.url)
  const { page, limit, from, to } = paginate(url)

  let query = admin.from('customers')
    .select('*, assigned_agent:users!customers_assigned_agent_id_fkey(id, user_profiles(first_name, last_name, avatar_url))', { count: 'exact' })
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false })
    .range(from, to)

  const p = url.searchParams
  if (p.get('search'))          query = query.ilike('full_name', `%${p.get('search')}%`)
  if (p.get('assignedAgentId')) query = query.eq('assigned_agent_id', p.get('assignedAgentId')!)

  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const admin = getAdminClient()
  const body = await req.json()

  const { data, error } = await admin.from('customers')
    .insert({ ...snakify<Record<string,unknown>>(body), organization_id: user.organizationId })
    .select('*').single()

  if (error) return serverError(error)
  return NextResponse.json(camelize(data), { status: 201 })
}
