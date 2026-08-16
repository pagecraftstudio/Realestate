'use client'
import { useState } from 'react'
import { Shield, Clock, AlertTriangle } from 'lucide-react'
import { useReservations, useCancelReservation, type ReservationsFilter } from '@/lib/hooks/use-reservations'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Pagination } from '@/components/shared/pagination'
import type { ReservationStatus } from '@/lib/types-20b'

const STATUS_STYLES: Record<ReservationStatus, string> = {
  ACTIVE:    'bg-teal-100 text-teal-700',
  EXPIRED:   'bg-amber-100 text-amber-600',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
  CONVERTED: 'bg-emerald-100 text-emerald-700',
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-zinc-400 text-xs">No expiry</span>
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.floor(diff / 86400000)
  if (diff < 0) return <span className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>Expired</span>
  if (days <= 3) return <span className="text-amber-600 text-xs flex items-center gap-1"><Clock className="h-3 w-3"/>{days}d left</span>
  return <span className="text-zinc-500 text-xs">{days} days left</span>
}

export function ReservationsList() {
  const [filter, setFilter] = useState<ReservationsFilter>({ page: 1, limit: 20 })
  const [cancelId, setCancelId] = useState<string | null>(null)
  const { data, isLoading } = useReservations(filter)
  const cancel = useCancelReservation(cancelId ?? '')

  const STATUSES: ReservationStatus[] = ['ACTIVE','EXPIRED','CANCELLED','CONVERTED']

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<Shield className="h-8 w-8"/>} title="No reservations" description="Reserve a unit to see it here." />
      ) : (
        <div className="space-y-3">
          {data.data.map(res => {
            const status = res.status as ReservationStatus
            return (
              <div key={res.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                      {res.customer.fullName}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
                      {status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Unit {res.unit.unitNumber} · {res.unit.project.name}
                    {res.unit.project.city ? ` · ${res.unit.project.city}` : ''}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <ExpiryCountdown expiresAt={res.expiresAt} />
                    {res.reservationAmount && (
                      <span className="text-xs text-zinc-500">
                        Deposit: AED {Number(res.reservationAmount).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      AED {Number(res.unit.price).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(res.reservationDate).toLocaleDateString()}
                    </p>
                  </div>
                  <AgentAvatar agent={res.agent} size="sm" />
                  {status === 'ACTIVE' && (
                    <button
                      onClick={() => setCancelId(res.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Cancel
                    </button>
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
        title="Cancel Reservation?"
        description="The unit will return to Available status. This action cannot be undone."
        confirmLabel="Cancel Reservation"
        variant="destructive"
        loading={cancel.isPending}
        onConfirm={async () => { if (cancelId) { await cancel.mutateAsync(undefined); setCancelId(null) } }}
        onCancel={() => setCancelId(null)}
      />
    </div>
  )
}
