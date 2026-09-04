import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, forbidden, hasRole } from '@/lib/server/api-helpers'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  if (!hasRole(user, 'ACCOUNTANT')) return forbidden()
  const { id } = await params; const body = await req.json()
  const { data, error } = await getAdminClient().from('commissions').update({ status: 'PAID', paid_at: body.paidAt ?? new Date().toISOString(), notes: body.notes ?? null }).eq('id', id).eq('organization_id', user.organizationId).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(camelize(data))
}
