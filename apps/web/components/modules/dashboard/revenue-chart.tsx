'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useRevenueChart, type DateRange } from '@/lib/hooks/use-analytics'
import { SectionHeader } from '@/components/ui/section-header'
import { formatCurrency } from '@/lib/utils'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-popover border border-border px-3 py-2 shadow-lg text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-semibold text-foreground">
        {formatCurrency(payload[0]?.value ?? 0)}
      </p>
    </div>
  )
}

export function RevenueChart({ range }: { range: DateRange }) {
  const { data, isLoading } = useRevenueChart({
    from: range.from,
    to:   range.to,
    granularity: 'month',
  })

  const series = data?.series ?? []
  const total  = series.reduce((s, p) => s + p.revenue, 0)

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <SectionHeader
        title="Revenue collected"
        subtitle={isLoading ? 'Loading…' : formatCurrency(total)}
      />

      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded" />
      ) : series.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No payment data for this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(231,54%,50%)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="hsl(231,54%,50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(231,54%,50%)"
              strokeWidth={2}
              fill="url(#revGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
