'use client'

import { useState } from 'react'
import { Plus, Building2, Search, Trash2 } from 'lucide-react'
import { useProjects } from '@/lib/hooks/use-projects'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { EmptyState } from '@/components/shared/empty-state'

interface Building { id: string; name: string; floorsCount: number; description: string | null; projects?: { name: string } }

function useBuildings(filter: { project_id?: string } = {}) {
  return useQuery({
    queryKey: ['buildings', filter],
    queryFn: async () => (await api.get('/api/v1/buildings', { params: { ...filter, limit: 100 } })).data,
  })
}

function useCreateBuilding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { project_id: string; name: string; floors_count: number; description?: string }) =>
      (await api.post('/api/v1/buildings', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buildings'] }),
  })
}

function useDeleteBuilding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/api/v1/buildings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buildings'] }),
  })
}

function NewBuildingDialog({ onClose }: { onClose: () => void }) {
  const { data: projects } = useProjects({ limit: 100 })
  const create = useCreateBuilding()
  const [form, setForm] = useState({ project_id: '', name: '', floors_count: 1, description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!form.project_id) { setError('Select a project'); return }
    if (!form.name.trim()) { setError('Building name is required'); return }
    setSaving(true); setError('')
    try { await create.mutateAsync({ ...form, description: form.description || undefined }); onClose() }
    catch (e: any) { setError(e?.response?.data?.detail ?? 'Failed to create') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">New Building</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="text-sm font-medium mb-1 block">Project *</label>
            <select className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))}>
              <option value="">Select project…</option>
              {(projects as any)?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Name *</label>
            <input className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Tower A, Block 1…"/>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Floors</label>
            <input type="number" min={1} className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" value={form.floors_count} onChange={e => setForm(f => ({...f, floors_count: Number(e.target.value)}))}/>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}/>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Building'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BuildingsPage() {
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch]   = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const { data: projects } = useProjects({ limit: 100 })
  const { data, isLoading } = useBuildings({ project_id: projectFilter || undefined })
  const del = useDeleteBuilding()

  const buildings: Building[] = ((data as any)?.data ?? []).filter((b: Building) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {showNew && <NewBuildingDialog onClose={() => setShowNew(false)}/>}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Buildings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{(data as any)?.meta?.total ?? 0} buildings</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4"/>New Building
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
          <input className="h-9 rounded-lg border border-border bg-background pl-8 pr-3 text-sm w-48" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="">All Projects</option>
          {(projects as any)?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:6}).map((_,i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse"/>)}
        </div>
      ) : buildings.length === 0 ? (
        <EmptyState icon={Building2} title="No buildings yet" description="Add buildings to your projects to manage units by floor."/>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map(b => (
            <div key={b.id} className="bg-card border border-border rounded-xl p-5 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400"/>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{b.name}</p>
                    {b.projects && <p className="text-xs text-muted-foreground">{b.projects.name}</p>}
                  </div>
                </div>
                <button onClick={() => { if (confirm('Delete this building?')) del.mutate(b.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 text-red-400 transition-all">
                  <Trash2 className="h-3.5 w-3.5"/>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground">Floors</p>
                  <p className="text-xl font-bold text-foreground">{b.floorsCount}</p>
                </div>
              </div>
              {b.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{b.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
