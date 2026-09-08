'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Building2, Maximize2 } from 'lucide-react'
import { useProject } from '@/lib/hooks/use-projects'
import { UnitHeatmap } from '@/components/modules/projects/unit-heatmap'
import { UnitsTable } from '@/components/modules/units/units-table'
import { ViewingScheduleDialog } from '@/components/modules/viewings/viewing-schedule-dialog'
import type { Unit } from '@/lib/types-20b'

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning', UNDER_CONSTRUCTION: 'Under Construction',
  READY: 'Ready', COMPLETED: 'Completed', ON_HOLD: 'On Hold',
}

type Tab = 'heatmap' | 'units'

export default function ProjectDetailClient({ id }: { id: string }) {
  const { data: project, isLoading, isError } = useProject(id)
  const [tab, setTab] = useState<Tab>('heatmap')
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [viewingOpen, setViewingOpen] = useState(false)

  if (isLoading) return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"/>
      <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse"/>
    </div>
  )

  if (isError || !project) return (
    <div className="p-6 text-center text-red-400">Failed to load project</div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
        <ArrowLeft className="h-4 w-4"/>Projects
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{project.name}</h1>
            {project.developer && (
              <p className="text-zinc-500 text-sm mt-0.5">by {project.developer}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-zinc-500">
              {project.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-zinc-400"/>
                  {[project.district, project.city, project.country].filter(Boolean).join(', ')}
                </span>
              )}
              {project.completionDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-zinc-400"/>
                  Expected {new Date(project.completionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
              {project._count && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-zinc-400"/>
                  {project._count.buildings} buildings · {project._count.units} units
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>
        {project.description && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{project.description}</p>
        )}
        {project.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {project.amenities.map(a => (
              <span key={a} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full px-2.5 py-0.5">{a}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {([['heatmap','Availability Map'],['units','Units']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'heatmap' ? (
        <div className="space-y-6">
          {project.buildings?.map(building => (
            <div key={building.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-zinc-400"/>{building.name}
                <span className="text-xs text-zinc-400 font-normal">· {building.floorsCount} floors</span>
              </h3>
              {building.floors?.length ? (
                <UnitHeatmap
                  floors={building.floors}
                  onUnitClick={unit => setSelectedUnit(unit)}
                />
              ) : (
                <p className="text-sm text-zinc-400">No floor data available.</p>
              )}
            </div>
          ))}
          {!project.buildings?.length && (
            <div className="text-center text-zinc-400 py-12 text-sm">No buildings added yet.</div>
          )}
        </div>
      ) : (
        <UnitsTable projectId={id} />
      )}

      {/* Unit quick-view */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedUnit(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Unit {selectedUnit.unitNumber}</h3>
                <p className="text-sm text-zinc-500">{selectedUnit.unitType.replace('_',' ')}</p>
              </div>
              <button onClick={() => setSelectedUnit(null)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-zinc-500">Status</dt><dd className="font-medium">{selectedUnit.status}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Price</dt><dd className="font-medium">AED {Number(selectedUnit.price).toLocaleString()}</dd></div>
              {selectedUnit.area && <div className="flex justify-between"><dt className="text-zinc-500">Area</dt><dd className="font-medium">{selectedUnit.area} m²</dd></div>}
              {selectedUnit.bedrooms != null && <div className="flex justify-between"><dt className="text-zinc-500">Bedrooms</dt><dd className="font-medium">{selectedUnit.bedrooms}</dd></div>}
              {selectedUnit.view && <div className="flex justify-between"><dt className="text-zinc-500">View</dt><dd className="font-medium">{selectedUnit.view}</dd></div>}
              <div className="flex justify-between"><dt className="text-zinc-500">Finishing</dt><dd className="font-medium">{selectedUnit.finishing.replace('_',' ')}</dd></div>
            </dl>
            <div className="flex gap-2 mt-5">
              <Link href={`/units/${selectedUnit.id}`}
                className="flex-1 text-center px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                View Details
              </Link>
              {selectedUnit.status === 'AVAILABLE' && (
                <button
                  onClick={() => { setViewingOpen(true) }}
                  className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
                  Schedule Viewing
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ViewingScheduleDialog
        open={viewingOpen}
        onClose={() => { setViewingOpen(false); setSelectedUnit(null) }}
        prefillUnitId={selectedUnit?.id}
      />
    </div>
  )
}
