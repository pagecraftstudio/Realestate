'use client'
import { cn } from '@/lib/utils'
import type { Unit, Floor, UnitStatus } from '@/lib/types-20b'

const CELL_COLORS: Record<UnitStatus, string> = {
  AVAILABLE:   'bg-emerald-500 hover:bg-emerald-600 cursor-pointer',
  ON_HOLD:     'bg-amber-400 hover:bg-amber-500 cursor-pointer',
  RESERVED:    'bg-blue-500 hover:bg-blue-600 cursor-pointer',
  CONTRACTED:  'bg-violet-500 hover:bg-violet-600 cursor-pointer',
  SOLD:        'bg-zinc-400 cursor-default',
  RENTED:      'bg-teal-500 hover:bg-teal-600 cursor-pointer',
  UNAVAILABLE: 'bg-red-400 cursor-default',
}

interface Props {
  floors: Floor[]
  onUnitClick?: (unit: Unit) => void
}

export function UnitHeatmap({ floors, onUnitClick }: Props) {
  const sorted = [...floors].sort((a, b) => b.floorNumber - a.floorNumber)

  return (
    <div className="overflow-x-auto">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {Object.entries(CELL_COLORS).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1">
            <span className={cn('h-3 w-3 rounded-sm', cls.split(' ')[0])} />
            <span className="text-zinc-500 capitalize">{status.toLowerCase().replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      <table className="border-separate border-spacing-1">
        <tbody>
          {sorted.map((floor) => (
            <tr key={floor.id}>
              <td className="pr-2 text-xs text-zinc-400 w-16 text-right whitespace-nowrap">
                {floor.label ?? `Floor ${floor.floorNumber}`}
              </td>
              {(floor.units ?? []).map((unit) => (
                <td key={unit.id}>
                  <button
                    onClick={() => onUnitClick?.(unit)}
                    title={`${unit.unitNumber} · ${unit.unitType} · AED ${Number(unit.price).toLocaleString()}`}
                    className={cn(
                      'h-8 w-10 rounded text-[10px] font-medium text-white transition-colors',
                      CELL_COLORS[unit.status],
                    )}
                  >
                    {unit.unitNumber}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
