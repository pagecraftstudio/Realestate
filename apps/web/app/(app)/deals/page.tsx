import type { Metadata } from 'next'
import { DealsClient } from './deals-client'

export const metadata: Metadata = { title: 'Deals' }

export default function DealsPage() {
  return <DealsClient />
}
