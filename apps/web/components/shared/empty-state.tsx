import React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Props {
  icon?: LucideIcon | React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  // Support both LucideIcon components and pre-rendered ReactNode
  const iconNode = icon
    ? typeof icon === 'function'
      ? (() => { const Icon = icon as LucideIcon; return <Icon className="h-6 w-6 text-muted-foreground" /> })()
      : icon
    : null

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-12 text-center',
        className,
      )}
    >
      {iconNode && (
        <div className="rounded-full bg-muted p-3">
          {iconNode}
        </div>
      )}
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
