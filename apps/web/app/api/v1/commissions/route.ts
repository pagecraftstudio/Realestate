import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse } from '@/lib/server/api-helpers'
export async function GET(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const url = new URL(req.url); const { page, limit, from, to } = paginate(url); const p = url.searchParams
  let query = getAdminClient().from('commissions').select('*, agent:users!commissions_agent_id_fkey(id,user_profiles(first_name,last_name)), deal:deals(id,title)', { count: 'exact' })
    .eq('organization_id', user.organizationId).order('created_at', { ascending: false }).range(from, to)
  if (user.role === 'SALES_AGENT') query = query.eq('agent_id', user.id)
  if (p.get('status'))  query = query.eq('status', p.get('status')!)
  if (p.get('agentId')) query = query.eq('agent_id', p.get('agentId')!)
  if (p.get('dealId'))  query = query.eq('deal_id', p.get('dealId')!)
  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}
