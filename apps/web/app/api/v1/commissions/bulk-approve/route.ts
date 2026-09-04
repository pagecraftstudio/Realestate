import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, forbidden, hasRole } from '@/lib/server/api-helpers'
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  if (!hasRole(user, 'SALES_MANAGER')) return forbidden()
  const { ids } = await req.json()
  const { data, error } = await getAdminClient().from('commissions').update({ status: 'APPROVED', approved_at: new Date().toISOString(), approved_by_id: user.id }).in('id', ids).eq('organization_id', user.organizationId).select('*')
  if (error) return serverError(error)
  return NextResponse.json(data)
}
