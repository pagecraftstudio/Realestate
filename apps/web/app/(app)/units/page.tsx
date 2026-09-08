import { Metadata } from 'next'
import UnitsPageClient from './units-client'
export const metadata: Metadata = { title: 'Units' }
export default function UnitsPage() { return <UnitsPageClient /> }
