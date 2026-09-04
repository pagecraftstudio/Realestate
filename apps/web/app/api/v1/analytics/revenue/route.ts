import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'
export async function GET(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const admin = getAdminClient(); const url = new URL(req.url)
  const from = url.searchParams.get('from') ?? new Date(Date.now() - 90 * 86400000).toISOString()
  const to   = url.searchParams.get('to')   ?? new Date().toISOString()
  const { data, error } = await admin.from('deals').select('created_at,net_sale_value').eq('organization_id', user.organizationId).in('status', ['COMPLETED', 'CONTRACTED']).gte('created_at', from).lte('created_at', to)
  if (error) return serverError(error)
  const byMonth: Record<string, number> = {}
  for (const d of data ?? []) {
    const month = d.created_at.slice(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + (d.net_sale_value ?? 0)
  }
  const series = Object.entries(byMonth).sort().map(([period, revenue]) => ({ period, revenue }))
  return NextResponse.json({ granularity: 'month', series })
}
