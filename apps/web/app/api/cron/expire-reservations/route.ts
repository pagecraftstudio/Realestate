/**
 * Vercel Cron — expires overdue reservations every 5 minutes.
 * Add to apps/web/vercel.json:
 *   "crons": [{ "path": "/api/cron/expire-reservations", "schedule": "*/5 * * * *" }]
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/server/api-helpers'

export async function GET(req: NextRequest) {
  const secret = process.env['CRON_SECRET']
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdminClient()

  const { data: expired, error } = await admin
    .from('reservations')
    .select('id, unit_id')
    .eq('status', 'ACTIVE')
    .lt('expires_at', new Date().toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!expired || expired.length === 0) return NextResponse.json({ expired: 0, message: 'Nothing to expire' })

  // Expire reservations
  await admin.from('reservations').update({ status: 'EXPIRED' }).in('id', expired.map(r => r.id))

  // Free units
  const unitIds = expired.map(r => r.unit_id).filter(Boolean)
  if (unitIds.length) await admin.from('units').update({ status: 'AVAILABLE' }).in('id', unitIds).eq('status', 'RESERVED')

  return NextResponse.json({ expired: expired.length, ids: expired.map(r => r.id) })
}
