import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, notFound, camelize, snakify} from '@/lib/server/api-helpers'
export async function GET() {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const { data, error } = await getAdminClient().from('organizations').select('id,name,slug,plan,status,settings').eq('id', user.organizationId).single()
  if (error || !data) return notFound()
  return NextResponse.json(camelize(data))
}
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const body = await req.json()
  const { data: current } = await getAdminClient().from('organizations').select('settings').eq('id', user.organizationId).single()
  const merged = { ...(current?.settings ?? {}), ...(body.settings ?? {}) }
  const { data, error } = await getAdminClient().from('organizations')
    .update({ ...(body.name ? { name: body.name } : {}), settings: merged })
    .eq('id', user.organizationId).select('id,name,slug,plan,status,settings').single()
  if (error) return serverError(error)
  return NextResponse.json(camelize(data))
}
