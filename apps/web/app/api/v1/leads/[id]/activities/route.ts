import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, camelize } from '@/lib/server/api-helpers'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const admin = getAdminClient()
  const body = await req.json()

  const { data, error } = await admin.from('lead_activities').insert({
    lead_id:         id,
    organization_id: user.organizationId,
    actor_id:        user.id,
    type:            body.type,
    payload:         body.payload ?? {},
  }).select('*').single()

  if (error) return serverError(error)
  return NextResponse.json(camelize(data), { status: 201 })
}
