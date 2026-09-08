'use client'
import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft, Phone, MessageCircle, Mail, Edit, Archive,
  MapPin, DollarSign, BedDouble, Calendar, Building2,
} from 'lucide-react'
import { useLead, useUpdateLead, useArchiveLead } from '@/lib/hooks/use-leads'
import { StatusBadge } from '@/components/shared/status-badge'
import { ScoreBadge } from '@/components/shared/score-badge'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { LeadTimeline } from '@/components/modules/leads/lead-timeline'
import { LeadFormDialog } from '@/components/modules/leads/lead-form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const fmt = (n: string | null, currency = 'EGP') =>
  n ? new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n)) : '—'

export function LeadDetailClient({ id }: { id: string }) {
  const { data: lead, isLoading } = useLead(id)
  const update = useUpdateLead(id)
  const archive = useArchiveLead(id)
  const [showEdit, setShowEdit] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  const STATUSES = ['NEW','CONTACTED','QUALIFIED','UNQUALIFIED','VIEWING_SCHEDULED','VIEWING_COMPLETED','NEGOTIATION','RESERVED','WON','LOST']

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 rounded bg-muted animate-pulse" />
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (!lead) return <p className="text-muted-foreground">Lead not found</p>

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back */}
      <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{lead.fullName}</h1>
              <StatusBadge value={lead.status} />
              <StatusBadge value={lead.temperature} variant="temperature" />
              <ScoreBadge score={lead.leadScore} />
            </div>

            {/* Quick contact actions */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Phone className="h-4 w-4" /> {lead.phone}
                </a>
              )}
              {lead.whatsapp && (
                <a
                  href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Mail className="h-4 w-4" /> {lead.email}
                </a>
              )}
              {(lead.city || lead.country) && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {[lead.city, lead.country].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          </div>
        </div>

        {/* Status pipeline bar */}
        <div className="mt-5 flex gap-1 overflow-x-auto">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => update.mutate({ status: s })}
              className={`flex-1 min-w-max rounded py-1 px-2 text-xs font-medium transition-colors ${
                lead.status === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col — details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Agent */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Assigned To</p>
            <AgentAvatar agent={lead.assignedAgent} showName size="md" />
            {lead.team && (
              <p className="text-xs text-muted-foreground mt-1">Team: {lead.team.name}</p>
            )}
          </div>

          {/* Requirements */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Requirements</p>
            <Row icon={DollarSign} label="Budget">
              {lead.budgetMin || lead.budgetMax
                ? `${fmt(lead.budgetMin)} – ${fmt(lead.budgetMax)}`
                : '—'}
            </Row>
            <Row icon={BedDouble} label="Bedrooms">{lead.bedrooms ?? '—'}</Row>
            <Row icon={Building2} label="Type">{lead.preferredType ?? '—'}</Row>
            <Row icon={MapPin} label="Location">{lead.preferredLocation ?? '—'}</Row>
            <Row icon={null} label="Purpose">{lead.purchasePurpose?.replace(/_/g, ' ') ?? '—'}</Row>
            <Row icon={null} label="Financing">{lead.financingPref ?? '—'}</Row>
          </div>

          {/* Source + Follow-up */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Source & Timing</p>
            <Row icon={null} label="Source">{lead.source.replace(/_/g, ' ')}</Row>
            {lead.campaign && <Row icon={null} label="Campaign">{lead.campaign.name}</Row>}
            <Row icon={Calendar} label="Next Follow-up">
              {lead.nextFollowupAt ? format(new Date(lead.nextFollowupAt), 'dd MMM yyyy HH:mm') : '—'}
            </Row>
            <Row icon={Calendar} label="Last Contact">
              {lead.lastContactedAt ? format(new Date(lead.lastContactedAt), 'dd MMM yyyy') : '—'}
            </Row>
          </div>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right col — timeline + viewings + offers */}
        <div className="lg:col-span-2 space-y-4">
          {/* Notes */}
          {lead.notes && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Recent viewings */}
          {lead.viewings.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Viewings</p>
              <div className="space-y-2">
                {lead.viewings.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      Unit {v.unit.unitNumber} — {v.unit.project.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{format(new Date(v.scheduledAt), 'dd MMM')}</span>
                      <StatusBadge value={v.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved units */}
          {lead.savedUnits.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Saved Units</p>
              <div className="space-y-2">
                {lead.savedUnits.map(({ unit }) => (
                  <Link
                    key={unit.id}
                    href={`/units/${unit.id}`}
                    className="flex items-center justify-between text-sm hover:bg-muted rounded p-1 -m-1 transition-colors"
                  >
                    <span className="text-foreground">
                      Unit {unit.unitNumber} — {unit.project.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{fmt(unit.price)}</span>
                      <StatusBadge value={unit.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Activity Timeline</p>
            <LeadTimeline leadId={lead.id} activities={lead.activities} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <LeadFormDialog open={showEdit} onOpenChange={setShowEdit} lead={lead} />
      <ConfirmDialog
        open={showArchive}
        onOpenChange={setShowArchive}
        title="Archive lead?"
        description="The lead will be hidden from default views. You can restore it later."
        confirmLabel="Archive"
        onConfirm={async () => { await archive.mutateAsync(); setShowArchive(false) }}
        loading={archive.isPending}
      />
    </div>
  )
}

function Row({
  icon: Icon, label, children,
}: {
  icon: React.ComponentType<{ className?: string }> | null
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className="text-xs text-foreground text-right">{children}</span>
    </div>
  )
}
