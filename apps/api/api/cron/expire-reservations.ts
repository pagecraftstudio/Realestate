/**
 * Vercel Cron Job — expires overdue reservations.
 *
 * Schedule: every 5 minutes (see vercel.json crons section).
 * Secured with CRON_SECRET — Vercel sets Authorization: Bearer <secret>
 * automatically on cron invocations.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildApp } from '../src/main.js'
import type { FastifyInstance } from 'fastify'

let _app: FastifyInstance | null = null
async function getApp() {
  if (_app) return _app
  _app = await buildApp()
  await _app.ready()
  return _app
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  const secret = process.env['CRON_SECRET']
  if (secret) {
    const auth = req.headers['authorization']
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  try {
    const app = await getApp()

    // Find all ACTIVE reservations past their expiry
    const { prisma } = await import('../src/lib/prisma.js')
    const expired = await prisma.reservation.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      select: { id: true, unitId: true },
    })

    if (expired.length === 0) {
      return res.json({ expired: 0, message: 'Nothing to expire' })
    }

    // Expire reservations AND release units atomically in a single transaction.
    // Previously these were two separate $transaction calls — if the process
    // crashed between them, units would remain RESERVED forever.
    const results = await prisma.$transaction(
      expired.flatMap((r) => [
        prisma.reservation.update({
          where: { id: r.id },
          data:  { status: 'EXPIRED' },
        }),
        prisma.unit.updateMany({
          where: { id: r.unitId, status: 'RESERVED' },
          data:  { status: 'AVAILABLE' },
        }),
      ]),
    )

    // results has 2 entries per reservation (reservation update + unit update)
    const expiredCount = expired.length
    app.log.info({ count: expiredCount }, '[cron] expired reservations')
    return res.json({ expired: expiredCount, ids: expired.map((r) => r.id) })
  } catch (err) {
    console.error('[cron/expire-reservations]', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
