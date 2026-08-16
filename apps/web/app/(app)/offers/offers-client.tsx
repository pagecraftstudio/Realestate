'use client'
import { Tag } from 'lucide-react'
import { OffersTable } from '@/components/modules/offers/offers-table'

export default function OffersClient() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Tag className="h-5 w-5 text-zinc-400"/>Offers
        </h1>
      </div>
      <OffersTable />
    </div>
  )
}
