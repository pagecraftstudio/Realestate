/**
 * Vercel Cron Job — expires overdue reservations.
 * Schedule: every 5 minutes (see vercel.json crons section).
 * Secured with CRON_SECRET.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    const expired = await prisma.reservation.findMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      select: { id: true, unitId: true },
    })

    if (expired.length === 0) {
      return res.json({ expired: 0, message: 'Nothing to expire' })
    }

    await prisma.$transaction(
      expired.flatMap((r: { id: string; unitId: string }) => [
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

    console.info(`[cron] expired ${expired.length} reservations`)
    return res.json({ expired: expired.length, ids: expired.map((r: { id: string }) => r.id) })
  } catch (err) {
    console.error('[cron/expire-reservations]', err)
    return res.status(500).json({ error: 'Internal error' })
  } finally {
    await prisma.$disconnect()
  }
}
