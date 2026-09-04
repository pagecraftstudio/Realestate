import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse } from '@/lib/server/api-helpers'
export async function GET(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const url = new URL(req.url); const { page, limit, from, to } = paginate(url); const p = url.searchParams
  let query = getAdminClient().from('reservations')
    .select('*, unit:units(id,unit_number,project:projects(id,name)), customer:customers(id,full_name), agent:users!reservations_agent_id_fkey(id,user_profiles(first_name,last_name))', { count: 'exact' })
    .eq('organization_id', user.organizationId).order('created_at', { ascending: false }).range(from, to)
  if (p.get('status'))  query = query.eq('status', p.get('status')!)
  if (p.get('agentId')) query = query.eq('agent_id', p.get('agentId')!)
  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('reservations')
    .insert({ ...body, organization_id: user.organizationId, agent_id: body.agentId ?? user.id, status: 'ACTIVE' }).select('*').single()
  if (error) return serverError(error)
  // Mark unit as reserved
  await getAdminClient().from('units').update({ status: 'RESERVED' }).eq('id', body.unitId)
  return NextResponse.json(data, { status: 201 })
}
