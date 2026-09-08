'use client'
import { useState } from 'react'
import { BadgeDollarSign, CheckCircle } from 'lucide-react'
import {
  useCommissions, useApproveCommission, useBulkApproveCommissions, useMarkCommissionPaid,
  type CommissionsFilter,
} from '@/lib/hooks/use-commissions'
import { EmptyState } from '@/components/shared/empty-state'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { Pagination } from '@/components/shared/pagination'
import type { CommissionStatus } from '@/lib/types-20c'

const STATUS_STYLES: Record<CommissionStatus, string> = {
  PENDING: 'bg-zinc-100 text-zinc-500',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-500',
}

function fmt(val: string | number) {
  return Number(val).toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ActionCell({ id, status }: { id: string; status: CommissionStatus }) {
  const approve = useApproveCommission(id)
  const markPaid = useMarkCommissionPaid(id)

  if (status === 'PENDING') {
    return (
      <button
        onClick={() => approve.mutate()}
        disabled={approve.isPending}
        className="rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 text-xs font-medium disabled:opacity-50"
      >
        Approve
      </button>
    )
  }
  if (status === 'APPROVED') {
    return (
      <button
        onClick={() => markPaid.mutate({})}
        disabled={markPaid.isPending}
        className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 text-xs font-medium disabled:opacity-50"
      >
        Mark Paid
      </button>
    )
  }
  return null
}

export function CommissionsTable() {
  const [filter, setFilter] = useState<CommissionsFilter>({ page: 1, limit: 20 })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { data, isLoading } = useCommissions(filter)
  const bulkApprove = useBulkApproveCommissions()

  const STATUSES: CommissionStatus[] = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED']
  const pendingIds = (data?.data ?? []).filter(c => c.status === 'PENDING').map(c => c.id)
  const allSelected = pendingIds.length > 0 && pendingIds.every(id => selected.has(id))

  function toggleAll() {
    setSelected(s => {
      const next = new Set(s)
      if (allSelected) pendingIds.forEach(id => next.delete(id))
      else pendingIds.forEach(id => next.add(id))
      return next
    })
  }

  function toggle(id: string) {
    setSelected(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function doBulkApprove() {
    await bulkApprove.mutateAsync(Array.from(selected))
    setSelected(new Set())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {selected.size > 0 && (
          <button
            onClick={doBulkApprove}
            disabled={bulkApprove.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve {selected.size} selected
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<BadgeDollarSign className="h-8 w-8" />} title="No commissions" description="Commission records appear here when deals are created." />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
              <tr>
                <th className="w-8 px-4 py-3">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                {['Deal', 'Customer', 'Agent', 'Agent Amt', 'Manager Amt', 'Total', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.data.map(c => {
                const status = c.status as CommissionStatus
                const isPending = status === 'PENDING'
                return (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      {isPending && (
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{c.deal.dealNumber}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{c.deal.customer.fullName}</td>
                    <td className="px-4 py-3">
                      <AgentAvatar agent={c.agent} size="sm" />
                    </td>
                    <td className="px-4 py-3 font-medium">{fmt(c.agentAmount)}</td>
                    <td className="px-4 py-3 text-zinc-600">{c.managerAmount ? fmt(c.managerAmount) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{fmt(c.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {c.paidAt ? fmtDate(c.paidAt) : c.approvedAt ? fmtDate(c.approvedAt) : fmtDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionCell id={c.id} status={status} />
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
