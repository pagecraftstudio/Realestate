'use client'
import { CreditCard } from 'lucide-react'
import { PaymentsTable } from '@/components/modules/payments/payments-table'

export function PaymentsClient() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-indigo-500" />
          Payments
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">All payments recorded across deals</p>
      </div>
      <PaymentsTable />
    </div>
  )
}
