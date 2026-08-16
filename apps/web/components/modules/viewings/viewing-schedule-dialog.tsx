'use client'
import { useState } from 'react'
import { X, Calendar } from 'lucide-react'
import { useCreateViewing } from '@/lib/hooks/use-viewings'

interface Props {
  open: boolean
  onClose: () => void
  prefillLeadId?: string
  prefillCustomerId?: string
  prefillUnitId?: string
}

export function ViewingScheduleDialog({ open, onClose, prefillLeadId, prefillCustomerId, prefillUnitId }: Props) {
  const create = useCreateViewing()
  const [form, setForm] = useState({
    leadId: prefillLeadId ?? '',
    customerId: prefillCustomerId ?? '',
    unitId: prefillUnitId ?? '',
    agentId: '',
    scheduledAt: '',
    location: '',
    notes: '',
  })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.scheduledAt) { setError('Scheduled date/time required'); return }
    try {
      await create.mutateAsync({
        ...(form.leadId ? { leadId: form.leadId } : {}),
        ...(form.customerId ? { customerId: form.customerId } : {}),
        ...(form.unitId ? { unitId: form.unitId } : {}),
        ...(form.agentId ? { agentId: form.agentId } : {}),
        scheduledAt: form.scheduledAt,
        ...(form.location ? { location: form.location } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      })
      onClose()
    } catch {
      setError('Failed to schedule viewing')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500"/>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Schedule Viewing</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="h-4 w-4 text-zinc-500"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!prefillLeadId && !prefillCustomerId && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Lead ID <span className="text-zinc-300">(or Customer ID below)</span></label>
              <input value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}
                placeholder="lead_xxx"
                className="w-full h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"/>
            </div>
          )}
          {!prefillUnitId && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Unit ID</label>
              <input value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}
                placeholder="unit_xxx"
                className="w-full h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"/>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Date & Time <span className="text-red-400">*</span></label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              required
              className="w-full h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"/>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Tower A, Unit 201"
              className="w-full h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"/>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Client preferences, access instructions…"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm resize-none"/>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={create.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {create.isPending ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
