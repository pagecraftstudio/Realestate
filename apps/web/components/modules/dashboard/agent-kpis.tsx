'use client'

import {
  Users, Eye, Handshake, AlertTriangle, CalendarDays, BadgeDollarSign,
} from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency } from '@/lib/utils'
import type { AgentDashboard } from '@/lib/hooks/use-analytics'

export function AgentKpiGrid({
  data, loading,
}: { data?: AgentDashboard; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        label="My leads"
        value={data?.leads.total ?? 0}
        sub={`${data?.leads.new ?? 0} new`}
        icon={Users}
        accent="indigo"
        loading={loading}
      />
      <StatCard
        label="Due today"
        value={data?.leads.dueToday ?? 0}
        sub="follow-ups"
        icon={CalendarDays}
        accent={data?.leads.dueToday ? 'amber' : 'default'}
        loading={loading}
      />
      <StatCard
        label="Overdue"
        value={data?.leads.overdueFollowups ?? 0}
        sub="follow-ups"
        icon={AlertTriangle}
        accent={data?.leads.overdueFollowups ? 'red' : 'default'}
        loading={loading}
      />
      <StatCard
        label="Viewings today"
        value={data?.viewings.today ?? 0}
        sub={`${data?.viewings.upcoming ?? 0} upcoming`}
        icon={Eye}
        accent="indigo"
        loading={loading}
      />
      <StatCard
        label="Active deals"
        value={data?.deals.active ?? 0}
        sub={`${data?.deals.closed ?? 0} closed`}
        icon={Handshake}
        accent="green"
        loading={loading}
      />
      <StatCard
        label="My commission"
        value={formatCurrency(data?.commission.total ?? 0)}
        sub="total earned"
        icon={BadgeDollarSign}
        accent="green"
        loading={loading}
      />
    </div>
  )
}
