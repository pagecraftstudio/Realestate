import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, camelize, snakify } from '@/lib/server/api-helpers'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const admin = getAdminClient()
  const body = await req.json()

  const { data, error } = await admin
    .from('leads')
    .update({ assigned_agent_id: body.assignedAgentId ?? null, team_id: body.teamId ?? null })
    .eq('id', id).eq('organization_id', user.organizationId)
    .select('*').single()

  if (error) return serverError(error)
  return NextResponse.json(camelize(data))
}
