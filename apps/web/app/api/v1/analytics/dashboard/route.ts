import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const admin = getAdminClient()
  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to   = url.searchParams.get('to')
  const org  = user.organizationId

  const dateFilter = (col: string) => {
    const f: Record<string, string> = {}
    if (from) f[`${col}.gte`] = from
    if (to)   f[`${col}.lte`] = to
    return f
  }

  const [
    leadsTotal, leadsNew, leadsQualified,
    viewingsScheduled, viewingsCompleted,
    activeReservations,
    closedDeals,
  ] = await Promise.all([
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org),
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'NEW'),
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'QUALIFIED'),
    admin.from('viewings').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'SCHEDULED'),
    admin.from('viewings').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'COMPLETED'),
    admin.from('reservations').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'ACTIVE'),
    admin.from('deals').select('id', { count: 'exact', head: true }).eq('organization_id', org).in('status', ['COMPLETED', 'CONTRACTED']),
  ])

  const { data: dealAgg } = await admin.from('deals').select('net_sale_value').eq('organization_id', org).in('status', ['COMPLETED', 'CONTRACTED'])
  const totalRevenue = (dealAgg ?? []).reduce((s, d) => s + (d.net_sale_value ?? 0), 0)

  return NextResponse.json({
    leads:        { total: leadsTotal.count ?? 0, new: leadsNew.count ?? 0, qualified: leadsQualified.count ?? 0 },
    viewings:     { scheduled: viewingsScheduled.count ?? 0, completed: viewingsCompleted.count ?? 0 },
    reservations: { active: activeReservations.count ?? 0 },
    deals:        { closed: closedDeals.count ?? 0, totalRevenue, totalPaymentsCollected: 0, avgDealValue: closedDeals.count ? totalRevenue / closedDeals.count! : 0, conversionRate: 0 },
    pipeline:     { value: 0, weightedValue: 0, dealCount: 0 },
    installments: { pendingCount: 0, pendingAmount: 0, overdueCount: 0, overdueAmount: 0 },
    commissions:  { liabilityTotal: 0 },
  })
}
