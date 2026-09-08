'use client'
import { TrendingUp } from 'lucide-react'
import { DealsTable } from '@/components/modules/deals/deals-table'

export function DealsClient() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-500" />
            Deals
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track active deals, stages, and payment progress</p>
        </div>
      </div>
      <DealsTable />
    </div>
  )
}
