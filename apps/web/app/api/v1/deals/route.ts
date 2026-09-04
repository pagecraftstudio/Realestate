import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse } from '@/lib/server/api-helpers'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const admin = getAdminClient()
  const url = new URL(req.url)
  const { page, limit, from, to } = paginate(url)

  let query = admin.from('deals')
    .select('*, customer:customers(id, full_name), agent:users!deals_agent_id_fkey(id, user_profiles(first_name, last_name)), unit:units(id, unit_number, project:projects(id, name))', { count: 'exact' })
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (user.role === 'SALES_AGENT') query = query.eq('agent_id', user.id)

  const p = url.searchParams
  if (p.get('status'))        query = query.eq('status', p.get('status')!)
  if (p.get('pipelineStage')) query = query.eq('pipeline_stage', p.get('pipelineStage')!)
  if (p.get('agentId'))       query = query.eq('agent_id', p.get('agentId')!)
  if (p.get('customerId'))    query = query.eq('customer_id', p.get('customerId')!)
  if (p.get('search'))        query = query.ilike('title', `%${p.get('search')}%`)

  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('deals')
    .insert({ ...body, organization_id: user.organizationId, agent_id: body.agentId ?? user.id })
    .select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(data, { status: 201 })
}
