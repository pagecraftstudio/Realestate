import type { Metadata } from 'next'
import { CommissionsClient } from './commissions-client'

export const metadata: Metadata = { title: 'Commissions' }

export default function CommissionsPage() {
  return <CommissionsClient />
}
