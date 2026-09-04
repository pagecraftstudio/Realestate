import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse, camelize } from '@/lib/server/api-helpers'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const url = new URL(req.url)
  const { page, limit, from, to } = paginate(url)
  const p = url.searchParams

  let query = getAdminClient().from('projects')
    .select('*, _count:units(count)', { count: 'exact' })
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false }).range(from, to)

  if (p.get('search'))       query = query.ilike('name', `%${p.get('search')}%`)
  if (p.get('status'))       query = query.eq('status', p.get('status')!)
  if (p.get('propertyType')) query = query.eq('property_type', p.get('propertyType')!)
  if (p.get('city'))         query = query.ilike('city', `%${p.get('city')}%`)

  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('projects')
    .insert({ ...body, id: randomUUID(), organization_id: user.organizationId }).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(camelize(data), { status: 201 })
}
