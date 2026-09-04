'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLeadSources, type DateRange } from '@/lib/hooks/use-analytics'
import { SectionHeader } from '@/components/ui/section-header'

const COLORS = [
  'hsl(231,54%,50%)',
  'hsl(195,80%,48%)',
  'hsl(160,60%,42%)',
  'hsl(38,90%,52%)',
  'hsl(340,72%,52%)',
  'hsl(270,54%,54%)',
  'hsl(20,80%,52%)',
]

const TooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-lg bg-popover border border-border px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-foreground">{d.name}</p>
      <p className="text-muted-foreground text-xs">{d.payload.count} leads · {d.value}%</p>
    </div>
  )
}

export function LeadSourcesWidget({ range }: { range: DateRange }) {
  const { data, isLoading } = useLeadSources({ from: range.from, to: range.to })
  const sources = data ?? []
  const total   = sources.reduce((s, d) => s + d.count, 0)

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <SectionHeader title="Lead sources" subtitle={`${total} total leads`} />

      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded" />
      ) : sources.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No source data</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={sources}
                dataKey="percentage"
                nameKey="source"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={0}
              >
                {sources.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<TooltipContent />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="space-y-1.5">
            {sources.slice(0, 6).map((s, i) => (
              <div key={s.source} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-xs text-muted-foreground flex-1 truncate capitalize">
                  {s.source?.toLowerCase().replace('_', ' ') ?? 'Unknown'}
                </span>
                <span className="text-xs font-medium text-foreground">{s.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
