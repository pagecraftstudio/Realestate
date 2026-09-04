import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse } from '@/lib/server/api-helpers'
export async function GET(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const url = new URL(req.url); const { page, limit, from, to } = paginate(url); const p = url.searchParams
  let query = getAdminClient().from('payments').select('*, deal:deals(id,title)', { count: 'exact' })
    .eq('organization_id', user.organizationId).order('created_at', { ascending: false }).range(from, to)
  if (p.get('dealId')) query = query.eq('deal_id', p.get('dealId')!)
  if (p.get('method')) query = query.eq('method', p.get('method')!)
  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('payments')
    .insert({ ...body, organization_id: user.organizationId, recorded_by_id: user.id }).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(data, { status: 201 })
}
