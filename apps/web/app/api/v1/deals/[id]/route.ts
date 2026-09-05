import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, notFound, serverError, camelize, snakify} from '@/lib/server/api-helpers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const { data, error } = await getAdminClient().from('deals')
    .select('*, customer:customers(id, full_name, email, phone), agent:users!deals_agent_id_fkey(id, user_profiles(first_name, last_name)), unit:units(id, unit_number, price, project:projects(id, name)), payments(*), installments(*), commissions(*)')
    .eq('id', id).eq('organization_id', user.organizationId).single()
  if (error || !data) return notFound()
  return NextResponse.json(camelize(data))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params
  const body = await req.json()
  const { data, error } = await getAdminClient().from('deals')
    .update(snakify<Record<string,unknown>>(body)).eq('id', id).eq('organization_id', user.organizationId)
    .select('*').single()
  if (error || !data) return notFound()
  return NextResponse.json(camelize(data))
}
