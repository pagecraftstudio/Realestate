'use client'
import { useState } from 'react'
import { Plus, Building2 } from 'lucide-react'
import { useProjects, useCreateProject, type ProjectsFilter } from '@/lib/hooks/use-projects'
import { ProjectCard } from '@/components/modules/projects/project-card'
import { EmptyState } from '@/components/shared/empty-state'

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateProject()
  const [form, setForm] = useState({ name: '', description: '', developer: '', city: '', status: 'PLANNING', property_type: 'RESIDENTIAL' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Project name is required'); return }
    setSaving(true); setError('')
    try {
      await create.mutateAsync(form)
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to create project')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">New Project</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Project Name *</label>
            <input className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Green Valley Residences" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Developer</label>
            <input className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" value={form.developer} onChange={e => setForm(f => ({...f, developer: e.target.value}))} placeholder="Developer name" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">City</label>
            <input className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} placeholder="Cairo, Dubai…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
              <select className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                {['PLANNING','UNDER_CONSTRUCTION','READY','COMPLETED','ON_HOLD'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Type</label>
              <select className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" value={form.property_type} onChange={e => setForm(f => ({...f, property_type: e.target.value}))}>
                {['RESIDENTIAL','COMMERCIAL','ADMINISTRATIVE','RETAIL','LAND','OTHER'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
            <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Optional description…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsClient() {
  const [filter, setFilter] = useState<ProjectsFilter>({ page: 1, limit: 20 })
  const [showNew, setShowNew] = useState(false)
  const { data, isLoading, isError } = useProjects(filter)

  const STATUSES = ['PLANNING','UNDER_CONSTRUCTION','READY','COMPLETED','ON_HOLD']

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {showNew && <NewProjectDialog onClose={() => setShowNew(false)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Projects</h1>
          {data && <p className="text-sm text-zinc-500 mt-0.5">{data.meta.total} projects</p>}
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
          <Plus className="h-4 w-4"/>New Project
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Search projects…" className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm w-56" onChange={e => setFilter(f => ({ ...f, search: e.target.value || undefined, page: 1 }))} />
        <select className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm" onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="text-center text-red-400 py-12">Failed to load projects</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<Building2 className="h-8 w-8"/>} title="No projects yet" description="Add your first real estate project to start tracking units and availability." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map(project => <ProjectCard key={project.id} project={project} />)}
        </div>
      )}
    </div>
  )
}
