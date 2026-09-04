import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, notFound, serverError } from '@/lib/server/api-helpers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const { data, error } = await getAdminClient().from('projects')
    .select('*, buildings(*, units(*))')
    .eq('id', id).eq('organization_id', user.organizationId).single()
  if (error || !data) return notFound()
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const body = await req.json()
  const { data, error } = await getAdminClient().from('projects')
    .update(body).eq('id', id).eq('organization_id', user.organizationId).select('*').single()
  if (error || !data) return notFound()
  return NextResponse.json(data)
}
