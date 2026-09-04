import { NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'
export async function GET() {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const admin = getAdminClient(); const org = user.organizationId
  const [total, qualified, viewingScheduled, viewingCompleted, offers, reservations, deals] = await Promise.all([
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org),
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'QUALIFIED'),
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'VIEWING_SCHEDULED'),
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'VIEWING_COMPLETED'),
    admin.from('offers').select('id', { count: 'exact', head: true }).eq('organization_id', org),
    admin.from('reservations').select('id', { count: 'exact', head: true }).eq('organization_id', org),
    admin.from('deals').select('id', { count: 'exact', head: true }).eq('organization_id', org).in('status', ['COMPLETED', 'CONTRACTED']),
  ])
  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0
  const t = total.count ?? 0, q = qualified.count ?? 0, vs = viewingScheduled.count ?? 0
  const vc = viewingCompleted.count ?? 0, o = offers.count ?? 0, r = reservations.count ?? 0, d = deals.count ?? 0
  return NextResponse.json({
    funnel: [
      { stage: 'Leads', count: t, conversionFromPrev: null },
      { stage: 'Qualified', count: q, conversionFromPrev: pct(q, t) },
      { stage: 'Viewing Scheduled', count: vs, conversionFromPrev: pct(vs, q) },
      { stage: 'Viewing Completed', count: vc, conversionFromPrev: pct(vc, vs) },
      { stage: 'Offer Made', count: o, conversionFromPrev: pct(o, vc) },
      { stage: 'Reserved', count: r, conversionFromPrev: pct(r, o) },
      { stage: 'Closed Deal', count: d, conversionFromPrev: pct(d, r) },
    ],
    offerCount: o, reservationCount: r, closedDealCount: d,
    kpis: { leadToQualified: pct(q,t), qualifiedToViewing: pct(vs,q), viewingToOffer: pct(o,vc), offerToReservation: pct(r,o), reservationToClose: pct(d,r) },
  })
}
