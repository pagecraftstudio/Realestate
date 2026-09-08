'use client'
import { useState } from 'react'
import { CreditCard, ExternalLink } from 'lucide-react'
import { usePayments, type PaymentsFilter } from '@/lib/hooks/use-payments'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'

const METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER']

function fmt(val: string | number) {
  return Number(val).toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function PaymentsTable() {
  const [filter, setFilter] = useState<PaymentsFilter>({ page: 1, limit: 20 })
  const { data, isLoading } = usePayments(filter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, method: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Methods</option>
          {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
        </select>
        <input
          type="date"
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, from: e.target.value || undefined, page: 1 }))}
          placeholder="From"
        />
        <input
          type="date"
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, to: e.target.value || undefined, page: 1 }))}
          placeholder="To"
        />
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<CreditCard className="h-8 w-8" />} title="No payments" description="Payments recorded against deals appear here." />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
              <tr>
                {['Deal', 'Customer', 'Amount', 'Method', 'Reference', 'Date', 'Receipt'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.data.map(p => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {p.deal?.dealNumber ?? p.dealId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {p.deal?.customer.fullName ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                    {fmt(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs">
                      {p.method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                    {p.referenceNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{fmtDate(p.paidAt)}</td>
                  <td className="px-4 py-3">
                    {p.receiptUrl ? (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
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
