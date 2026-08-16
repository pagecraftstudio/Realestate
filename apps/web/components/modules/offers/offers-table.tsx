'use client'
import { useState } from 'react'
import { Tag, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useOffers, useUpdateOfferStatus, type OffersFilter } from '@/lib/hooks/use-offers'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import type { OfferStatus } from '@/lib/types-20b'

const STATUS_STYLES: Record<OfferStatus, string> = {
  DRAFT:     'bg-zinc-100 text-zinc-500',
  SENT:      'bg-blue-100 text-blue-700',
  ACCEPTED:  'bg-emerald-100 text-emerald-700',
  REJECTED:  'bg-red-100 text-red-600',
  EXPIRED:   'bg-amber-100 text-amber-600',
  WITHDRAWN: 'bg-zinc-200 text-zinc-500',
}

const STATUS_ICONS: Record<OfferStatus, React.ReactNode> = {
  DRAFT: <Clock className="h-3 w-3"/>,
  SENT: <Clock className="h-3 w-3"/>,
  ACCEPTED: <CheckCircle className="h-3 w-3"/>,
  REJECTED: <XCircle className="h-3 w-3"/>,
  EXPIRED: <Clock className="h-3 w-3"/>,
  WITHDRAWN: <XCircle className="h-3 w-3"/>,
}

export function OffersTable() {
  const [filter, setFilter] = useState<OffersFilter>({ page: 1, limit: 20 })
  const { data, isLoading } = useOffers(filter)

  const STATUSES: OfferStatus[] = ['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','WITHDRAWN']

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
        <EmptyState icon={<Tag className="h-8 w-8"/>} title="No offers" description="Create an offer for a unit to get started." />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
              <tr>
                {['Client','Unit','Original Price','Offered Price','Discount','Status','Expires',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.data.map(offer => {
                const status = offer.status as OfferStatus
                const expired = offer.expiresAt && new Date(offer.expiresAt) < new Date()
                return (
                  <tr key={offer.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {offer.lead?.fullName ?? offer.customer?.fullName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      Unit {offer.unit.unitNumber}
                      <span className="text-zinc-400 text-xs ml-1">· {offer.unit.project.name}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {Number(offer.originalPrice).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {Number(offer.offeredPrice).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                      {Number(offer.discountPct) > 0 ? `-${Number(offer.discountPct).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                        {STATUS_ICONS[status]}{status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {offer.expiresAt ? (
                        <span className={expired ? 'text-red-500' : ''}>
                          {new Date(offer.expiresAt).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status === 'SENT' && (
                        <div className="flex gap-1 justify-end">
                          <AcceptRejectButtons offerId={offer.id} />
                        </div>
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

function AcceptRejectButtons({ offerId }: { offerId: string }) {
  const update = useUpdateOfferStatus(offerId)
  return (
    <>
      <button
        onClick={() => update.mutate('ACCEPTED')}
        disabled={update.isPending}
        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors disabled:opacity-50"
      >
        Accept
      </button>
      <button
        onClick={() => update.mutate('REJECTED')}
        disabled={update.isPending}
        className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors disabled:opacity-50"
      >
        Reject
      </button>
    </>
  )
}
