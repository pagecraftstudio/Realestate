import { cn } from '@/lib/utils'

interface Props { score: number; className?: string }

export function ScoreBadge({ score, className }: Props) {
  const color =
    score >= 60 ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400' :
    score >= 30 ? 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400' :
                  'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400'

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums',
        color,
        className,
      )}
    >
      {score}
    </span>
  )
}
