'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { usePipelineSummary } from '@/lib/hooks/use-analytics'
import { SectionHeader } from '@/components/ui/section-header'
import { formatCurrency } from '@/lib/utils'

const STAGE_LABELS: Record<string, string> = {
  PROSPECT:     'Prospect',
  QUALIFIED:    'Qualified',
  PROPOSAL:     'Proposal',
  NEGOTIATION:  'Negotiation',
  CONTRACTED:   'Contracted',
  COMPLETED:    'Closed',
  CANCELLED:    'Cancelled',
}

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-popover border border-border px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-foreground">{STAGE_LABELS[label] ?? label}</p>
      <p className="text-muted-foreground text-xs">{payload[0]?.payload.dealCount} deals</p>
      <p className="text-foreground text-xs font-medium">{formatCurrency(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

export function PipelineWidget() {
  const { data, isLoading } = usePipelineSummary()
  const stages = (data ?? []).filter((s) => s.dealCount > 0)

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <SectionHeader title="Pipeline by stage" subtitle="Active deal value" />

      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded" />
      ) : stages.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No active deals</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stages} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="stage"
              tickFormatter={(v) => STAGE_LABELS[v] ?? v}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TooltipContent />} />
            <Bar
              dataKey="totalValue"
              fill="hsl(231,54%,50%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
