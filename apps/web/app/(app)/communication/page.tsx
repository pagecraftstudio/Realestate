import type { Metadata } from 'next'
import { CommunicationClient } from './communication-client'

export const metadata: Metadata = { title: 'Communication' }

export default function CommunicationPage() {
  return <CommunicationClient />
}
