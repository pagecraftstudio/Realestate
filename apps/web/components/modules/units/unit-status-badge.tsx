import { cn } from '@/lib/utils'
import type { UnitStatus } from '@/lib/types-20b'

const STYLES: Record<UnitStatus, string> = {
  AVAILABLE:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  ON_HOLD:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  RESERVED:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CONTRACTED:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  SOLD:        'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
  RENTED:      'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  UNAVAILABLE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const LABELS: Record<UnitStatus, string> = {
  AVAILABLE: 'Available', ON_HOLD: 'On Hold', RESERVED: 'Reserved',
  CONTRACTED: 'Contracted', SOLD: 'Sold', RENTED: 'Rented', UNAVAILABLE: 'Unavailable',
}

export function UnitStatusBadge({ status, className }: { status: UnitStatus; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      STYLES[status] ?? 'bg-zinc-100 text-zinc-600',
      className,
    )}>
      {LABELS[status] ?? status}
    </span>
  )
}
