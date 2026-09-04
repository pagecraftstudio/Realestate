'use client'
import Link from 'next/link'
import { Building2, MapPin, Calendar, TrendingUp } from 'lucide-react'
import type { Project } from '@/lib/types-20b'
import { cn } from '@/lib/utils'

const PROJECT_STATUS_STYLES: Record<string, string> = {
  PLANNING:           'bg-zinc-100 text-zinc-600',
  UNDER_CONSTRUCTION: 'bg-amber-100 text-amber-700',
  READY:              'bg-emerald-100 text-emerald-700',
  COMPLETED:          'bg-blue-100 text-blue-700',
  ON_HOLD:            'bg-red-100 text-red-600',
}
const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning', UNDER_CONSTRUCTION: 'Under Construction',
  READY: 'Ready', COMPLETED: 'Completed', ON_HOLD: 'On Hold',
}

function AvailabilityBar({ summary }: { summary?: Record<string, number> }) {
  if (!summary) return null
  const available = summary['AVAILABLE'] ?? 0
  const reserved  = summary['RESERVED'] ?? 0
  const sold      = (summary['SOLD'] ?? 0) + (summary['CONTRACTED'] ?? 0)
  const total = available + reserved + sold + (summary['ON_HOLD'] ?? 0) + (summary['UNAVAILABLE'] ?? 0)
  if (!total) return null

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>{available} available</span>
        <span>{total} total</span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div className="bg-emerald-500" style={{ width: `${(available / total) * 100}%` }} />
        <div className="bg-blue-400"   style={{ width: `${(reserved / total) * 100}%` }} />
        <div className="bg-zinc-400"   style={{ width: `${(sold / total) * 100}%` }} />
      </div>
      <div className="flex gap-3 mt-1 text-[10px] text-zinc-400">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"/>Available</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block"/>Reserved</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 inline-block"/>Sold</span>
      </div>
    </div>
  )
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{project.name}</h3>
          {project.developer && (
            <p className="text-xs text-zinc-500 mt-0.5">{project.developer}</p>
          )}
        </div>
        <span className={cn(
          'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
          PROJECT_STATUS_STYLES[project.status] ?? 'bg-zinc-100 text-zinc-600'
        )}>
          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
        </span>
      </div>

      {/* Meta */}
      <div className="space-y-1 text-xs text-zinc-500">
        {project.city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{[project.district, project.city].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {project.completionDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>Completion {new Date(project.completionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        )}
        {project.startingPrice && (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 shrink-0" />
            <span>From AED {Number(project.startingPrice).toLocaleString()}</span>
          </div>
        )}
        {project._count && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 shrink-0" />
            <span>{project._count.buildings} buildings · {project._count.units} units</span>
          </div>
        )}
      </div>

      <AvailabilityBar summary={project.unitStatusSummary} />
    </Link>
  )
}
