'use client'
import { useState } from 'react'
import { Plus, Building2 } from 'lucide-react'
import { useProjects, type ProjectsFilter } from '@/lib/hooks/use-projects'
import { ProjectCard } from '@/components/modules/projects/project-card'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectsClient() {
  const [filter, setFilter] = useState<ProjectsFilter>({ page: 1, limit: 20 })
  const { data, isLoading, isError } = useProjects(filter)

  const STATUSES = ['PLANNING','UNDER_CONSTRUCTION','READY','COMPLETED','ON_HOLD']

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Projects</h1>
          {data && <p className="text-sm text-zinc-500 mt-0.5">{data.meta.total} projects</p>}
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
          <Plus className="h-4 w-4"/>New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search projects…"
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm w-56"
          onChange={e => setFilter(f => ({ ...f, search: e.target.value || undefined, page: 1 }))}
        />
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center text-red-400 py-12">Failed to load projects</div>
      ) : !data?.data.length ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8"/>}
          title="No projects yet"
          description="Add your first real estate project to start tracking units and availability."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
