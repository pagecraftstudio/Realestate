import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'
export async function GET() {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const { data, error } = await getAdminClient().from('lead_scoring_rules').select('id,signal,points').eq('organization_id', user.organizationId).eq('is_active', true)
  if (error) return serverError(error)
  return NextResponse.json(data ?? [])
}
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('lead_scoring_rules')
    .insert({ signal: body.signal, points: body.points, organization_id: user.organizationId, is_active: true }).select('id,signal,points').single()
  if (error) return serverError(error)
  return NextResponse.json(data, { status: 201 })
}
