import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label:      string
  value:      string | number
  sub?:       string
  icon?:      LucideIcon
  trend?:     number        // positive = green, negative = red
  trendLabel?: string
  accent?:    'default' | 'green' | 'amber' | 'red' | 'indigo'
  loading?:   boolean
}

const ACCENTS = {
  default: 'bg-muted text-muted-foreground',
  green:   'bg-green-500/10 text-green-600 dark:text-green-400',
  amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  red:     'bg-red-500/10 text-red-600 dark:text-red-400',
  indigo:  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
}

export function StatCard({
  label, value, sub, icon: Icon, trend, trendLabel, accent = 'default', loading,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {Icon && (
          <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', ACCENTS[accent])}>
            <Icon size={14} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-28 bg-muted animate-pulse rounded" />
          <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-semibold text-foreground tracking-tight">
            {value}
          </p>
          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <span className={cn(
                'text-xs font-medium',
                trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
              )}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
            {(sub ?? trendLabel) && (
              <span className="text-xs text-muted-foreground">{sub ?? trendLabel}</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
