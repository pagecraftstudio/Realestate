import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, forbidden, hasRole, camelize, snakify} from '@/lib/server/api-helpers'
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  if (!hasRole(user, 'SALES_MANAGER')) return forbidden()
  const { id } = await params
  const { data, error } = await getAdminClient().from('commissions').update({ status: 'APPROVED', approved_at: new Date().toISOString(), approved_by_id: user.id }).eq('id', id).eq('organization_id', user.organizationId).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(camelize(data))
}
