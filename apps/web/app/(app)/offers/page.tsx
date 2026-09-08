import { Metadata } from 'next'
import OffersClient from './offers-client'
export const metadata: Metadata = { title: 'Offers' }
export default function OffersPage() { return <OffersClient /> }
