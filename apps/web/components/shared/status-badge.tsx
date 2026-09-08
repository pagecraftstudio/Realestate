import { cn } from '@/lib/utils'

const LEAD_STATUS_STYLES: Record<string, string> = {
  NEW:               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CONTACTED:         'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  QUALIFIED:         'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  UNQUALIFIED:       'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  VIEWING_SCHEDULED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  VIEWING_COMPLETED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  NEGOTIATION:       'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  RESERVED:          'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  WON:               'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  LOST:              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const TEMPERATURE_STYLES: Record<string, string> = {
  HOT:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  WARM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  COLD: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
}

const TEMPERATURE_EMOJI: Record<string, string> = {
  HOT: '🔥', WARM: '☀️', COLD: '❄️',
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified',
  UNQUALIFIED: 'Unqualified', VIEWING_SCHEDULED: 'Viewing Scheduled',
  VIEWING_COMPLETED: 'Viewing Done', NEGOTIATION: 'Negotiation',
  RESERVED: 'Reserved', WON: 'Won', LOST: 'Lost',
}

interface Props {
  value: string
  variant?: 'status' | 'temperature'
  className?: string
}

export function StatusBadge({ value, variant = 'status', className }: Props) {
  const styles =
    variant === 'temperature' ? TEMPERATURE_STYLES[value] : LEAD_STATUS_STYLES[value]
  const label =
    variant === 'temperature'
      ? `${TEMPERATURE_EMOJI[value] ?? ''} ${value}`
      : (STATUS_LABEL[value] ?? value)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        styles ?? 'bg-zinc-100 text-zinc-600',
        className,
      )}
    >
      {label}
    </span>
  )
}
