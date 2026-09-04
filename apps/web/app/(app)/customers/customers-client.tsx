'use client'
import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useCustomers } from '@/lib/hooks/use-customers'
import { CustomersTable } from '@/components/modules/customers/customers-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import type { CustomersFilter } from '@/lib/hooks/use-customers'

export function CustomersClient() {
  const [filter, setFilter] = useState<CustomersFilter>({ page: 1, limit: 20 })

  const { data, isLoading } = useCustomers(filter)
  const customers = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Customers</h1>
          {meta && <p className="text-sm text-muted-foreground mt-0.5">{meta.total} total</p>}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search customers…"
          value={filter.search ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value || undefined, page: 1 }))}
          className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers appear here once a lead is converted."
        />
      ) : (
        <CustomersTable customers={customers} />
      )}

      {meta && meta.pages > 1 && (
        <Pagination
          page={meta.page} pages={meta.pages} total={meta.total} limit={meta.limit}
          onChange={(p) => setFilter((f) => ({ ...f, page: p }))}
        />
      )}
    </div>
  )
}
