import type { Metadata } from 'next'
import { LeadDetailClient } from './lead-detail-client'

export const metadata: Metadata = { title: 'Lead Detail' }

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return <LeadDetailClient id={params.id} />
}
