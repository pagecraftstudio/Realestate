import { NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const admin = getAdminClient()

  const [totalRes, overdueRes, byStatusRes, bySourceRes] = await Promise.all([
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', user.organizationId).eq('is_archived', false),
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', user.organizationId).lt('next_followup_at', new Date().toISOString()).eq('is_archived', false),
    admin.from('leads').select('status').eq('organization_id', user.organizationId).eq('is_archived', false),
    admin.from('leads').select('source').eq('organization_id', user.organizationId).eq('is_archived', false),
  ])

  if (totalRes.error) return serverError(totalRes.error)

  const byStatus: Record<string, number> = {}
  for (const row of byStatusRes.data ?? []) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1

  const bySource: Record<string, number> = {}
  for (const row of bySourceRes.data ?? []) if (row.source) bySource[row.source] = (bySource[row.source] ?? 0) + 1

  return NextResponse.json({ total: totalRes.count ?? 0, overdue: overdueRes.count ?? 0, byStatus, bySource })
}
