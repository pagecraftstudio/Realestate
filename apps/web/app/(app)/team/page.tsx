import type { Metadata } from 'next'
import { TeamClient } from './team-client'

export const metadata: Metadata = { title: 'Team' }

export default function TeamPage() {
  return <TeamClient />
}
