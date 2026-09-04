import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse } from '@/lib/server/api-helpers'
export async function GET(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const url = new URL(req.url); const { page, limit, from, to } = paginate(url); const p = url.searchParams
  let query = getAdminClient().from('installments').select('*, deal:deals(id,title)', { count: 'exact' })
    .eq('organization_id', user.organizationId).order('due_date', { ascending: true }).range(from, to)
  if (p.get('dealId'))     query = query.eq('deal_id', p.get('dealId')!)
  if (p.get('status'))     query = query.eq('status', p.get('status')!)
  if (p.get('overdueOnly') === 'true') query = query.lt('due_date', new Date().toISOString()).neq('status', 'PAID')
  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}
