'use client'
import { useState } from 'react'
import { X, CreditCard } from 'lucide-react'
import { useRecordPayment } from '@/lib/hooks/use-payments'

const METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER']

interface Props {
  dealId: string
  installmentId?: string | null
  defaultAmount?: number
  onClose: () => void
}

export function RecordPaymentDialog({ dealId, installmentId, defaultAmount, onClose }: Props) {
  const record = useRecordPayment()
  const [form, setForm] = useState({
    amount: defaultAmount?.toString() ?? '',
    method: 'BANK_TRANSFER',
    referenceNumber: '',
    paidAt: new Date().toISOString().split('T')[0],
    notes: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await record.mutateAsync({
      dealId,
      installmentId: installmentId ?? undefined,
      amount: Number(form.amount),
      method: form.method,
      referenceNumber: form.referenceNumber || undefined,
      paidAt: new Date(form.paidAt).toISOString(),
      notes: form.notes || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <CreditCard className="h-4 w-4 text-indigo-600" />
            Record Payment
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Amount (EGP)</label>
            <input
              required
              type="number"
              min={0}
              step={1}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Method</label>
            <select
              value={form.method}
              onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            >
              {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Reference / Cheque No.</label>
            <input
              type="text"
              value={form.referenceNumber}
              onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Payment Date</label>
            <input
              required
              type="date"
              value={form.paidAt}
              onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={record.isPending || !form.amount}
              className="flex-1 rounded-xl bg-indigo-600 text-white py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {record.isPending ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
