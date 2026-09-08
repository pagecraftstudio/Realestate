import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Full UI coming in Phase 20</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground text-sm">Analytics module — Phase 20</p>
      </div>
    </div>
  )
}
