'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BedDouble, Bath, Car, Maximize2, Eye, Calendar } from 'lucide-react'
import { useUnit } from '@/lib/hooks/use-units'
import { UnitStatusBadge } from '@/components/modules/units/unit-status-badge'
import { ViewingScheduleDialog } from '@/components/modules/viewings/viewing-schedule-dialog'

export default function UnitDetailClient({ id }: { id: string }) {
  const { data: unit, isLoading, isError } = useUnit(id)
  const [viewingOpen, setViewingOpen] = useState(false)

  if (isLoading) return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="h-8 w-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"/>
      <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse"/>
    </div>
  )

  if (isError || !unit) return (
    <div className="p-6 text-center text-red-400">Unit not found</div>
  )

  const specs = [
    { label: 'Type', value: unit.unitType.replace('_', ' ') },
    { label: 'Area', value: unit.area ? `${unit.area} m²` : null },
    { label: 'Built-up Area', value: unit.builtUpArea ? `${unit.builtUpArea} m²` : null },
    { label: 'Bedrooms', value: unit.bedrooms != null ? String(unit.bedrooms) : null, icon: <BedDouble className="h-4 w-4"/> },
    { label: 'Bathrooms', value: unit.bathrooms != null ? String(unit.bathrooms) : null, icon: <Bath className="h-4 w-4"/> },
    { label: 'Parking', value: unit.parking != null ? String(unit.parking) : null, icon: <Car className="h-4 w-4"/> },
    { label: 'View', value: unit.view },
    { label: 'Finishing', value: unit.finishing.replace('_', ' ') },
    { label: 'Floor', value: unit.floor?.floorNumber != null ? `Floor ${unit.floor.floorNumber}` : null },
    { label: 'Building', value: unit.building?.name ?? null },
    { label: 'Delivery', value: unit.deliveryDate ? new Date(unit.deliveryDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null },
  ].filter(s => s.value != null)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/units" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
        <ArrowLeft className="h-4 w-4"/>Units
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Unit {unit.unitNumber}</h1>
              <UnitStatusBadge status={unit.status} />
            </div>
            {unit.project && (
              <Link href={`/projects/${unit.project.id}`} className="text-sm text-indigo-600 hover:underline mt-0.5 block">
                {unit.project.name}
              </Link>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              AED {Number(unit.price).toLocaleString()}
            </p>
            {unit.pricePerMeter && (
              <p className="text-xs text-zinc-400">AED {Number(unit.pricePerMeter).toLocaleString()} / m²</p>
            )}
          </div>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
          {specs.map(s => (
            <div key={s.label} className="space-y-0.5">
              <p className="text-xs text-zinc-400">{s.label}</p>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                {s.icon}{s.value}
              </p>
            </div>
          ))}
        </div>

        {unit.notes && (
          <p className="mt-4 text-sm text-zinc-500 leading-relaxed">{unit.notes}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {unit.status === 'AVAILABLE' && (
            <button
              onClick={() => setViewingOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              <Calendar className="h-4 w-4"/>Schedule Viewing
            </button>
          )}
          {unit.deal && (
            <Link href={`/deals/${unit.deal.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <Eye className="h-4 w-4"/>View Deal #{unit.deal.dealNumber}
            </Link>
          )}
        </div>
      </div>

      {/* Reservation info */}
      {unit.reservation && unit.reservation.status === 'ACTIVE' && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Unit is reserved</p>
          {unit.reservation.expiresAt && (
            <p className="text-xs text-blue-500 mt-0.5">
              Reservation expires {new Date(unit.reservation.expiresAt).toLocaleDateString()}
            </p>
          )}
          <Link href={`/reservations`} className="text-xs text-blue-600 hover:underline mt-1 block">View reservation →</Link>
        </div>
      )}

      <ViewingScheduleDialog
        open={viewingOpen}
        onClose={() => setViewingOpen(false)}
        prefillUnitId={unit.id}
      />
    </div>
  )
}
