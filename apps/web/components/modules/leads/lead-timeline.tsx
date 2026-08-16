'use client'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Phone, MessageCircle, Mail, FileText, UserCheck, Calendar, Plus } from 'lucide-react'
import { useLogActivity } from '@/lib/hooks/use-leads'
import type { LeadActivity } from '@/lib/types'

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  CALL_LOGGED:        <Phone className="h-3.5 w-3.5" />,
  WHATSAPP_SENT:      <MessageCircle className="h-3.5 w-3.5 text-green-500" />,
  EMAIL_SENT:         <Mail className="h-3.5 w-3.5" />,
  NOTE_ADDED:         <FileText className="h-3.5 w-3.5" />,
  ASSIGNED:           <UserCheck className="h-3.5 w-3.5" />,
  VIEWING_SCHEDULED:  <Calendar className="h-3.5 w-3.5" />,
  STATUS_CHANGED:     <span className="text-xs">↔</span>,
  CREATED:            <Plus className="h-3.5 w-3.5" />,
}

const ACTIVITY_LABEL: Record<string, string> = {
  CALL_LOGGED: 'Call logged', WHATSAPP_SENT: 'WhatsApp sent',
  EMAIL_SENT: 'Email sent', NOTE_ADDED: 'Note added',
  ASSIGNED: 'Assigned', VIEWING_SCHEDULED: 'Viewing scheduled',
  STATUS_CHANGED: 'Status changed', CREATED: 'Lead created',
  MEETING_LOGGED: 'Meeting logged', OFFER_CREATED: 'Offer created',
  ARCHIVED: 'Archived', UNIT_SAVED: 'Unit saved',
  CUSTOM: 'Activity',
}

const LOG_TYPES = [
  { value: 'CALL_LOGGED', label: 'Log Call' },
  { value: 'WHATSAPP_SENT', label: 'WhatsApp Sent' },
  { value: 'EMAIL_SENT', label: 'Email Sent' },
  { value: 'MEETING_LOGGED', label: 'Log Meeting' },
  { value: 'NOTE_ADDED', label: 'Add Note' },
]

interface Props {
  leadId: string
  activities: LeadActivity[]
}

export function LeadTimeline({ leadId, activities }: Props) {
  const [type, setType] = useState('NOTE_ADDED')
  const [note, setNote] = useState('')
  const log = useLogActivity(leadId)

  const submit = async () => {
    if (!note.trim()) return
    await log.mutateAsync({ type, payload: { note } })
    setNote('')
  }

  return (
    <div className="space-y-4">
      {/* Log activity */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-3">Log Activity</p>
        <div className="flex gap-2 mb-2 flex-wrap">
          {LOG_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                type === t.value
                  ? 'bg-indigo-600 text-white'
                  : 'border border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={submit}
            disabled={log.isPending || !note.trim()}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {log.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {activities.map((activity, i) => {
          const agentName = activity.actor?.profile
            ? `${activity.actor.profile.firstName ?? ''} ${activity.actor.profile.lastName ?? ''}`.trim()
            : 'System'
          const payload = activity.payload as Record<string, string>

          return (
            <div key={activity.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  {ACTIVITY_ICONS[activity.type] ?? <span className="text-xs">•</span>}
                </div>
                {i < activities.length - 1 && (
                  <div className="flex-1 w-px bg-border mt-1" />
                )}
              </div>
              <div className="pb-4 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {ACTIVITY_LABEL[activity.type] ?? activity.type}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {payload?.note && (
                  <p className="mt-1 text-sm text-muted-foreground">{payload.note}</p>
                )}
                {activity.type === 'STATUS_CHANGED' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {payload.from} → {payload.to}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{agentName}</p>
              </div>
            </div>
          )
        })}
        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No activities yet</p>
        )}
      </div>
    </div>
  )
}
