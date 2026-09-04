import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, camelize } from '@/lib/server/api-helpers'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('leads').update({ is_archived: true })
    .eq('id', id).eq('organization_id', user.organizationId)
    .select('*').single()

  if (error) return serverError(error)
  return NextResponse.json(camelize(data))
}
