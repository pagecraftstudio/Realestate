import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse } from '@/lib/server/api-helpers'
export async function GET(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const url = new URL(req.url); const { page, limit, from, to } = paginate(url); const p = url.searchParams
  let query = getAdminClient().from('offers').select('*, lead:leads(id,full_name), customer:customers(id,full_name), unit:units(id,unit_number), agent:users!offers_agent_id_fkey(id,user_profiles(first_name,last_name))', { count: 'exact' })
    .eq('organization_id', user.organizationId).order('created_at', { ascending: false }).range(from, to)
  if (p.get('status'))     query = query.eq('status', p.get('status')!)
  if (p.get('agentId'))    query = query.eq('agent_id', p.get('agentId')!)
  if (p.get('leadId'))     query = query.eq('lead_id', p.get('leadId')!)
  if (p.get('customerId')) query = query.eq('customer_id', p.get('customerId')!)
  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('offers')
    .insert({ ...body, organization_id: user.organizationId, agent_id: body.agentId ?? user.id }).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(data, { status: 201 })
}
