'use client'

import { useSalesFunnel, type DateRange } from '@/lib/hooks/use-analytics'
import { SectionHeader } from '@/components/ui/section-header'
import { cn } from '@/lib/utils'

const STAGE_LABELS: Record<string, string> = {
  NEW:                'New',
  CONTACTED:          'Contacted',
  QUALIFIED:          'Qualified',
  VIEWING_SCHEDULED:  'Viewing scheduled',
  VIEWING_COMPLETED:  'Viewing done',
  NEGOTIATION:        'Negotiating',
  RESERVED:           'Reserved',
  WON:                'Closed',
}

export function SalesFunnelWidget({ range }: { range: DateRange }) {
  const { data, isLoading } = useSalesFunnel({ from: range.from, to: range.to })

  const funnel = data?.funnel ?? []
  const max    = Math.max(...funnel.map((s) => s.count), 1)

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <SectionHeader title="Sales funnel" subtitle="Lead progression by stage" />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : funnel.length === 0 ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No lead data</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {funnel.map((stage, i) => {
            const pct = max > 0 ? (stage.count / max) * 100 : 0
            return (
              <div key={stage.stage} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 shrink-0 truncate">
                  {STAGE_LABELS[stage.stage] ?? stage.stage}
                </span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-indigo-600/80 rounded transition-all duration-500 flex items-center px-2"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  >
                    {stage.count > 0 && (
                      <span className="text-[11px] text-white font-medium">{stage.count}</span>
                    )}
                  </div>
                </div>
                {stage.conversionFromPrev !== null && (
                  <span className={cn(
                    'text-[11px] w-10 text-right shrink-0',
                    stage.conversionFromPrev >= 50
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-amber-600 dark:text-amber-400',
                  )}>
                    {stage.conversionFromPrev}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* KPI row */}
      {data?.kpis && (
        <div className="pt-3 border-t border-border grid grid-cols-3 gap-2">
          {[
            { label: 'Lead → Qualified', value: data.kpis.leadToQualified },
            { label: 'Viewing → Offer',  value: data.kpis.viewingToOffer },
            { label: 'Offer → Close',    value: data.kpis.reservationToClose },
          ].map((k) => (
            <div key={k.label} className="text-center">
              <p className="text-xs font-semibold text-foreground">{k.value}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
