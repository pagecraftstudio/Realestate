import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError, paginate, paginatedResponse } from '@/lib/server/api-helpers'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const url = new URL(req.url)
  const { page, limit, from, to } = paginate(url)
  const p = url.searchParams

  let query = getAdminClient().from('units')
    .select('*, project:projects(id, name, city), building:buildings(id, name)', { count: 'exact' })
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (p.get('status'))    query = query.eq('status', p.get('status')!)
  if (p.get('unitType'))  query = query.eq('unit_type', p.get('unitType')!)
  if (p.get('projectId')) query = query.eq('project_id', p.get('projectId')!)
  if (p.get('buildingId')) query = query.eq('building_id', p.get('buildingId')!)
  if (p.get('search'))    query = query.ilike('unit_number', `%${p.get('search')}%`)
  if (p.get('priceMin'))  query = query.gte('price', p.get('priceMin')!)
  if (p.get('priceMax'))  query = query.lte('price', p.get('priceMax')!)

  const { data, count, error } = await query
  if (error) return serverError(error)
  return paginatedResponse(data ?? [], count ?? 0, page, limit)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const body = await req.json()
  const { data, error } = await getAdminClient().from('units')
    .insert({ ...body, organization_id: user.organizationId }).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(data, { status: 201 })
}
