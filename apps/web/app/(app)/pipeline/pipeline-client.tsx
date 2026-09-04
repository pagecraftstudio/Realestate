'use client'
import { usePipeline } from '@/lib/hooks/use-pipeline'
import { PipelineBoard } from '@/components/modules/pipeline/pipeline-board'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)

export function PipelineClient() {
  const { data, isLoading } = usePipeline({ status: 'ACTIVE' })
  const deals = data?.data ?? []

  const totalValue = deals.reduce((sum, d) => sum + Number(d.dealValue), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Pipeline</h1>
          {deals.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {deals.length} active deals · {fmt(totalValue)} total value
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <PipelineBoard deals={deals} />
      )}
    </div>
  )
}
