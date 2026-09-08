'use client'
import { useState } from 'react'
import {
  Wand2, Star, StarOff, Building2, DollarSign,
  LayoutGrid, ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import {
  useMatchRequests, useRunMatch, useShortlistUnit,
  type MatchFilter,
} from '@/lib/hooks/use-property-matching'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { useForm } from 'react-hook-form'
import type { PropertyMatchRequest, PropertyMatchResult } from '@/lib/types'

const PROPERTY_TYPES = ['RESIDENTIAL','COMMERCIAL','ADMINISTRATIVE','RETAIL','LAND','OTHER']
const PURPOSES       = ['OWN_USE','INVESTMENT','RENTAL','RESALE','UNDECIDED']
const FINANCING      = ['CASH','MORTGAGE','INSTALLMENT','UNDECIDED']

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-green-500'  :
    score >= 45 ? 'bg-amber-400'  :
    'bg-zinc-300'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{score}</span>
    </div>
  )
}

// ─── Match result card ────────────────────────────────────────────────────────

function MatchResultCard({
  result, matchRequestId,
}: {
  result: PropertyMatchResult
  matchRequestId: string
}) {
  const shortlist = useShortlistUnit(matchRequestId)
  const [expanded, setExpanded] = useState(false)
  const u = result.unit

  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      result.isShortlisted
        ? 'border-amber-300 bg-amber-50/40 dark:bg-amber-900/10'
        : 'border-border bg-card'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{u.project.name}</span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-sm">{u.unitNumber}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              u.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
            }`}>{u.status}</span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {u.unitType.replace('_', ' ')}
              {u.bedrooms != null ? ` · ${u.bedrooms} BR` : ''}
              {u.area ? ` · ${u.area} m²` : ''}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span className="font-medium text-foreground">
                {Number(u.price).toLocaleString('en', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}
              </span>
            </span>
            {u.project.city && (
              <span>{u.project.city}</span>
            )}
          </div>

          <div className="mt-2">
            <ScoreBar score={result.score} />
          </div>

          {/* Reasons expandable */}
          {result.reasons.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? 'Hide reasons' : `${result.reasons.length} match reasons`}
              </button>
              {expanded && (
                <ul className="mt-1.5 space-y-0.5">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Shortlist toggle */}
        <button
          onClick={() => shortlist.mutate({ unitId: u.id, isShortlisted: !result.isShortlisted })}
          title={result.isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            result.isShortlisted
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          {result.isShortlisted ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ─── Match request card ───────────────────────────────────────────────────────

function MatchRequestCard({ req }: { req: PropertyMatchRequest }) {
  const [open, setOpen] = useState(false)
  const shortlisted = req.results.filter(r => r.isShortlisted).length
  const subject     = req.lead ?? req.customer

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start gap-3 text-left">
          <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
            {subject?.fullName?.[0] ?? '?'}
          </div>
          <div>
            <p className="font-medium text-sm">{subject?.fullName ?? 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(req.createdAt).toLocaleDateString()} ·{' '}
              {req.results.length} matches · {shortlisted} shortlisted
            </p>
            {/* Criteria chips */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {req.budgetMax && (
                <span className="rounded bg-blue-50 text-blue-600 px-1.5 py-0.5 text-xs">
                  Budget: {Number(req.budgetMax).toLocaleString('en', { maximumFractionDigits: 0 })} AED max
                </span>
              )}
              {req.propertyType && (
                <span className="rounded bg-violet-50 text-violet-600 px-1.5 py-0.5 text-xs">
                  {req.propertyType}
                </span>
              )}
              {req.bedrooms != null && (
                <span className="rounded bg-emerald-50 text-emerald-600 px-1.5 py-0.5 text-xs">
                  {req.bedrooms} BR
                </span>
              )}
              {req.preferredLocation && (
                <span className="rounded bg-amber-50 text-amber-600 px-1.5 py-0.5 text-xs">
                  📍 {req.preferredLocation}
                </span>
              )}
            </div>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-3 bg-muted/10">
          {req.results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No matching units found for this criteria.
            </p>
          ) : (
            req.results.map(r => (
              <MatchResultCard key={r.id} result={r} matchRequestId={req.id} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Run match form ───────────────────────────────────────────────────────────

type RunFormValues = {
  leadId: string; customerId: string
  budgetMin: string; budgetMax: string; propertyType: string
  preferredLocation: string; bedrooms: string
  areaMin: string; areaMax: string
  purpose: string; financing: string; notes: string
}

function RunMatchPanel({ onDone }: { onDone: () => void }) {
  const runMatch = useRunMatch()
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<RunFormValues>()

  const onSubmit = async (v: RunFormValues) => {
    if (!v.leadId && !v.customerId) {
      alert('Provide either a Lead ID or Customer ID')
      return
    }
    await runMatch.mutateAsync({
      leadId:            v.leadId     || undefined,
      customerId:        v.customerId || undefined,
      budgetMin:         v.budgetMin  ? Number(v.budgetMin)  : undefined,
      budgetMax:         v.budgetMax  ? Number(v.budgetMax)  : undefined,
      propertyType:      v.propertyType      || undefined,
      preferredLocation: v.preferredLocation || undefined,
      bedrooms:          v.bedrooms   ? Number(v.bedrooms)   : undefined,
      areaMin:           v.areaMin    ? Number(v.areaMin)    : undefined,
      areaMax:           v.areaMax    ? Number(v.areaMax)    : undefined,
      purpose:           v.purpose    || undefined,
      financing:         v.financing  || undefined,
      notes:             v.notes      || undefined,
    })
    onDone()
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-900/10 p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-indigo-500" />
        Run Property Match
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-muted-foreground">Lead ID</label>
          <input {...register('leadId')} className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono" placeholder="cld..." />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-muted-foreground">Customer ID</label>
          <input {...register('customerId')} className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono" placeholder="cld..." />
        </div>
        <div className="col-span-2 sm:col-span-1 sm:row-span-1">
          <label className="text-xs font-medium text-muted-foreground">Property Type</label>
          <select {...register('propertyType')} className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs">
            <option value="">Any</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Budget Min</label>
          <input {...register('budgetMin')} type="number" className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" placeholder="AED" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Budget Max</label>
          <input {...register('budgetMax')} type="number" className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" placeholder="AED" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Bedrooms</label>
          <input {...register('bedrooms')} type="number" min={0} className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Area Min (m²)</label>
          <input {...register('areaMin')} type="number" className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Area Max (m²)</label>
          <input {...register('areaMax')} type="number" className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          <input {...register('preferredLocation')} className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" placeholder="e.g. Downtown" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Purpose</label>
          <select {...register('purpose')} className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs">
            <option value="">Any</option>
            {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Financing</label>
          <select {...register('financing')} className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs">
            <option value="">Any</option>
            {FINANCING.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <input {...register('notes')} className="mt-1 w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" />
        </div>

        <div className="col-span-2 sm:col-span-3 flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 h-9 px-5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {isSubmitting ? 'Matching…' : 'Find Matches'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PropertyMatchingClient() {
  const [filter, setFilter] = useState<MatchFilter>({ page: 1, limit: 20 })
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useMatchRequests(filter)
  const requests = data?.data ?? []
  const meta     = data?.meta

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Property Matching</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Score and match available units to lead or customer criteria
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Wand2 className="h-4 w-4" />
          {showForm ? 'Close' : 'Run Match'}
        </button>
      </div>

      {/* Run form */}
      {showForm && <RunMatchPanel onDone={() => setShowForm(false)} />}

      {/* How it works */}
      {!showForm && requests.length === 0 && !isLoading && (
        <div className="rounded-xl border border-border bg-muted/20 p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { step: '1', label: 'Enter criteria', desc: 'Provide budget, type, area, location' },
            { step: '2', label: 'Score units',    desc: 'Engine scores all available inventory' },
            { step: '3', label: 'Review results', desc: 'Top 20 matches ranked by score' },
            { step: '4', label: 'Shortlist',      desc: 'Star the best fits to share with customer' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm flex items-center justify-center mx-auto mb-2">
                {s.step}
              </div>
              <p className="font-medium text-sm">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Statuses</option>
          {['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No match requests yet"
          description="Run your first property match to find units that fit a lead's criteria."
        />
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <MatchRequestCard key={req.id} req={req} />
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
    </div>
  )
}
