'use client'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Phone, MessageCircle, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { ScoreBadge } from '@/components/shared/score-badge'
import type { Lead } from '@/lib/types'

interface Props {
  leads: Lead[]
  loading?: boolean
}

export function LeadsTable({ leads, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (leads.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Temp</th>
            <th className="px-4 py-3 text-left font-medium">Score</th>
            <th className="px-4 py-3 text-left font-medium">Source</th>
            <th className="px-4 py-3 text-left font-medium">Agent</th>
            <th className="px-4 py-3 text-left font-medium">Follow-up</th>
            <th className="px-4 py-3 text-left font-medium">Created</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {leads.map((lead) => {
            const overdue =
              lead.nextFollowupAt && new Date(lead.nextFollowupAt) < new Date()

            return (
              <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{lead.fullName}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-0.5 hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" />
                        <span className="text-xs">{lead.phone}</span>
                      </a>
                    )}
                    {lead.whatsapp && (
                      <a
                        href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-0.5 text-green-600 hover:text-green-700"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span className="text-xs">WA</span>
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={lead.status} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={lead.temperature} variant="temperature" />
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={lead.leadScore} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lead.source.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3">
                  <AgentAvatar agent={lead.assignedAgent} showName size="sm" />
                </td>
                <td className="px-4 py-3">
                  {lead.nextFollowupAt ? (
                    <span className={overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                      {formatDistanceToNow(new Date(lead.nextFollowupAt), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex items-center text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
