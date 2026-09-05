import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse, camelize, snakify } from '@/lib/server/api-helpers'
export async function GET(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const url = new URL(req.url); const { page, limit, from, to } = paginate(url); const p = url.searchParams
  let query = getAdminClient().from('tasks').select('*, assignee:users!tasks_assignee_id_fkey(id,user_profiles(first_name,last_name))', { count: 'exact' })
    .eq('organization_id', user.organizationId).order('created_at', { ascending: false }).range(from, to)
  if (p.get('assigneeId'))  query = query.eq('assignee_id', p.get('assigneeId')!)
  if (p.get('status'))      query = query.eq('status', p.get('status')!)
  if (p.get('priority'))    query = query.eq('priority', p.get('priority')!)
  if (p.get('relatedType')) query = query.eq('related_type', p.get('relatedType')!)
  if (p.get('relatedId'))   query = query.eq('related_id', p.get('relatedId')!)
  if (p.get('overdue'))     query = query.lt('due_at', new Date().toISOString()).neq('status', 'DONE')
  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('tasks')
    .insert((() => {
      const s = snakify<Record<string,unknown>>(body)
      // DB uses creator_id, not created_by_id
      if ('created_by_id' in s) { s['creator_id'] = s['created_by_id']; delete s['created_by_id'] }
      s['organization_id'] = user.organizationId
      s['creator_id'] = s['creator_id'] ?? user.id
      return s
    })()).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(camelize(data), { status: 201 })
}
