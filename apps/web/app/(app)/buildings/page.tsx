import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Buildings' }

export default function BuildingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Buildings</h1>
        <p className="text-muted-foreground text-sm mt-1">Full UI coming in Phase 20</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground text-sm">Buildings module — Phase 20</p>
      </div>
    </div>
  )
}
