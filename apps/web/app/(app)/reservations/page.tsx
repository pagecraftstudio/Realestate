import { Metadata } from 'next'
import ReservationsClient from './reservations-client'
export const metadata: Metadata = { title: 'Reservations' }
export default function ReservationsPage() { return <ReservationsClient /> }
