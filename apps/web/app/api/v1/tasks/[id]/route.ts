import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, notFound, serverError, camelize} from '@/lib/server/api-helpers'
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const { id } = await params
  const { data, error } = await getAdminClient().from('tasks').select('*, assignee:users!tasks_assignee_id_fkey(id,user_profiles(first_name,last_name))').eq('id', id).eq('organization_id', user.organizationId).single()
  if (error || !data) return notFound()
  return NextResponse.json(camelize(data))
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const { id } = await params; const body = await req.json()
  const { data, error } = await getAdminClient().from('tasks').update(body).eq('id', id).eq('organization_id', user.organizationId).select('*').single()
  if (error || !data) return notFound()
  return NextResponse.json(camelize(data))
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const { id } = await params
  const { error } = await getAdminClient().from('tasks').delete().eq('id', id).eq('organization_id', user.organizationId)
  if (error) return serverError(error)
  return new NextResponse(null, { status: 204 })
}
