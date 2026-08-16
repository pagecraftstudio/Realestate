'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BedDouble, Bath, Maximize2, Eye } from 'lucide-react'
import { useUnits, type UnitsFilter } from '@/lib/hooks/use-units'
import { UnitStatusBadge } from './unit-status-badge'
import { Pagination } from '@/components/shared/pagination'
import { EmptyState } from '@/components/shared/empty-state'
import type { UnitStatus, UnitType } from '@/lib/types-20b'

const UNIT_TYPES: UnitType[] = ['APARTMENT','VILLA','TOWNHOUSE','DUPLEX','PENTHOUSE','STUDIO','OFFICE','SHOP','WAREHOUSE','LAND_PLOT','OTHER']
const STATUSES: UnitStatus[] = ['AVAILABLE','ON_HOLD','RESERVED','CONTRACTED','SOLD','RENTED','UNAVAILABLE']

interface Props { projectId?: string }

export function UnitsTable({ projectId }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<UnitsFilter>({ page: 1, limit: 20, projectId })
  const { data, isLoading, isError } = useUnits(filter)

  function set(patch: Partial<UnitsFilter>) {
    setFilter(f => ({ ...f, ...patch, page: 1 }))
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search unit number…"
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm w-52"
          onChange={e => set({ search: e.target.value || undefined })}
        />
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => set({ status: e.target.value || undefined })}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => set({ unitType: e.target.value || undefined })}
        >
          <option value="">All Types</option>
          {UNIT_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
        </select>
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => set({ bedrooms: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Any Beds</option>
          {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n === 0 ? 'Studio' : `${n} BR`}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : isError ? (
        <div className="h-64 flex items-center justify-center text-red-400 text-sm">Failed to load units</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<Maximize2 className="h-8 w-8"/>} title="No units found" description="Adjust filters or add units to this project." />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
              <tr>
                {['Unit','Type','Floor','Beds','Baths','Area (m²)','Price (AED)','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.data.map(unit => (
                <tr
                  key={unit.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  onClick={() => router.push(`/units/${unit.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{unit.unitNumber}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{unit.unitType.replace('_',' ')}</td>
                  <td className="px-4 py-3 text-zinc-500">{unit.floor?.floorNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    {unit.bedrooms != null ? (
                      <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                        <BedDouble className="h-3.5 w-3.5"/>{unit.bedrooms}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {unit.bathrooms != null ? (
                      <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                        <Bath className="h-3.5 w-3.5"/>{unit.bathrooms}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {unit.area ? Number(unit.area).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {Number(unit.price).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <UnitStatusBadge status={unit.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Eye className="h-4 w-4 text-zinc-400"/>
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
