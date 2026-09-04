'use client'
import { Maximize2 } from 'lucide-react'
import { UnitsTable } from '@/components/modules/units/units-table'

export default function UnitsPageClient() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Maximize2 className="h-5 w-5 text-zinc-400"/>Units
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">All units across all projects</p>
        </div>
      </div>
      <UnitsTable />
    </div>
  )
}
