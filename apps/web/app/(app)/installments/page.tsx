import type { Metadata } from 'next'
import { InstallmentsClient } from './installments-client'

export const metadata: Metadata = { title: 'Installments' }

export default function InstallmentsPage() {
  return <InstallmentsClient />
}
