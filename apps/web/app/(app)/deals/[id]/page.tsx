import type { Metadata } from 'next'
import { DealDetailClient } from './deal-detail-client'

export const metadata: Metadata = { title: 'Deal Detail' }

export default function DealDetailPage({ params }: { params: { id: string } }) {
  return <DealDetailClient dealId={params.id} />
}
