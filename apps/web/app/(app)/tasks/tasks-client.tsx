'use client'
import { useState } from 'react'
import { CheckSquare, Plus } from 'lucide-react'
import { TasksTable } from '@/components/modules/tasks/tasks-table'
import { CreateTaskDialog } from '@/components/modules/tasks/create-task-dialog'

export function TasksClient() {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-indigo-500" />
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track follow-ups, to-dos, and team assignments</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      <TasksTable />

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
