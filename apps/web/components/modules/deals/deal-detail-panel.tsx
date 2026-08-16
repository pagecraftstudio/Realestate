'use client'
import { useState } from 'react'
import { CheckCircle, Clock, AlertCircle, CreditCard, BadgeDollarSign } from 'lucide-react'
import { useDeal, useUpdateDealStage } from '@/lib/hooks/use-deals'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { RecordPaymentDialog } from '@/components/modules/payments/record-payment-dialog'
import type { InstallmentStatus, CommissionStatus, PipelineStage } from '@/lib/types-20c'

const STAGES: PipelineStage[] = [
  'INITIAL_CONTACT', 'NEEDS_ANALYSIS', 'SITE_VISIT',
  'PROPOSAL', 'NEGOTIATION', 'CONTRACT_SIGNED',
  'PAYMENT_PLAN', 'CLOSED_WON', 'CLOSED_LOST',
]

const STAGE_LABELS: Record<PipelineStage, string> = {
  INITIAL_CONTACT: 'Initial Contact',
  NEEDS_ANALYSIS: 'Needs Analysis',
  SITE_VISIT: 'Site Visit',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CONTRACT_SIGNED: 'Contract Signed',
  PAYMENT_PLAN: 'Payment Plan',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

const INSTALLMENT_ICONS: Record<InstallmentStatus, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5 text-zinc-400" />,
  DUE: <AlertCircle className="h-3.5 w-3.5 text-amber-500" />,
  OVERDUE: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  PAID: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
  WAIVED: <CheckCircle className="h-3.5 w-3.5 text-zinc-400" />,
}

const INSTALLMENT_ROW: Record<InstallmentStatus, string> = {
  PENDING: '',
  DUE: 'bg-amber-50 dark:bg-amber-900/10',
  OVERDUE: 'bg-red-50 dark:bg-red-900/10',
  PAID: 'opacity-60',
  WAIVED: 'opacity-50',
}

const COMMISSION_COLORS: Record<CommissionStatus, string> = {
  PENDING: 'bg-zinc-100 text-zinc-500',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

function fmt(val: string | number) {
  return Number(val).toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props { dealId: string }

export function DealDetailPanel({ dealId }: Props) {
  const { data: deal, isLoading } = useDeal(dealId)
  const updateStage = useUpdateDealStage(dealId)
  const [payInstallmentId, setPayInstallmentId] = useState<string | null>(null)

  if (isLoading) return <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
  if (!deal) return null

  const totalPaid = deal.payments.reduce((s, p) => s + Number(p.amount), 0)
  const totalDue = Number(deal.dealValue)
  const paidPct = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Customer</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg">{deal.customer.fullName}</p>
            <p className="text-sm text-zinc-500">{deal.customer.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Deal Value</p>
            <p className="font-bold text-2xl text-zinc-900 dark:text-zinc-100">{fmt(deal.dealValue)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-zinc-500">Unit</p>
            <p className="font-medium">Unit {deal.unit.unitNumber} — {deal.unit.project.name}</p>
          </div>
          <div>
            <p className="text-zinc-500">Type / Area</p>
            <p className="font-medium">{deal.unit.unitType} · {deal.unit.area ?? '—'} m²</p>
          </div>
          {deal.agent && (
            <div>
              <p className="text-zinc-500 mb-1">Agent</p>
              <AgentAvatar agent={deal.agent} size="sm" />
            </div>
          )}
          <div>
            <p className="text-zinc-500">Created</p>
            <p className="font-medium">{fmtDate(deal.createdAt)}</p>
          </div>
        </div>

        {/* Pipeline stage selector */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Pipeline Stage</p>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map(stage => (
              <button
                key={stage}
                disabled={updateStage.isPending}
                onClick={() => updateStage.mutate(stage)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  deal.pipelineStage === stage
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
        </div>

        {/* Payment progress bar */}
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Payment progress</span>
            <span>{fmt(totalPaid)} / {fmt(totalDue)} ({paidPct}%)</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Payment Plan */}
      {deal.paymentPlan && (
        <Section title="Payment Plan" icon={<BadgeDollarSign className="h-4 w-4" />}>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Kv label="Total" value={fmt(deal.paymentPlan.totalAmount)} />
            <Kv label="Down Payment" value={`${fmt(deal.paymentPlan.downPayment)} (${Number(deal.paymentPlan.downPaymentPct).toFixed(1)}%)`} />
            <Kv label="Installments" value={`${deal.paymentPlan.installmentCount}x ${deal.paymentPlan.frequency}`} />
          </div>
        </Section>
      )}

      {/* Installments */}
      {deal.installments.length > 0 && (
        <Section title="Installments" icon={<Clock className="h-4 w-4" />}>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr>
                  {['#', 'Due Date', 'Amount', 'Status', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {deal.installments.map(inst => (
                  <tr key={inst.id} className={`${INSTALLMENT_ROW[inst.status]} transition-colors`}>
                    <td className="px-3 py-2 text-zinc-500">{inst.installmentNumber}</td>
                    <td className="px-3 py-2">
                      {fmtDate(inst.dueDate)}
                    </td>
                    <td className="px-3 py-2 font-medium">{fmt(inst.amount)}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1">
                        {INSTALLMENT_ICONS[inst.status]}
                        <span className="text-xs">{inst.status}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {inst.status !== 'PAID' && inst.status !== 'WAIVED' && (
                        <button
                          onClick={() => setPayInstallmentId(inst.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Payment history */}
      {deal.payments.length > 0 && (
        <Section title="Payment History" icon={<CreditCard className="h-4 w-4" />}>
          <div className="space-y-2">
            {deal.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{fmt(p.amount)}</p>
                  <p className="text-xs text-zinc-500">{p.method} · {fmtDate(p.paidAt)}</p>
                </div>
                {p.receiptUrl && (
                  <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">
                    Receipt
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Commission */}
      {deal.commission && (
        <Section title="Commission" icon={<BadgeDollarSign className="h-4 w-4" />}>
          <div className="flex items-center justify-between">
            <div className="space-y-1 text-sm">
              <div className="flex gap-8">
                <Kv label="Agent" value={`${fmt(deal.commission.agentAmount)} (${Number(deal.commission.agentRate).toFixed(1)}%)`} />
                {deal.commission.managerAmount && (
                  <Kv label="Manager" value={`${fmt(deal.commission.managerAmount)} (${Number(deal.commission.managerRate).toFixed(1)}%)`} />
                )}
                <Kv label="Total" value={fmt(deal.commission.totalAmount)} />
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${COMMISSION_COLORS[deal.commission.status]}`}>
              {deal.commission.status}
            </span>
          </div>
        </Section>
      )}

      {/* Record payment dialog */}
      {payInstallmentId && (
        <RecordPaymentDialog
          dealId={dealId}
          installmentId={payInstallmentId}
          onClose={() => setPayInstallmentId(null)}
        />
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {icon}{title}
      </h3>
      {children}
    </div>
  )
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-500 text-xs">{label}</p>
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}
