'use client'

import { useAgentPerformance, type DateRange } from '@/lib/hooks/use-analytics'
import { SectionHeader } from '@/components/ui/section-header'
import { formatCurrency, initials } from '@/lib/utils'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const RANK_COLORS = ['text-amber-500', 'text-slate-400', 'text-amber-700']

export function AgentLeaderboard({ range }: { range: DateRange }) {
  const { data, isLoading } = useAgentPerformance({ from: range.from, to: range.to })
  const agents = (data ?? []).slice(0, 8)

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <SectionHeader title="Agent leaderboard" subtitle="By deals closed" />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
              <div className="w-16 h-4 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No agent data</p>
        </div>
      ) : (
        <div className="space-y-1">
          {agents.map((agent, i) => (
            <div
              key={agent.agentId}
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent transition-colors"
            >
              {/* Rank */}
              <div className={cn('w-5 text-center text-xs font-bold shrink-0', RANK_COLORS[i] ?? 'text-muted-foreground')}>
                {i < 3 ? <Trophy size={13} /> : i + 1}
              </div>

              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {initials(...agent.name.split(' ') as [string?, string?])}
                </span>
              </div>

              {/* Name */}
              <span className="flex-1 text-sm text-foreground truncate">{agent.name}</span>

              {/* Stats */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-foreground">{agent.deals}</p>
                  <p className="text-[10px] text-muted-foreground">deals</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">{formatCurrency(agent.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">revenue</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
