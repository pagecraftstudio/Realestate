'use client'
import { Search, X } from 'lucide-react'
import type { LeadsFilter } from '@/lib/hooks/use-leads'

const STATUSES = [
  'NEW','CONTACTED','QUALIFIED','UNQUALIFIED',
  'VIEWING_SCHEDULED','VIEWING_COMPLETED','NEGOTIATION','RESERVED','WON','LOST',
]
const STATUS_LABELS: Record<string, string> = {
  NEW:'New', CONTACTED:'Contacted', QUALIFIED:'Qualified', UNQUALIFIED:'Unqualified',
  VIEWING_SCHEDULED:'Viewing Sched.', VIEWING_COMPLETED:'Viewing Done',
  NEGOTIATION:'Negotiation', RESERVED:'Reserved', WON:'Won', LOST:'Lost',
}
const SOURCES = [
  'WEBSITE','FACEBOOK','INSTAGRAM','WHATSAPP','GOOGLE_ADS',
  'PROPERTY_PORTAL','REFERRAL','PHONE','WALK_IN','MANUAL','IMPORT','OTHER',
]
const TEMPERATURES = ['HOT','WARM','COLD']

interface Props {
  filter: LeadsFilter
  onChange: (f: LeadsFilter) => void
}

export function LeadsFilters({ filter, onChange }: Props) {
  const set = (key: keyof LeadsFilter, val: string | undefined) =>
    onChange({ ...filter, [key]: val || undefined, page: 1 })

  const hasActive = !!(filter.status || filter.source || filter.temperature || filter.search)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search name, phone, email…"
          value={filter.search ?? ''}
          onChange={(e) => set('search', e.target.value)}
          className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Status */}
      <select
        value={filter.status ?? ''}
        onChange={(e) => set('status', e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      {/* Temperature */}
      <select
        value={filter.temperature ?? ''}
        onChange={(e) => set('temperature', e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All Temps</option>
        {TEMPERATURES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Source */}
      <select
        value={filter.source ?? ''}
        onChange={(e) => set('source', e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All Sources</option>
        {SOURCES.map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
        ))}
      </select>

      {/* Overdue toggle */}
      <button
        onClick={() => onChange({ ...filter, overdueFollowup: !filter.overdueFollowup, page: 1 })}
        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
          filter.overdueFollowup
            ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'border-border bg-background text-foreground hover:bg-muted'
        }`}
      >
        Overdue
      </button>

      {/* Clear */}
      {hasActive && (
        <button
          onClick={() => onChange({ page: 1, limit: filter.limit })}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  )
}
