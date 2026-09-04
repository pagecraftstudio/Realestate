import { NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'
export async function GET() {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const { data, error } = await getAdminClient().from('deals').select('pipeline_stage,net_sale_value').eq('organization_id', user.organizationId).not('status', 'in', '("COMPLETED","LOST","CANCELLED")')
  if (error) return serverError(error)
  const stages: Record<string, { count: number; value: number }> = {}
  for (const d of data ?? []) {
    const s = d.pipeline_stage ?? 'Unknown'
    if (!stages[s]) stages[s] = { count: 0, value: 0 }
    stages[s].count++; stages[s].value += d.net_sale_value ?? 0
  }
  return NextResponse.json(Object.entries(stages).map(([stage, v]) => ({ stage, dealCount: v.count, totalValue: v.value })))
}
