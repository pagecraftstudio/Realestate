'use client'
import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { useLeads, useLeadStats, type LeadsFilter } from '@/lib/hooks/use-leads'
import { LeadsFilters } from '@/components/modules/leads/leads-filters'
import { LeadsTable } from '@/components/modules/leads/leads-table'
import { LeadFormDialog } from '@/components/modules/leads/lead-form-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'

export function LeadsClient() {
  const [filter, setFilter] = useState<LeadsFilter>({ page: 1, limit: 20, isArchived: false })
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useLeads(filter)
  const { data: stats } = useLeadStats()

  const leads = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Leads</h1>
          {stats && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {stats.total} total · {stats.overdue} overdue follow-ups
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Lead
        </button>
      </div>

      {/* Stat chips */}
      {stats?.byStatus && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <button
              key={status}
              onClick={() =>
                setFilter((f) => ({
                  ...f,
                  status: f.status === status ? undefined : status,
                  page: 1,
                }))
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter.status === status
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                  : 'border-border bg-card hover:bg-muted text-muted-foreground'
              }`}
            >
              {status.replace(/_/g, ' ')} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <LeadsFilters filter={filter} onChange={setFilter} />

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads found"
          description="Create your first lead or adjust the filters."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              New Lead
            </button>
          }
        />
      ) : (
        <LeadsTable leads={leads} />
      )}

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <Pagination
          page={meta.page}
          pages={meta.pages}
          total={meta.total}
          limit={meta.limit}
          onChange={(p) => setFilter((f) => ({ ...f, page: p }))}
        />
      )}

      {/* Create dialog */}
      <LeadFormDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
