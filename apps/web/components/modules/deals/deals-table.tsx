'use client'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { useDeals, type DealsFilter } from '@/lib/hooks/use-deals'
import { useState } from 'react'

const STAGE_LABELS: Record<string, string> = {
  INITIAL_CONTACT: 'Initial Contact',
  NEEDS_ANALYSIS: 'Needs Analysis',
  SITE_VISIT: 'Site Visit',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CONTRACT_SIGNED: 'Contract Signed',
  PAYMENT_PLAN: 'Payment Plan',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

const STAGE_COLORS: Record<string, string> = {
  INITIAL_CONTACT: 'bg-zinc-100 text-zinc-600',
  NEEDS_ANALYSIS: 'bg-blue-50 text-blue-600',
  SITE_VISIT: 'bg-violet-50 text-violet-600',
  PROPOSAL: 'bg-amber-50 text-amber-600',
  NEGOTIATION: 'bg-orange-50 text-orange-600',
  CONTRACT_SIGNED: 'bg-emerald-50 text-emerald-700',
  PAYMENT_PLAN: 'bg-teal-50 text-teal-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-50 text-red-500',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
  ON_HOLD: 'bg-amber-100 text-amber-600',
}

const STAGES = Object.keys(STAGE_LABELS)

interface DealsTableProps {
  initialFilter?: DealsFilter
}

export function DealsTable({ initialFilter = {} }: DealsTableProps) {
  const [filter, setFilter] = useState<DealsFilter>({ page: 1, limit: 20, ...initialFilter })
  const { data, isLoading } = useDeals(filter)

  function fmt(val: string | number) {
    return Number(val).toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, pipelineStage: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Statuses</option>
          {['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search customer…"
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm w-48"
          onChange={e => setFilter(f => ({ ...f, search: e.target.value || undefined, page: 1 }))}
        />
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<TrendingUp className="h-8 w-8" />} title="No deals" description="Deals are created from customer reservations." />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
              <tr>
                {['Deal #', 'Customer', 'Unit', 'Value', 'Stage', 'Status', 'Agent', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.data.map(deal => (
                <tr key={deal.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {(deal as typeof deal & { dealNumber?: string }).dealNumber ?? deal.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {deal.customer.fullName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    Unit {deal.unit.unitNumber}
                    <span className="text-zinc-400 text-xs ml-1">· {deal.unit.project.name}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    {fmt(deal.dealValue)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[deal.pipelineStage] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {STAGE_LABELS[deal.pipelineStage] ?? deal.pipelineStage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[deal.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {deal.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {deal.agent && <AgentAvatar agent={deal.agent} size="sm" />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View →
                    </Link>
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
