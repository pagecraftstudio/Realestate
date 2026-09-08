'use client'

import { cn } from '@/lib/utils'
import { last30Days, last90Days, thisYear } from '@/lib/hooks/use-analytics'

export type DateRange = ReturnType<typeof last30Days>

const PRESETS = [
  { label: '30d',  fn: last30Days },
  { label: '90d',  fn: last90Days },
  { label: 'YTD',  fn: thisYear  },
] as const

interface DateRangeTabsProps {
  value:    DateRange
  onChange: (v: DateRange) => void
}

export function DateRangeTabs({ value, onChange }: DateRangeTabsProps) {
  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
      {PRESETS.map((p) => {
        const range   = p.fn()
        const active  = value.from === range.from
        return (
          <button
            key={p.label}
            onClick={() => onChange(range)}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
