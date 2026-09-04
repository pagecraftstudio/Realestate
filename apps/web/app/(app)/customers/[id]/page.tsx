import type { Metadata } from 'next'
import { CustomerDetailClient } from './customer-detail-client'

export const metadata: Metadata = { title: 'Customer' }

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  return <CustomerDetailClient id={params.id} />
}
