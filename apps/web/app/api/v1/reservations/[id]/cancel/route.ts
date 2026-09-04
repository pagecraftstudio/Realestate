import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, camelize } from '@/lib/server/api-helpers'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const { id } = await params; const body = await req.json().catch(() => ({}))
  const admin = getAdminClient()
  const { data: res } = await admin.from('reservations').select('unit_id').eq('id', id).single()
  const { data, error } = await admin.from('reservations').update({ status: 'CANCELLED', cancellation_reason: body.reason ?? null }).eq('id', id).eq('organization_id', user.organizationId).select('*').single()
  if (error) return serverError(error)
  if (res?.unit_id) await admin.from('units').update({ status: 'AVAILABLE' }).eq('id', res.unit_id)
  return NextResponse.json(camelize(data))
}
