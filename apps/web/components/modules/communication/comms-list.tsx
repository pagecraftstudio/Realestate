'use client'
import { useState } from 'react'
import { MessageCircle, Phone, Mail, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { useCommunications, type CommChannel } from '@/lib/hooks/use-comms'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { cn } from '@/lib/utils'

const CHANNEL_ICON: Record<CommChannel, React.ReactNode> = {
  WHATSAPP: <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />,
  EMAIL:    <Mail className="h-3.5 w-3.5 text-blue-500" />,
  CALL:     <Phone className="h-3.5 w-3.5 text-violet-500" />,
  SMS:      <MessageCircle className="h-3.5 w-3.5 text-zinc-400" />,
  NOTE:     <FileText className="h-3.5 w-3.5 text-amber-500" />,
}

const CHANNEL_LABEL: Record<CommChannel, string> = {
  WHATSAPP: 'WhatsApp',
  EMAIL:    'Email',
  CALL:     'Call',
  SMS:      'SMS',
  NOTE:     'Note',
}

const CHANNELS: CommChannel[] = ['WHATSAPP', 'EMAIL', 'CALL', 'SMS', 'NOTE']

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function CommsList() {
  const [filter, setFilter] = useState({ page: 1, limit: 25, channel: '' as string })
  const { data, isLoading } = useCommunications({
    page:    filter.page,
    limit:   filter.limit,
    channel: filter.channel || undefined,
  } as Parameters<typeof useCommunications>[0])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          value={filter.channel}
          onChange={e => setFilter(f => ({ ...f, channel: e.target.value, page: 1 }))}
        >
          <option value="">All Channels</option>
          {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<MessageCircle className="h-8 w-8" />} title="No communications" description="Communication logs appear here." />
      ) : (
        <div className="space-y-2">
          {data.data.map(comm => (
            <div key={comm.id} className="flex gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-card p-4">
              {/* Channel icon */}
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                {CHANNEL_ICON[comm.channel]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{CHANNEL_LABEL[comm.channel]}</span>
                  <span className={cn(
                    'inline-flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5',
                    comm.direction === 'OUTBOUND'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'bg-zinc-100 text-zinc-500',
                  )}>
                    {comm.direction === 'OUTBOUND'
                      ? <ArrowUpRight className="h-3 w-3" />
                      : <ArrowDownLeft className="h-3 w-3" />}
                    {comm.direction}
                  </span>
                  {(comm.lead || comm.customer) && (
                    <span className="text-xs text-zinc-500">
                      → {comm.lead?.fullName ?? comm.customer?.fullName}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-foreground line-clamp-2">{comm.content}</p>
                <p className="mt-1 text-[10px] text-zinc-400">{fmtDate(comm.sentAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <Pagination
          page={filter.page}
          pages={data.meta.pages}
          total={data.meta.total}
          onChange={p => setFilter(f => ({ ...f, page: p }))}
        />
      )}
    </div>
  )
}
