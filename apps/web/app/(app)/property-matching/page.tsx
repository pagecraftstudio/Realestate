import type { Metadata } from 'next'
import { PropertyMatchingClient } from './property-matching-client'

export const metadata: Metadata = { title: 'Property Matching' }

export default function PropertyMatchingPage() {
  return <PropertyMatchingClient />
}
