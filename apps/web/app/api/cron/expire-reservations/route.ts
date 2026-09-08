/**
 * Vercel Cron — expires overdue reservations.
 * Schedule: 0 0 * * * (daily midnight UTC) — configured in vercel.json
 */

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const secret = process.env['CRON_SECRET']
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const now = new Date()
    const expired = await prisma.reservation.updateMany({
      where: {
        status:    'ACTIVE',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    })

    // Free up units whose reservation just expired
    if (expired.count > 0) {
      const expiredReservations = await prisma.reservation.findMany({
        where:  { status: 'EXPIRED', expiresAt: { lt: now } },
        select: { unitId: true },
      })
      const unitIds = expiredReservations.map(r => r.unitId)
      if (unitIds.length > 0) {
        await prisma.unit.updateMany({
          where: { id: { in: unitIds }, status: 'ON_HOLD' },
          data:  { status: 'AVAILABLE' },
        })
      }
    }

    return NextResponse.json({ expired: expired.count, timestamp: now.toISOString() })
  } catch (err) {
    console.error('[cron] expire-reservations error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
