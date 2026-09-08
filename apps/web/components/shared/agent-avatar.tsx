import { cn } from '@/lib/utils'
import type { AgentRef } from '@/lib/types'

interface Props {
  agent: AgentRef | null | undefined
  size?: 'sm' | 'md'
  showName?: boolean
  className?: string
}

export function AgentAvatar({ agent, size = 'sm', showName = false, className }: Props) {
  const name = agent?.profile
    ? `${agent.profile.firstName ?? ''} ${agent.profile.lastName ?? ''}`.trim()
    : 'Unassigned'

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const sz = size === 'sm' ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {agent?.profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={agent.profile.avatarUrl}
          alt={name}
          className={cn('rounded-full object-cover', sz)}
        />
      ) : (
        <span
          className={cn(
            'rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center',
            sz,
          )}
        >
          {initials || '—'}
        </span>
      )}
      {showName && (
        <span className="text-sm text-foreground">{agent ? name : 'Unassigned'}</span>
      )}
    </span>
  )
}
