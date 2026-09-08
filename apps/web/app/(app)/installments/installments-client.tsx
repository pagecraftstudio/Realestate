'use client'
import { Clock } from 'lucide-react'
import { InstallmentsTable } from '@/components/modules/installments/installments-table'

export function InstallmentsClient() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
          <Clock className="h-6 w-6 text-indigo-500" />
          Installments
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Installment schedule across all deals — overdue highlighted in red</p>
      </div>
      <InstallmentsTable />
    </div>
  )
}
