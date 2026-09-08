import { Metadata } from 'next'
import UnitDetailClient from './unit-detail-client'
export const metadata: Metadata = { title: 'Unit' }
export default function UnitDetailPage({ params }: { params: { id: string } }) {
  return <UnitDetailClient id={params.id} />
}
