'use client'
import { useState } from 'react'
import { BarChart2, TrendingUp, Users2, Target } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  useRevenueChart, useLeadSources, useAgentPerformance, useSalesFunnel,
  last30Days, last90Days, thisYear,
} from '@/lib/hooks/use-analytics'
import { DateRangeTabs } from '@/components/ui/date-range-tabs'
import { AgentAvatar } from '@/components/shared/agent-avatar'

function fmt(n: number) {
  return n.toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
}

const SOURCE_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']

// ─── Revenue chart ────────────────────────────────────────────────────────────

function RevenueChart({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useRevenueChart({ from, to })

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-indigo-500" />
        Revenue by Period
      </h3>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.series.length ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.1)" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tickFormatter={v => `${(v/1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Leads by source ──────────────────────────────────────────────────────────

function LeadSourcesChart({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useLeadSources({ from, to })

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-indigo-500" />
        Leads by Source
      </h3>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.length ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} label={({ source, percentage }) => `${source} ${percentage.toFixed(0)}%`} labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]!} />)}
            </Pie>
            <Tooltip formatter={(v: number, name: string) => [v, name]} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Conversion funnel ────────────────────────────────────────────────────────

function ConversionFunnel({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useSalesFunnel({ from, to })

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-indigo-500" />
        Conversion Funnel
      </h3>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.funnel.length ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">No data</div>
      ) : (
        <div className="space-y-2">
          {data.funnel.map((stage, i) => {
            const maxCount = data.funnel[0]?.count ?? 1
            const width = Math.max(10, (stage.count / maxCount) * 100)
            return (
              <div key={stage.stage} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-36 shrink-0 text-right">{stage.stage.replace(/_/g, ' ')}</span>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-medium text-white"
                    style={{ width: `${width}%`, background: `hsl(${240 - i * 20}, 70%, 55%)` }}
                  >
                    {stage.count}
                  </div>
                </div>
                {stage.conversionFromPrev !== null && (
                  <span className="text-xs text-zinc-400 w-10 shrink-0">{stage.conversionFromPrev.toFixed(0)}%</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Agent performance table ──────────────────────────────────────────────────

function AgentTable({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useAgentPerformance({ from, to })

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Users2 className="h-4 w-4 text-indigo-500" />
        Agent Performance
      </h3>
      {isLoading ? (
        <div className="h-32 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.length ? (
        <div className="h-32 flex items-center justify-center text-zinc-400 text-sm">No data</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Agent', 'Leads', 'Viewings', 'Offers', 'Deals', 'Revenue', 'Conv.', 'Commission'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.map(a => (
                <tr key={a.agentId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-700">
                        {a.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 text-xs whitespace-nowrap">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{a.leads}</td>
                  <td className="px-3 py-2 text-zinc-600">{a.viewings}</td>
                  <td className="px-3 py-2 text-zinc-600">{a.offers}</td>
                  <td className="px-3 py-2 text-zinc-600">{a.deals}</td>
                  <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">{fmt(a.revenue)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-semibold ${a.conversionRate >= 20 ? 'text-emerald-600' : a.conversionRate >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                      {a.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-600 whitespace-nowrap">{fmt(a.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: 'Last 30 days', value: 'last30', range: last30Days },
  { label: 'Last 90 days', value: 'last90', range: last90Days },
  { label: 'This year',    value: 'year',   range: thisYear  },
] as const

export function ReportsClient() {
  const [rangeKey, setRangeKey] = useState<'last30' | 'last90' | 'year'>('last30')
  const { from, to } = DATE_RANGES.find(r => r.value === rangeKey)!.range()

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-indigo-500" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Revenue, funnel, and agent performance analytics</p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
          {DATE_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRangeKey(r.value)}
              className={`px-3 py-1.5 whitespace-nowrap ${
                rangeKey === r.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueChart from={from} to={to} />
        <LeadSourcesChart from={from} to={to} />
        <ConversionFunnel from={from} to={to} />
        <AgentTable from={from} to={to} />
      </div>
    </div>
  )
}
