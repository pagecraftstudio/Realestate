'use client'
import { useState } from 'react'
import {
  Plus, Megaphone, TrendingUp, Users, BarChart3,
  Edit2, Trash2, ToggleLeft, ToggleRight, ExternalLink,
} from 'lucide-react'
import {
  useCampaigns, useCreateCampaign, useUpdateCampaign,
  useDeleteCampaign, useCampaignStats, type CampaignsFilter,
} from '@/lib/hooks/use-campaigns'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import type { Campaign } from '@/lib/types'

const SOURCES = [
  'WEBSITE','FACEBOOK','INSTAGRAM','WHATSAPP','GOOGLE_ADS',
  'PROPERTY_PORTAL','REFERRAL','PHONE','WALK_IN','MANUAL','IMPORT','OTHER',
]

const SOURCE_COLORS: Record<string, string> = {
  FACEBOOK: 'bg-blue-100 text-blue-700',
  INSTAGRAM: 'bg-pink-100 text-pink-700',
  GOOGLE_ADS: 'bg-yellow-100 text-yellow-700',
  WHATSAPP: 'bg-green-100 text-green-700',
  WEBSITE: 'bg-indigo-100 text-indigo-700',
  PROPERTY_PORTAL: 'bg-violet-100 text-violet-700',
  REFERRAL: 'bg-emerald-100 text-emerald-700',
  PHONE: 'bg-sky-100 text-sky-700',
}

function sourceBadge(src: string) {
  const cls = SOURCE_COLORS[src] ?? 'bg-zinc-100 text-zinc-600'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {src.replace('_', ' ')}
    </span>
  )
}

// ─── Stats chip ───────────────────────────────────────────────────────────────

function CampaignStatsChip({ id }: { id: string }) {
  const { data } = useCampaignStats(id)
  if (!data) return null
  return (
    <span className="text-xs text-muted-foreground">
      {data.total} leads · {data.conversionRate}% converted
    </span>
  )
}

// ─── Form dialog ──────────────────────────────────────────────────────────────

type FormValues = {
  name: string; source: string; description: string
  budget: string; startDate: string; endDate: string; isActive: boolean
}

function CampaignFormDialog({
  open, onOpenChange, campaign,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; campaign?: Campaign | null
}) {
  const isEdit = !!campaign
  const create = useCreateCampaign()
  const update = useUpdateCampaign(campaign?.id ?? '')

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: campaign?.name ?? '',
      source: campaign?.source ?? 'FACEBOOK',
      description: campaign?.description ?? '',
      budget: campaign?.budget ?? '',
      startDate: campaign?.startDate?.slice(0, 10) ?? '',
      endDate: campaign?.endDate?.slice(0, 10) ?? '',
      isActive: campaign?.isActive ?? true,
    },
  })

  const onSubmit = async (v: FormValues) => {
    const payload = {
      name:        v.name,
      source:      v.source,
      description: v.description || undefined,
      budget:      v.budget ? Number(v.budget) : undefined,
      startDate:   v.startDate ? new Date(v.startDate).toISOString() : undefined,
      endDate:     v.endDate   ? new Date(v.endDate).toISOString()   : undefined,
      isActive:    v.isActive,
    }
    if (isEdit) { await update.mutateAsync(payload) }
    else        { await create.mutateAsync(payload) }
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">
              {isEdit ? 'Edit Campaign' : 'New Campaign'}
            </Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Campaign Name *</label>
                <input
                  {...register('name', { required: true })}
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="e.g. Facebook Summer 2025"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Lead Source *</label>
                <select
                  {...register('source')}
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Budget (AED)</label>
                <input
                  {...register('budget')}
                  type="number"
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="e.g. 50000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <input
                  {...register('startDate')}
                  type="date"
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <input
                  {...register('endDate')}
                  type="date"
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Campaign objectives, target audience…"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input {...register('isActive')} type="checkbox" id="isActive" className="h-4 w-4" />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => onOpenChange(false)}
                className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Row toggle button — needs its own component so hook is called at top level

function ToggleActiveButton({ campaign }: { campaign: Campaign }) {
  const update = useUpdateCampaign(campaign.id)
  return (
    <button
      title={campaign.isActive ? 'Deactivate' : 'Activate'}
      onClick={() => update.mutate({ isActive: !campaign.isActive })}
      className="p-1.5 rounded hover:bg-muted text-muted-foreground"
    >
      {campaign.isActive
        ? <ToggleRight className="h-4 w-4 text-green-500" />
        : <ToggleLeft className="h-4 w-4" />}
    </button>
  )
}



export function MarketingClient() {
  const [filter, setFilter] = useState<CampaignsFilter>({ page: 1, limit: 20 })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)

  const { data, isLoading } = useCampaigns(filter)
  const deleteCampaign = useDeleteCampaign()

  const campaigns = data?.data ?? []
  const meta      = data?.meta

  const totalLeads   = campaigns.reduce((s, c) => s + c._count.leads, 0)
  const activeCamps  = campaigns.filter(c => c.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketing & Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track lead sources and campaign performance
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Campaigns', value: meta?.total ?? 0,  icon: Megaphone, color: 'text-indigo-500' },
          { label: 'Active',          value: activeCamps,        icon: ToggleRight, color: 'text-green-500' },
          { label: 'Total Leads',     value: totalLeads,         icon: Users,    color: 'text-blue-500'   },
          { label: 'This Page',       value: campaigns.length,   icon: BarChart3, color: 'text-violet-500' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, source: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          onChange={e => setFilter(f => ({
            ...f,
            isActive: e.target.value === '' ? undefined : e.target.value === 'true',
            page: 1,
          }))}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <input
          type="text"
          placeholder="Search campaigns…"
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm w-52"
          onChange={e => setFilter(f => ({ ...f, search: e.target.value || undefined, page: 1 }))}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first campaign to start tracking lead sources."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Campaign</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Budget</th>
                <th className="px-4 py-3 text-left font-medium">Dates</th>
                <th className="px-4 py-3 text-left font-medium">Performance</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">{sourceBadge(c.source)}</td>
                  <td className="px-4 py-3">
                    {c.budget
                      ? Number(c.budget).toLocaleString('en', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                    {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString()}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">{c._count.leads} leads</span>
                    </div>
                    <CampaignStatsChip id={c.id} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <ToggleActiveButton campaign={c} />
                      <button
                        onClick={() => { setEditing(c); setShowForm(true) }}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete campaign "${c.name}"?`)) {
                            deleteCampaign.mutate(c.id)
                          }
                        }}
                        className="p-1.5 rounded hover:bg-muted text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.pages > 1 && (
        <Pagination
          page={meta.page}
          pages={meta.pages}
          total={meta.total}
          onPageChange={(p) => setFilter(f => ({ ...f, page: p }))}
        />
      )}

      <CampaignFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        campaign={editing}
      />
    </div>
  )
}
