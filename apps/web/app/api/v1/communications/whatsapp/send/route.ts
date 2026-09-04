import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminClient, unauthorized, serverError } from '@/lib/server/api-helpers'
export async function POST(req: NextRequest) {
  const user = await getAuthUser(); if (!user) return unauthorized()
  const body = await req.json()
  // Log the communication (actual WhatsApp sending handled by external provider)
  const { data, error } = await getAdminClient().from('communications')
    .insert({ lead_id: body.leadId ?? null, customer_id: body.customerId ?? null, channel: 'WHATSAPP', direction: 'OUTBOUND', content: body.message, organization_id: user.organizationId, sender_id: user.id, sent_at: new Date().toISOString() }).select('*').single()
  if (error) return serverError(error)
  return NextResponse.json(data, { status: 201 })
}
