import { NextRequest, NextResponse } from 'next/server'
import { snakify, getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse } from '@/lib/server/api-helpers'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const admin = getAdminClient()
  const url = new URL(req.url)
  const { page, limit, from, to } = paginate(url)

  let query = admin
    .from('leads')
    .select(`*, assigned_agent:users!leads_assigned_agent_id_fkey(id, user_profiles(first_name, last_name, avatar_url)), team:teams(id, name)`, { count: 'exact' })
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (user.role === 'SALES_AGENT') query = query.eq('assigned_agent_id', user.id)

  const p = url.searchParams
  if (p.get('search'))         query = query.ilike('full_name', `%${p.get('search')}%`)
  if (p.get('status'))         query = query.eq('status', p.get('status')!)
  if (p.get('source'))         query = query.eq('source', p.get('source')!)
  if (p.get('temperature'))    query = query.eq('temperature', p.get('temperature')!)
  if (p.get('assignedAgentId')) query = query.eq('assigned_agent_id', p.get('assignedAgentId')!)
  if (p.get('teamId'))         query = query.eq('team_id', p.get('teamId')!)
  if (p.get('isArchived'))     query = query.eq('is_archived', p.get('isArchived') === 'true')
  if (p.get('overdueFollowup')) query = query.lt('next_followup_at', new Date().toISOString()).eq('is_archived', false)

  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const admin = getAdminClient()
  const body = await req.json()

  const { data, error } = await admin
    .from('leads')
    .insert({ ...snakify<Record<string,unknown>>(body), organization_id: user.organizationId, created_by_id: user.id })
    .select('*')
    .single()

  if (error) return serverError(error)
  return NextResponse.json({ lead: data, duplicate: null }, { status: 201 })
}
