'use client'
import { BadgeDollarSign } from 'lucide-react'
import { CommissionsTable } from '@/components/modules/commissions/commissions-table'

export function CommissionsClient() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
          <BadgeDollarSign className="h-6 w-6 text-indigo-500" />
          Commissions
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Agent and manager commissions — approve and mark as paid</p>
      </div>
      <CommissionsTable />
    </div>
  )
}
