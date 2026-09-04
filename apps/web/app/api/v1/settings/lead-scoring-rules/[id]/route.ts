import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, camelize } from '@/lib/server/api-helpers'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const { id } = await params; const body = await req.json()
  const { data, error } = await getAdminClient().from('lead_scoring_rules').update({ signal: body.signal, points: body.points }).eq('id', id).eq('organization_id', user.organizationId).select('id,signal,points').single()
  if (error) return serverError(error)
  return NextResponse.json(camelize(data))
}
