'use client'
import { useState } from 'react'
import { Calendar, Plus } from 'lucide-react'
import { ViewingsList } from '@/components/modules/viewings/viewings-list'
import { ViewingScheduleDialog } from '@/components/modules/viewings/viewing-schedule-dialog'

export default function ViewingsClient() {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-zinc-400"/>Viewings
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
          <Plus className="h-4 w-4"/>Schedule Viewing
        </button>
      </div>
      <ViewingsList />
      <ViewingScheduleDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
