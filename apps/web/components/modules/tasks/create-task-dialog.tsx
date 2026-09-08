'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useCreateTask, type TaskPriority } from '@/lib/hooks/use-tasks'

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
}

export function CreateTaskDialog({ open, onOpenChange }: Props) {
  const create = useCreateTask()
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [dueAt,       setDueAt]       = useState('')
  const [priority,    setPriority]    = useState<TaskPriority>('MEDIUM')

  async function submit() {
    if (!title.trim()) return
    await create.mutateAsync({ title: title.trim(), description: description || undefined, dueAt: dueAt || undefined, priority })
    setTitle(''); setDescription(''); setDueAt(''); setPriority('MEDIUM')
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card border border-border p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold text-foreground">New Task</Dialog.Title>
            <Dialog.Close className="rounded-md p-1 hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Task title…"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional details…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Due date</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={dueAt}
                  onChange={e => setDueAt(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Cancel
            </Dialog.Close>
            <button
              onClick={submit}
              disabled={!title.trim() || create.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {create.isPending ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
