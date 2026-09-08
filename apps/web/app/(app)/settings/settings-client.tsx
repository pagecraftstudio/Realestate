'use client'
import { useState, useEffect } from 'react'
import { Settings2, Save, Plus, Trash2 } from 'lucide-react'
import { useOrgSettings, useUpdateOrgSettings, useLeadScoringRules, useUpsertScoringRule } from '@/lib/hooks/use-settings'
import { cn } from '@/lib/utils'

// ─── Org profile section ──────────────────────────────────────────────────────

function OrgSection() {
  const { data: org, isLoading } = useOrgSettings()
  const update = useUpdateOrgSettings()
  const [name,     setName]     = useState('')
  const [currency, setCurrency] = useState('EGP')
  const [timezone, setTimezone] = useState('Africa/Cairo')
  const [notifEmail, setNotifEmail] = useState(false)
  const [notifWa,    setNotifWa]    = useState(false)

  useEffect(() => {
    if (!org) return
    setName(org.name)
    setCurrency(org.settings?.currency ?? 'EGP')
    setTimezone(org.settings?.timezone ?? 'Africa/Cairo')
    setNotifEmail(org.settings?.notificationEmail ?? false)
    setNotifWa(org.settings?.notificationWhatsApp ?? false)
  }, [org])

  async function save() {
    await update.mutateAsync({
      name,
      settings: { currency, timezone, notificationEmail: notifEmail, notificationWhatsApp: notifWa },
    })
  }

  if (isLoading) return <div className="h-32 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-6 space-y-5">
      <h2 className="text-sm font-semibold text-foreground">Organisation Profile</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Organisation name</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Currency</label>
          <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={currency} onChange={e => setCurrency(e.target.value)}>
            {['EGP', 'USD', 'EUR', 'SAR', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Timezone</label>
          <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={timezone} onChange={e => setTimezone(e.target.value)}>
            {['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'UTC'].map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Notifications</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="rounded" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} />
          Email notifications
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="rounded" checked={notifWa} onChange={e => setNotifWa(e.target.checked)} />
          WhatsApp notifications
        </label>
      </div>

      <button onClick={save} disabled={update.isPending}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
        <Save className="h-4 w-4" />
        {update.isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ─── Lead scoring rules section ───────────────────────────────────────────────

function ScoringRulesSection() {
  const { data: rules, isLoading } = useLeadScoringRules()
  const upsert = useUpsertScoringRule()
  const [newSignal, setNewSignal] = useState('')
  const [newPoints, setNewPoints] = useState('10')

  async function addRule() {
    if (!newSignal.trim()) return
    await upsert.mutateAsync({ signal: newSignal.trim(), points: Number(newPoints) })
    setNewSignal(''); setNewPoints('10')
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Lead Scoring Rules</h2>

      {isLoading ? (
        <div className="text-sm text-zinc-400">Loading…</div>
      ) : !rules?.length ? (
        <p className="text-sm text-zinc-400">No scoring rules defined.</p>
      ) : (
        <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">Signal</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">{r.signal}</td>
                  <td className="px-4 py-2">
                    <span className={cn('text-xs font-semibold', r.points > 0 ? 'text-emerald-600' : 'text-red-500')}>
                      {r.points > 0 ? `+${r.points}` : r.points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add rule */}
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Signal</label>
          <input className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            value={newSignal} onChange={e => setNewSignal(e.target.value)} placeholder="e.g. HAS_WHATSAPP" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Points</label>
          <input type="number" className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24"
            value={newPoints} onChange={e => setNewPoints(e.target.value)} />
        </div>
        <button onClick={addRule} disabled={!newSignal.trim() || upsert.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white px-3 py-2 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsClient() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-indigo-500" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Organisation configuration and system preferences</p>
      </div>

      <OrgSection />
      <ScoringRulesSection />
    </div>
  )
}
