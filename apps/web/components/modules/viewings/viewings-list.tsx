'use client'
import { useState } from 'react'
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useViewings, useCancelViewing, type ViewingsFilter } from '@/lib/hooks/use-viewings'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Pagination } from '@/components/shared/pagination'
import type { ViewingStatus } from '@/lib/types-20b'

const STATUS_STYLES: Record<ViewingStatus, string> = {
  SCHEDULED:   'bg-blue-100 text-blue-700',
  CONFIRMED:   'bg-indigo-100 text-indigo-700',
  COMPLETED:   'bg-emerald-100 text-emerald-700',
  CANCELLED:   'bg-zinc-100 text-zinc-500',
  NO_SHOW:     'bg-red-100 text-red-600',
  RESCHEDULED: 'bg-amber-100 text-amber-700',
}

function ViewingStatusBadge({ status }: { status: ViewingStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-zinc-100 text-zinc-500'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

interface Props { defaultFilter?: ViewingsFilter }

export function ViewingsList({ defaultFilter = {} }: Props) {
  const [filter, setFilter] = useState<ViewingsFilter>({ page: 1, limit: 15, ...defaultFilter })
  const [cancelId, setCancelId] = useState<string | null>(null)
  const { data, isLoading } = useViewings(filter)
  const cancel = useCancelViewing(cancelId ?? '')

  const STATUSES: ViewingStatus[] = ['SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED']

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <input
          type="date"
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, from: e.target.value || undefined, page: 1 }))}
        />
        <input
          type="date"
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, to: e.target.value || undefined, page: 1 }))}
        />
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<Calendar className="h-8 w-8"/>} title="No viewings" description="Schedule a viewing to get started." />
      ) : (
        <div className="space-y-3">
          {data.data.map(viewing => {
            const dt = new Date(viewing.scheduledAt)
            const isUpcoming = dt > new Date() && viewing.status === 'SCHEDULED'
            return (
              <div key={viewing.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Date block */}
                <div className="shrink-0 w-14 text-center">
                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none">
                    {dt.getDate()}
                  </div>
                  <div className="text-xs text-zinc-400 uppercase">
                    {dt.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-0.5 justify-center">
                    <Clock className="h-3 w-3"/>
                    {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                      {viewing.lead?.fullName ?? viewing.customer?.fullName ?? 'Unknown'}
                    </span>
                    <ViewingStatusBadge status={viewing.status} />
                    {isUpcoming && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5">
                        Upcoming
                      </span>
                    )}
                  </div>
                  {viewing.unit && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Unit {viewing.unit.unitNumber} · {viewing.unit.project.name}
                    </p>
                  )}
                  {viewing.location && (
                    <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
                      <MapPin className="h-3 w-3"/>{viewing.location}
                    </div>
                  )}
                  {viewing.outcome && (
                    <p className="text-xs text-zinc-500 mt-1 italic">"{viewing.outcome}"</p>
                  )}
                </div>

                {/* Agent + actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <AgentAvatar agent={viewing.agent} size="sm" />
                  {viewing.status === 'SCHEDULED' && (
                    <button
                      onClick={() => setCancelId(viewing.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                      title="Cancel viewing"
                    >
                      <XCircle className="h-4 w-4"/>
                    </button>
                  )}
                  {viewing.status === 'COMPLETED' && (
                    <CheckCircle className="h-4 w-4 text-emerald-500"/>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data && (
        <Pagination
          page={filter.page ?? 1}
          pages={data.meta.pages}
          total={data.meta.total}
          onChange={p => setFilter(f => ({ ...f, page: p }))}
        />
      )}

      <ConfirmDialog
        open={!!cancelId}
        title="Cancel Viewing?"
        description="This will mark the viewing as cancelled. The lead will not be notified automatically."
        confirmLabel="Cancel Viewing"
        variant="destructive"
        loading={cancel.isPending}
        onConfirm={async () => {
          if (cancelId) { await cancel.mutateAsync(); setCancelId(null) }
        }}
        onCancel={() => setCancelId(null)}
      />
    </div>
  )
}
