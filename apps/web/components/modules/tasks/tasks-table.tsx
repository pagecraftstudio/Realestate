'use client'
import { useState } from 'react'
import { CheckCircle2, Circle, Trash2, Clock } from 'lucide-react'
import { useTasks, useCompleteTask, useDeleteTask, type TaskPriority, type TaskStatus } from '@/lib/hooks/use-tasks'
import { EmptyState } from '@/components/shared/empty-state'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { Pagination } from '@/components/shared/pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { cn } from '@/lib/utils'

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW:    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  HIGH:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  DONE:        'bg-emerald-100 text-emerald-700',
  CANCELLED:   'bg-zinc-100 text-zinc-500',
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const dt   = new Date(d)
  const past = dt < new Date()
  return (
    <span className={cn('text-xs', past ? 'text-red-500 font-medium' : 'text-zinc-500')}>
      {dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
    </span>
  )
}

function CompleteBtn({ id, status }: { id: string; status: TaskStatus }) {
  const complete = useCompleteTask(id)
  if (status === 'DONE' || status === 'CANCELLED') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  }
  return (
    <button
      onClick={() => complete.mutate()}
      disabled={complete.isPending}
      className="rounded-full p-0.5 hover:text-emerald-600 text-zinc-400 transition-colors disabled:opacity-50"
      title="Mark done"
    >
      <Circle className="h-4 w-4" />
    </button>
  )
}

function DeleteBtn({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const del = useDeleteTask(id)
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded p-1 hover:bg-red-50 text-zinc-400 hover:text-red-500">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete task?"
        description="This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={del.isPending}
        onConfirm={() => del.mutateAsync().then(() => setOpen(false))}
      />
    </>
  )
}

const STATUSES: TaskStatus[]  = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export function TasksTable() {
  const [filter, setFilter] = useState({ page: 1, limit: 20, status: '' as string, priority: '' as string })
  const { data, isLoading } = useTasks({
    page:     filter.page,
    limit:    filter.limit,
    status:   filter.status   || undefined,
    priority: filter.priority || undefined,
  } as Parameters<typeof useTasks>[0])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value, page: 1 }))}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          value={filter.priority}
          onChange={e => setFilter(f => ({ ...f, priority: e.target.value, page: 1 }))}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<Clock className="h-8 w-8" />} title="No tasks" description="Create a task to track follow-ups and to-dos." />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
              <tr>
                {['', 'Title', 'Priority', 'Status', 'Due', 'Assignee', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.data.map(task => (
                <tr
                  key={task.id}
                  className={cn(
                    'hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors',
                    task.status === 'DONE' && 'opacity-60',
                  )}
                >
                  <td className="px-4 py-3">
                    <CompleteBtn id={task.id} status={task.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('font-medium', task.status === 'DONE' && 'line-through text-zinc-400')}>
                      {task.title}
                    </span>
                    {task.description && (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_STYLES[task.priority])}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[task.status])}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{fmtDate(task.dueAt)}</td>
                  <td className="px-4 py-3">
                    {task.assignee
                      ? <AgentAvatar agent={{ id: task.assignee.id, profile: task.assignee.profile ? { ...task.assignee.profile, avatarUrl: null } : null }} size="sm" />
                      : <span className="text-xs text-zinc-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteBtn id={task.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <Pagination
          page={filter.page}
          pages={data.meta.pages}
          total={data.meta.total}
          onChange={p => setFilter(f => ({ ...f, page: p }))}
        />
      )}
    </div>
  )
}
