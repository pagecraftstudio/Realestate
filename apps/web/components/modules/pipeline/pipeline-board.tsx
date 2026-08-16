'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useMoveDeal } from '@/lib/hooks/use-pipeline'
import type { Deal } from '@/lib/types'

const STAGES = [
  { key: 'NEW_INQUIRY',   label: 'New Inquiry' },
  { key: 'QUALIFICATION', label: 'Qualification' },
  { key: 'VIEWING',       label: 'Viewing' },
  { key: 'OFFER',         label: 'Offer' },
  { key: 'NEGOTIATION',   label: 'Negotiation' },
  { key: 'CONTRACT',      label: 'Contract' },
  { key: 'WON',           label: 'Won ✅' },
  { key: 'LOST',          label: 'Lost ❌' },
]

const fmt = (n: string) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(Number(n))

interface Props { deals: Deal[] }

export function PipelineBoard({ deals }: Props) {
  const moveDeal = useMoveDeal()
  const [dragging, setDragging] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)

  // Group deals by stage
  const byStage = new Map<string, Deal[]>()
  STAGES.forEach((s) => byStage.set(s.key, []))
  deals.forEach((d) => {
    const stage = d.pipelineStage ?? 'NEW_INQUIRY'
    if (!byStage.has(stage)) byStage.set(stage, [])
    byStage.get(stage)!.push(d)
  })

  const stageTotals = new Map(
    STAGES.map((s) => [
      s.key,
      (byStage.get(s.key) ?? []).reduce((sum, d) => sum + Number(d.dealValue), 0),
    ]),
  )

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
      {STAGES.map((stage) => {
        const stageDeals = byStage.get(stage.key) ?? []
        const isOver = overStage === stage.key

        return (
          <div
            key={stage.key}
            className={`flex-shrink-0 w-64 rounded-xl border bg-muted/40 p-3 flex flex-col gap-2 transition-colors ${
              isOver ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-border'
            }`}
            onDragOver={(e) => { e.preventDefault(); setOverStage(stage.key) }}
            onDragLeave={() => setOverStage(null)}
            onDrop={(e) => {
              e.preventDefault()
              setOverStage(null)
              if (dragId.current && dragId.current !== stage.key) {
                const deal = deals.find((d) => d.id === dragging)
                if (deal && deal.pipelineStage !== stage.key) {
                  moveDeal.mutate({ id: dragging!, pipelineStage: stage.key })
                }
              }
            }}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-semibold text-foreground">{stage.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {stageDeals.length} deal{stageDeals.length !== 1 ? 's' : ''}
                  {stageTotals.get(stage.key)! > 0 && ` · ${fmt(String(stageTotals.get(stage.key)))}` }
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {stageDeals.length}
              </span>
            </div>

            {/* Deal cards */}
            <div className="flex flex-col gap-2 flex-1">
              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={() => { setDragging(deal.id); dragId.current = deal.id }}
                  onDragEnd={() => { setDragging(null); dragId.current = null }}
                  className={`rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm transition-opacity ${
                    dragging === deal.id ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <Link href={`/deals/${deal.id}`} onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs font-semibold text-foreground hover:text-indigo-600 transition-colors">
                      {deal.customer.fullName}
                    </p>
                  </Link>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Unit {deal.unit.unitNumber} · {deal.unit.project.name}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{fmt(deal.dealValue)}</span>
                    {deal.agent?.profile && (
                      <span className="text-[10px] text-muted-foreground">
                        {deal.agent.profile.firstName} {deal.agent.profile.lastName?.charAt(0)}.
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {stageDeals.length === 0 && (
                <div className="flex-1 rounded-lg border border-dashed border-border flex items-center justify-center min-h-[80px]">
                  <p className="text-xs text-muted-foreground">Drop here</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
