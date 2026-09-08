'use client'

import { useState } from 'react'
import {
  Users, Handshake, TrendingUp, Building2,
  CreditCard, AlertCircle, GitBranch, Eye,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardKpis, last30Days, type DateRange } from '@/lib/hooks/use-analytics'
import { StatCard } from '@/components/ui/stat-card'
import { DateRangeTabs } from '@/components/ui/date-range-tabs'
import { RevenueChart } from '@/components/modules/dashboard/revenue-chart'
import { SalesFunnelWidget } from '@/components/modules/dashboard/sales-funnel'
import { LeadSourcesWidget } from '@/components/modules/dashboard/lead-sources'
import { AgentLeaderboard } from '@/components/modules/dashboard/agent-leaderboard'
import { PipelineWidget } from '@/components/modules/dashboard/pipeline-widget'
import { AgentKpiGrid } from '@/components/modules/dashboard/agent-kpis'
import { formatCurrency } from '@/lib/utils'

// ─── Admin / Manager view ─────────────────────────────────────────────────────

function AdminDashboard({ range }: { range: DateRange }) {
  const { data, isLoading } = useDashboardKpis({ from: range.from, to: range.to })

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total leads"
          value={data?.leads.total ?? 0}
          sub={`${data?.leads.qualified ?? 0} qualified`}
          icon={Users}
          accent="indigo"
          loading={isLoading}
        />
        <StatCard
          label="Deals closed"
          value={data?.deals.closed ?? 0}
          sub={`${data?.deals.conversionRate ?? 0}% conversion`}
          icon={Handshake}
          accent="green"
          loading={isLoading}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(data?.deals.totalRevenue ?? 0)}
          sub={`Avg ${formatCurrency(data?.deals.avgDealValue ?? 0)}`}
          icon={TrendingUp}
          accent="green"
          loading={isLoading}
        />
        <StatCard
          label="Pipeline value"
          value={formatCurrency(data?.pipeline.value ?? 0)}
          sub={`${data?.pipeline.dealCount ?? 0} active deals`}
          icon={GitBranch}
          accent="indigo"
          loading={isLoading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Viewings"
          value={data?.viewings.scheduled ?? 0}
          sub={`${data?.viewings.completed ?? 0} completed`}
          icon={Eye}
          loading={isLoading}
        />
        <StatCard
          label="Active reservations"
          value={data?.reservations.active ?? 0}
          icon={Building2}
          loading={isLoading}
        />
        <StatCard
          label="Overdue installments"
          value={data?.installments.overdueCount ?? 0}
          sub={formatCurrency(data?.installments.overdueAmount ?? 0)}
          icon={AlertCircle}
          accent={data?.installments.overdueCount ? 'red' : 'default'}
          loading={isLoading}
        />
        <StatCard
          label="Payments collected"
          value={formatCurrency(data?.deals.totalPaymentsCollected ?? 0)}
          icon={CreditCard}
          accent="green"
          loading={isLoading}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart range={range} />
        </div>
        <SalesFunnelWidget range={range} />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LeadSourcesWidget range={range} />
        <div className="lg:col-span-2">
          <AgentLeaderboard range={range} />
        </div>
      </div>

      {/* Pipeline */}
      <PipelineWidget />
    </div>
  )
}

// ─── Agent view ───────────────────────────────────────────────────────────────

function AgentDashboard({ range }: { range: DateRange }) {
  const { data, isLoading } = useDashboardKpis({ from: range.from, to: range.to })

  return (
    <div className="space-y-6">
      <AgentKpiGrid data={data as any} loading={isLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart range={range} />
        <SalesFunnelWidget range={range} />
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function DashboardClient() {
  const user  = useAuthStore((s) => s.user)
  const [range, setRange] = useState<DateRange>(last30Days())

  const isAgent = user?.role === 'SALES_AGENT'

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const name = user?.profile?.firstName ?? user?.email?.split('@')[0] ?? ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {greeting()}{name ? `, ${name}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isAgent ? 'Your sales overview' : 'Organization overview'}
          </p>
        </div>
        <DateRangeTabs value={range} onChange={setRange} />
      </div>

      {/* Role-aware dashboard */}
      {isAgent
        ? <AgentDashboard range={range} />
        : <AdminDashboard range={range} />}
    </div>
  )
}
