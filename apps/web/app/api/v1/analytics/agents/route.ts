import { NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'
export async function GET() {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const admin = getAdminClient(); const org = user.organizationId
  const { data: agents } = await admin.from('users').select('id, user_profiles(first_name,last_name)').eq('organization_id', org).eq('role', 'SALES_AGENT').eq('status', 'ACTIVE')
  const result = await Promise.all((agents ?? []).map(async (agent) => {
    const [leads, viewings, offers, deals] = await Promise.all([
      admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('assigned_agent_id', agent.id),
      admin.from('viewings').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('agent_id', agent.id),
      admin.from('offers').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('agent_id', agent.id),
      admin.from('deals').select('id,net_sale_value', { count: 'exact' }).eq('organization_id', org).eq('agent_id', agent.id).in('status', ['COMPLETED', 'CONTRACTED']),
    ])
    const profile = (agent as any).user_profiles?.[0]
    const revenue = (deals.data ?? []).reduce((s, d) => s + (d.net_sale_value ?? 0), 0)
    return { agentId: agent.id, name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim(), leads: leads.count ?? 0, viewings: viewings.count ?? 0, offers: offers.count ?? 0, deals: deals.count ?? 0, revenue, commission: 0, conversionRate: leads.count ? Math.round(((deals.count ?? 0) / leads.count) * 100) : 0 }
  }))
  return NextResponse.json(result)
}
