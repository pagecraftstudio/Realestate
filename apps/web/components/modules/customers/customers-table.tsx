'use client'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Phone, ChevronRight } from 'lucide-react'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import type { Customer } from '@/lib/types'

interface Props { customers: Customer[] }

export function CustomersTable({ customers }: Props) {
  if (customers.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">Contact</th>
            <th className="px-4 py-3 text-left font-medium">Location</th>
            <th className="px-4 py-3 text-left font-medium">Agent</th>
            <th className="px-4 py-3 text-left font-medium">Since</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{c.fullName}</div>
                {c.nationality && <div className="text-xs text-muted-foreground">{c.nationality}</div>}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <div className="flex flex-col gap-0.5">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-foreground">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </a>
                  )}
                  {c.email && <span className="text-xs">{c.email}</span>}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {[c.city, c.country].filter(Boolean).join(', ') || '—'}
              </td>
              <td className="px-4 py-3">
                <AgentAvatar agent={c.assignedAgent} showName size="sm" />
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
              </td>
              <td className="px-4 py-3">
                <Link href={`/customers/${c.id}`} className="text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
