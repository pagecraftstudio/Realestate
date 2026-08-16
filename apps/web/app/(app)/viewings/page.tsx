import { Metadata } from 'next'
import ViewingsClient from './viewings-client'
export const metadata: Metadata = { title: 'Viewings' }
export default function ViewingsPage() { return <ViewingsClient /> }
