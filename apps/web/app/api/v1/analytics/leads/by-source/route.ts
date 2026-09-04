import { NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'
export async function GET() {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const { data, error } = await getAdminClient().from('leads').select('source').eq('organization_id', user.organizationId).not('source', 'is', null)
  if (error) return serverError(error)
  const counts: Record<string, number> = {}
  for (const d of data ?? []) if (d.source) counts[d.source] = (counts[d.source] ?? 0) + 1
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  const result = Object.entries(counts).map(([source, count]) => ({ source, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
  return NextResponse.json(result)
}
