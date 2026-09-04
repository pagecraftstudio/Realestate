import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse, camelize } from '@/lib/server/api-helpers'
export async function GET(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const url = new URL(req.url); const { page, limit, from, to } = paginate(url); const p = url.searchParams
  let query = getAdminClient().from('communications').select('*, lead:leads(id,full_name), customer:customers(id,full_name), sender:users!communications_sender_id_fkey(id,user_profiles(first_name,last_name))', { count: 'exact' })
    .eq('organization_id', user.organizationId).order('sent_at', { ascending: false }).range(from, to)
  if (p.get('leadId'))     query = query.eq('lead_id', p.get('leadId')!)
  if (p.get('customerId')) query = query.eq('customer_id', p.get('customerId')!)
  if (p.get('channel'))    query = query.eq('channel', p.get('channel')!)
  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('communications')
    .insert({ ...body, organization_id: user.organizationId, sender_id: user.id, sent_at: body.sentAt ?? new Date().toISOString() }).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(camelize(data), { status: 201 })
}
