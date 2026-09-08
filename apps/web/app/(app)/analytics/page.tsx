'use client'

import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  useDashboardKpis, useSalesFunnel, useRevenueChart,
  useLeadsOverTime, useLeadSources, useAgentPerformance,
  usePipelineSummary, last30Days, last90Days, thisYear, type DateRange,
} from '@/lib/hooks/use-analytics'
import { StatCard } from '@/components/ui/stat-card'
import { DateRangeTabs } from '@/components/ui/date-range-tabs'
import { formatCurrency } from '@/lib/utils'
import { Users, Handshake, TrendingUp, GitBranch, Eye, Building2, AlertCircle, CreditCard, Award } from 'lucide-react'

const PIE_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground mb-4">{title}</p>
      {children}
    </div>
  )
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>(last30Days())
  const { data: kpis, isLoading: kpiLoad } = useDashboardKpis({ from: range.from, to: range.to })
  const { data: revenue,  isLoading: revLoad  } = useRevenueChart({ from: range.from, to: range.to })
  const { data: leadsOT,  isLoading: lotLoad  } = useLeadsOverTime({ from: range.from, to: range.to })
  const { data: funnel,   isLoading: funLoad  } = useSalesFunnel({ from: range.from, to: range.to })
  const { data: sources,  isLoading: srcLoad  } = useLeadSources({ from: range.from, to: range.to })
  const { data: agents,   isLoading: agLoad   } = useAgentPerformance({ from: range.from, to: range.to })
  const { data: pipeline, isLoading: pipeLoad } = usePipelineSummary()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Sales performance & insights</p>
        </div>
        <DateRangeTabs value={range} onChange={setRange} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total leads"     value={kpis?.leads.total ?? 0}                       sub={`${kpis?.leads.qualified ?? 0} qualified`}                  icon={Users}         accent="indigo"  loading={kpiLoad} />
        <StatCard label="Deals closed"    value={kpis?.deals.closed ?? 0}                      sub={`${kpis?.deals.conversionRate ?? 0}% conversion`}           icon={Handshake}     accent="green"   loading={kpiLoad} />
        <StatCard label="Revenue"         value={formatCurrency(kpis?.deals.totalRevenue ?? 0)} sub={`Avg ${formatCurrency(kpis?.deals.avgDealValue ?? 0)}`}     icon={TrendingUp}    accent="green"   loading={kpiLoad} />
        <StatCard label="Pipeline value"  value={formatCurrency(kpis?.pipeline.value ?? 0)}    sub={`${kpis?.pipeline.dealCount ?? 0} active deals`}            icon={GitBranch}     accent="indigo"  loading={kpiLoad} />
        <StatCard label="Viewings"        value={kpis?.viewings.scheduled ?? 0}                sub={`${kpis?.viewings.completed ?? 0} completed`}               icon={Eye}                            loading={kpiLoad} />
        <StatCard label="Reservations"    value={kpis?.reservations.active ?? 0}               sub="active"                                                     icon={Building2}                      loading={kpiLoad} />
        <StatCard label="Overdue instlmt" value={kpis?.installments.overdueCount ?? 0}         sub={formatCurrency(kpis?.installments.overdueAmount ?? 0)}      icon={AlertCircle}   accent={kpis?.installments.overdueCount ? 'red' : 'default'} loading={kpiLoad} />
        <StatCard label="Collected"       value={formatCurrency(kpis?.deals.totalPaymentsCollected ?? 0)}                                                        icon={CreditCard}    accent="green"   loading={kpiLoad} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue Over Time">
          {revLoad ? <div className="h-48 animate-pulse bg-muted rounded"/> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenue?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border"/>
                <XAxis dataKey="period" tick={{fontSize:11}}/>
                <YAxis tickFormatter={v => `${(v/1e6).toFixed(1)}M`} tick={{fontSize:11}}/>
                <Tooltip formatter={(v:number) => formatCurrency(v)}/>
                <Bar dataKey="revenue" fill="#6366f1" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Leads Over Time">
          {lotLoad ? <div className="h-48 animate-pulse bg-muted rounded"/> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={leadsOT?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border"/>
                <XAxis dataKey="period" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Sales Funnel">
          {funLoad ? <div className="h-48 animate-pulse bg-muted rounded"/> : (
            <div className="space-y-2">
              {(funnel?.funnel ?? []).map((s, i) => {
                const max = funnel?.funnel[0]?.count ?? 1
                const pct = max > 0 ? (s.count / max) * 100 : 0
                return (
                  <div key={s.stage}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{s.stage.replace(/_/g,' ')}</span>
                      <span>{s.count}{s.conversionFromPrev !== null ? ` · ${s.conversionFromPrev?.toFixed(0)}%` : ''}</span>
                    </div>
                    <div className="h-5 rounded bg-muted overflow-hidden">
                      <div className="h-full rounded" style={{width:`${pct}%`, background:`hsl(${240-i*20},70%,55%)`}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
        <ChartCard title="Lead Sources">
          {srcLoad ? <div className="h-48 animate-pulse bg-muted rounded"/> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sources ?? []} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={75} label={({source,percentage}) => `${source} ${percentage?.toFixed(0)}%`} labelLine={false}>
                  {(sources ?? []).map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Pipeline by stage */}
      <ChartCard title="Pipeline by Stage">
        {pipeLoad ? <div className="h-32 animate-pulse bg-muted rounded"/> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pipeline ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border"/>
              <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{fontSize:11}}/>
              <YAxis type="category" dataKey="stage" tick={{fontSize:11}} width={130}/>
              <Tooltip formatter={(v:number) => formatCurrency(v)}/>
              <Bar dataKey="totalValue" fill="#6366f1" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Agent leaderboard */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Award className="h-4 w-4 text-indigo-500"/>
          <p className="text-sm font-semibold">Agent Leaderboard</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {['#','Agent','Leads','Viewings','Deals','Revenue','Conv%','Commission'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agLoad ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : !agents?.length ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">No agent data yet</td></tr>
            ) : agents.map((a, i) => (
              <tr key={a.agentId} className={`border-t border-border ${i === 0 ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'hover:bg-muted/30'}`}>
                <td className="px-4 py-3 text-muted-foreground">{i === 0 ? '🥇' : i + 1}</td>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.leads}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.viewings}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.deals}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(a.revenue)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.conversionRate >= 20 ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {a.conversionRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(a.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
