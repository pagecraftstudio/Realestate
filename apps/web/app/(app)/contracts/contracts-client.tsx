'use client'
import { useState } from 'react'
import {
  FileSignature, Plus, CheckCircle2, Clock, XCircle,
  AlertCircle, Building2, User, DollarSign, Calendar,
} from 'lucide-react'
import {
  useContracts, useCreateContract, useUpdateContractStatus,
  useDeleteContract, type ContractsFilter,
} from '@/lib/hooks/use-contracts'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import type { Contract, ContractStatus } from '@/lib/types'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META: Record<ContractStatus, { label: string; cls: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Draft',     cls: 'bg-zinc-100 text-zinc-600',     icon: Clock         },
  SENT:      { label: 'Sent',      cls: 'bg-blue-100 text-blue-700',     icon: AlertCircle   },
  SIGNED:    { label: 'Signed',    cls: 'bg-violet-100 text-violet-700', icon: CheckCircle2  },
  ACTIVE:    { label: 'Active',    cls: 'bg-green-100 text-green-700',   icon: CheckCircle2  },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-600',       icon: XCircle       },
  EXPIRED:   { label: 'Expired',   cls: 'bg-amber-100 text-amber-600',   icon: AlertCircle   },
}

const TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  DRAFT:     ['SENT', 'CANCELLED'],
  SENT:      ['SIGNED', 'CANCELLED', 'EXPIRED'],
  SIGNED:    ['ACTIVE', 'CANCELLED'],
  ACTIVE:    ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED:   ['DRAFT'],
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      <m.icon className="h-3 w-3" />
      {m.label}
    </span>
  )
}

// ─── Create dialog ────────────────────────────────────────────────────────────

type CreateFormValues = {
  dealId: string; contractType: string; contractDate: string
  handoverDate: string; totalValue: string; currency: string
  terms: string; notes: string
}

function CreateContractDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateContract()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateFormValues>({
    defaultValues: { contractType: 'SALE', currency: 'AED' },
  })

  const onSubmit = async (v: CreateFormValues) => {
    await create.mutateAsync({
      dealId:       v.dealId,
      contractType: v.contractType,
      contractDate: v.contractDate ? new Date(v.contractDate).toISOString() : undefined,
      handoverDate: v.handoverDate ? new Date(v.handoverDate).toISOString() : undefined,
      totalValue:   Number(v.totalValue),
      currency:     v.currency,
      terms:        v.terms || undefined,
      notes:        v.notes || undefined,
    })
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">New Contract</Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Deal ID *</label>
                <input
                  {...register('dealId', { required: true })}
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono"
                  placeholder="Paste deal ID from the Deals module"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contract Type</label>
                <select
                  {...register('contractType')}
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {['SALE','RENTAL','RESERVATION','OTHER'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <select
                  {...register('currency')}
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {['AED','EGP','SAR','USD','EUR'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Total Contract Value *</label>
                <input
                  {...register('totalValue', { required: true })}
                  type="number"
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="e.g. 2500000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contract Date</label>
                <input
                  {...register('contractDate')}
                  type="date"
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Handover Date</label>
                <input
                  {...register('handoverDate')}
                  type="date"
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Contract Terms</label>
                <textarea
                  {...register('terms')}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Key terms, conditions…"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => onOpenChange(false)}
                className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {isSubmitting ? 'Creating…' : 'Create Contract'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Status transition popover ────────────────────────────────────────────────

function StatusTransitionMenu({ contract }: { contract: Contract }) {
  const update = useUpdateContractStatus(contract.id)
  const next   = TRANSITIONS[contract.status]
  if (next.length === 0) return null

  return (
    <div className="flex gap-1">
      {next.map(s => (
        <button
          key={s}
          onClick={() => update.mutate({ status: s })}
          className={`text-xs px-2 py-1 rounded border border-border hover:bg-muted font-medium transition-colors`}
        >
          → {STATUS_META[s].label}
        </button>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ContractsClient() {
  const [filter, setFilter] = useState<ContractsFilter>({ page: 1, limit: 20 })
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useContracts(filter)
  const deleteContract = useDeleteContract()

  const contracts = data?.data ?? []
  const meta      = data?.meta

  const byStatus = contracts.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {})

  const totalValue = contracts.reduce((s, c) => s + Number(c.totalValue), 0)

  function fmt(n: number) {
    return n.toLocaleString('en', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage sale and rental contracts across all deals
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Contract
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Contracts</p>
          <p className="text-2xl font-bold">{meta?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{byStatus['ACTIVE'] ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Signed</p>
          <p className="text-2xl font-bold text-violet-600">{byStatus['SIGNED'] ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Value (page)</p>
          <p className="text-xl font-bold">{fmt(totalValue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_META).map(s => (
            <option key={s} value={s}>{STATUS_META[s as ContractStatus].label}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, contractType: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Types</option>
          {['SALE','RENTAL','RESERVATION','OTHER'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No contracts yet"
          description="Create a contract from a deal to get started."
        />
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 hover:border-indigo-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                {/* Left */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{c.contractNumber}</span>
                    <StatusBadge status={c.status} />
                    <span className="text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground">
                      {c.contractType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{c.customer.fullName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {c.unit.project.name} · {c.unit.unitNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium text-foreground">
                        {Number(c.totalValue).toLocaleString('en', { style: 'currency', currency: c.currency, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    {c.contractDate && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{new Date(c.contractDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {c.signedAt && (
                    <p className="text-xs text-green-600">
                      ✓ Signed {new Date(c.signedAt).toLocaleDateString()}
                    </p>
                  )}

                  <StatusTransitionMenu contract={c} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!['SIGNED','ACTIVE','COMPLETED'].includes(c.status) && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete contract ${c.contractNumber}?`)) {
                          deleteContract.mutate(c.id)
                        }
                      }}
                      className="p-1.5 rounded hover:bg-muted text-red-400"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.pages > 1 && (
        <Pagination
          page={meta.page}
          pages={meta.pages}
          total={meta.total}
          onChange={(p) => setFilter(f => ({ ...f, page: p }))}
        />
      )}

      <CreateContractDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
