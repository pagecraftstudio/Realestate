'use client'
import { Shield } from 'lucide-react'
import { ReservationsList } from '@/components/modules/reservations/reservations-list'

export default function ReservationsClient() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Shield className="h-5 w-5 text-zinc-400"/>Reservations
        </h1>
      </div>
      <ReservationsList />
    </div>
  )
}
