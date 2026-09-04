import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, notFound, serverError } from '@/lib/server/api-helpers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('leads')
    .select(`*, assigned_agent:users!leads_assigned_agent_id_fkey(id, user_profiles(first_name, last_name, avatar_url)), team:teams(id, name), activities:lead_activities(*)`)
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (error || !data) return notFound()
  return NextResponse.json(camelize(data))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const admin = getAdminClient()
  const body = await req.json()

  const { data, error } = await admin
    .from('leads')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .select('*')
    .single()

  if (error || !data) return notFound()
  return NextResponse.json(camelize(data))
}
