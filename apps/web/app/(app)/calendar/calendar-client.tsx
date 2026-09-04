'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useViewings } from '@/lib/hooks/use-viewings'
import { useTasks }    from '@/lib/hooks/use-tasks'
import { cn } from '@/lib/utils'

type CalView = 'month' | 'week'

function startOfWeek(d: Date) {
  const s = new Date(d)
  s.setDate(d.getDate() - d.getDay())
  s.setHours(0, 0, 0, 0)
  return s
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isoDay(d: Date) {
  return d.toISOString().split('T')[0]!
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface CalEvent {
  id:    string
  title: string
  day:   string   // YYYY-MM-DD
  color: 'indigo' | 'amber'
  time?: string
}

export function CalendarClient() {
  const [view,    setView]    = useState<CalView>('month')
  const [anchor,  setAnchor]  = useState(() => new Date())

  // Date window for API calls
  const { from, to } = useMemo(() => {
    if (view === 'month') {
      const s = startOfMonth(anchor)
      const e = new Date(s.getFullYear(), s.getMonth() + 1, 0)
      return { from: s.toISOString(), to: e.toISOString() }
    } else {
      const s = startOfWeek(anchor)
      const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59)
      return { from: s.toISOString(), to: e.toISOString() }
    }
  }, [anchor, view])

  const { data: viewingsData } = useViewings({ from, to, page: 1, limit: 200 })
  const { data: tasksData }    = useTasks({ limit: 200 })

  const events: CalEvent[] = useMemo(() => {
    const out: CalEvent[] = []
    for (const v of viewingsData?.data ?? []) {
      const day = isoDay(new Date(v.scheduledAt))
      const time = new Date(v.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      const who  = v.lead?.fullName ?? v.customer?.fullName ?? '?'
      out.push({ id: v.id, title: `Viewing — ${who}`, day, color: 'indigo', time })
    }
    for (const t of tasksData?.data ?? []) {
      if (!t.dueAt) continue
      const day = isoDay(new Date(t.dueAt))
      out.push({ id: t.id, title: t.title, day, color: 'amber' })
    }
    return out
  }, [viewingsData, tasksData])

  // Build grid days
  const days: Date[] = useMemo(() => {
    if (view === 'week') {
      const s = startOfWeek(anchor)
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d })
    }
    // month: grid starts from Sunday before first of month
    const first = startOfMonth(anchor)
    const gridStart = new Date(first); gridStart.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d
    })
  }, [anchor, view])

  function navigate(dir: -1 | 1) {
    const n = new Date(anchor)
    if (view === 'month') n.setMonth(anchor.getMonth() + dir)
    else n.setDate(anchor.getDate() + dir * 7)
    setAnchor(n)
  }

  const today = isoDay(new Date())

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
            {(['month', 'week'] as CalView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 capitalize',
                  view === v
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50',
                )}
              >{v}</button>
            ))}
          </div>
          {/* Nav */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium text-foreground">
              {view === 'month'
                ? `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
                : `Week of ${days[0]?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
            </span>
            <button onClick={() => navigate(1)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setAnchor(new Date())} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" />Viewings</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Tasks</span>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Weekday headers */}
        <div className={cn('grid', view === 'week' ? 'grid-cols-7' : 'grid-cols-7')}>
          {WEEKDAYS.map(d => (
            <div key={d} className="bg-zinc-50 dark:bg-zinc-800/60 px-2 py-2 text-xs font-medium text-zinc-500 text-center border-b border-zinc-200 dark:border-zinc-800">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className={cn('grid', 'grid-cols-7', view === 'month' ? 'grid-rows-6' : 'grid-rows-1')}>
          {(view === 'month' ? days : days).map((day, i) => {
            const key = isoDay(day)
            const dayEvents = events.filter(e => e.day === key)
            const isToday = key === today
            const isCurrentMonth = view === 'month' ? day.getMonth() === anchor.getMonth() : true

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[90px] p-1.5 border-b border-r border-zinc-100 dark:border-zinc-800',
                  !isCurrentMonth && 'opacity-40',
                  isToday && 'bg-indigo-50/50 dark:bg-indigo-950/20',
                )}
              >
                <div className={cn(
                  'text-xs font-medium mb-1 h-5 w-5 flex items-center justify-center rounded-full',
                  isToday ? 'bg-indigo-600 text-white' : 'text-zinc-600 dark:text-zinc-400',
                )}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      title={ev.title}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium truncate',
                        ev.color === 'indigo'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                      )}
                    >
                      {ev.time && <span className="opacity-70 mr-1">{ev.time}</span>}
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-zinc-400 pl-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
