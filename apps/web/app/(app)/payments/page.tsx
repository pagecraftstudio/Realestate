import type { Metadata } from 'next'
import { PaymentsClient } from './payments-client'

export const metadata: Metadata = { title: 'Payments' }

export default function PaymentsPage() {
  return <PaymentsClient />
}
