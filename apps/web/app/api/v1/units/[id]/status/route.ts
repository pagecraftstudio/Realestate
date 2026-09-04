import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const { status } = await req.json()
  const { data, error } = await getAdminClient().from('units')
    .update({ status }).eq('id', id).eq('organization_id', user.organizationId)
    .select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(data)
}
