'use client'
import { useState } from 'react'
import { Clock, AlertCircle, CheckCircle, Filter } from 'lucide-react'
import { useInstallments, useMarkInstallmentPaid, type InstallmentsFilter } from '@/lib/hooks/use-installments'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import type { InstallmentStatus } from '@/lib/types-20c'

const STATUS_STYLES: Record<InstallmentStatus, string> = {
  PENDING: 'bg-zinc-100 text-zinc-500',
  DUE: 'bg-amber-100 text-amber-700',
  OVERDUE: 'bg-red-100 text-red-600',
  PAID: 'bg-emerald-100 text-emerald-700',
  WAIVED: 'bg-zinc-200 text-zinc-500',
}

const STATUS_ICON: Record<InstallmentStatus, React.ReactNode> = {
  PENDING: <Clock className="h-3 w-3" />,
  DUE: <AlertCircle className="h-3 w-3" />,
  OVERDUE: <AlertCircle className="h-3 w-3" />,
  PAID: <CheckCircle className="h-3 w-3" />,
  WAIVED: <CheckCircle className="h-3 w-3" />,
}

const ROW_BG: Record<InstallmentStatus, string> = {
  PENDING: '',
  DUE: 'bg-amber-50/50 dark:bg-amber-900/10',
  OVERDUE: 'bg-red-50/60 dark:bg-red-900/10',
  PAID: 'opacity-55',
  WAIVED: 'opacity-45',
}

function fmt(val: string | number) {
  return Number(val).toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function MarkPaidButton({ id }: { id: string }) {
  const mark = useMarkInstallmentPaid(id)
  return (
    <button
      onClick={() => mark.mutate({})}
      disabled={mark.isPending}
      className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
    >
      {mark.isPending ? '…' : 'Mark Paid'}
    </button>
  )
}

export function InstallmentsTable() {
  const [filter, setFilter] = useState<InstallmentsFilter>({ page: 1, limit: 30 })
  const { data, isLoading } = useInstallments(filter)

  const STATUSES: InstallmentStatus[] = ['PENDING', 'DUE', 'OVERDUE', 'PAID', 'WAIVED']

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            onChange={e => setFilter(f => ({ ...f, overdueOnly: e.target.checked || undefined, page: 1 }))}
          />
          Overdue only
        </label>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<Filter className="h-8 w-8" />} title="No installments" description="Installment schedules appear here once payment plans are created." />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
              <tr>
                {['#', 'Deal', 'Due Date', 'Amount', 'Paid Amount', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.data.map(inst => {
                const status = inst.status as InstallmentStatus
                const isOverdue = status === 'OVERDUE'
                const daysOverdue = isOverdue
                  ? Math.floor((Date.now() - new Date(inst.dueDate).getTime()) / 86400000)
                  : 0

                return (
                  <tr key={inst.id} className={`${ROW_BG[status]} transition-colors`}>
                    <td className="px-4 py-3 text-zinc-500">{inst.installmentNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{inst.dealId.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        {fmtDate(inst.dueDate)}
                      </span>
                      {isOverdue && daysOverdue > 0 && (
                        <span className="ml-1.5 text-xs text-red-400">({daysOverdue}d overdue)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{fmt(inst.amount)}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {inst.paidAmount ? fmt(inst.paidAmount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
                        {STATUS_ICON[status]}
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status !== 'PAID' && status !== 'WAIVED' && (
                        <MarkPaidButton id={inst.id} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
    </div>
  )
}
