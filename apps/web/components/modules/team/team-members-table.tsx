'use client'
import { useState } from 'react'
import { UserX } from 'lucide-react'
import { useTeamMembers, useDeactivateMember, type UserRole, type UserStatus } from '@/lib/hooks/use-team'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { cn } from '@/lib/utils'

const ROLE_STYLES: Record<UserRole, string> = {
  SUPER_ADMIN:       'bg-red-100 text-red-700',
  COMPANY_ADMIN:     'bg-violet-100 text-violet-700',
  SALES_MANAGER:     'bg-indigo-100 text-indigo-700',
  SALES_AGENT:       'bg-blue-100 text-blue-700',
  MARKETING_MANAGER: 'bg-fuchsia-100 text-fuchsia-700',
  ACCOUNTANT:        'bg-amber-100 text-amber-700',
  PROPERTY_MANAGER:  'bg-teal-100 text-teal-700',
  VIEWER:            'bg-zinc-100 text-zinc-500',
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN:       'Super Admin',
  COMPANY_ADMIN:     'Admin',
  SALES_MANAGER:     'Sales Manager',
  SALES_AGENT:       'Agent',
  MARKETING_MANAGER: 'Marketing',
  ACCOUNTANT:        'Accountant',
  PROPERTY_MANAGER:  'Property Mgr',
  VIEWER:            'Viewer',
}

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-zinc-100 text-zinc-500',
  INVITED:  'bg-amber-100 text-amber-700',
}

function DeactivateBtn({ userId, status }: { userId: string; status: UserStatus }) {
  const [open, setOpen] = useState(false)
  const deactivate = useDeactivateMember(userId)
  if (status !== 'ACTIVE') return null
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded p-1 hover:bg-red-50 text-zinc-400 hover:text-red-500" title="Deactivate">
        <UserX className="h-3.5 w-3.5" />
      </button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title="Deactivate member?" description="They will lose access immediately."
        confirmLabel="Deactivate" danger
        loading={deactivate.isPending}
        onConfirm={() => deactivate.mutateAsync().then(() => setOpen(false))}
      />
    </>
  )
}

const ROLES: (UserRole | '')[] = ['', 'SALES_AGENT', 'SALES_MANAGER', 'COMPANY_ADMIN', 'ACCOUNTANT', 'PROPERTY_MANAGER', 'MARKETING_MANAGER', 'VIEWER']

export function TeamMembersTable() {
  const [filter, setFilter] = useState({ page: 1, limit: 20, role: '' })
  const { data, isLoading } = useTeamMembers({
    page:  filter.page,
    limit: filter.limit,
    role:  filter.role || undefined,
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
          value={filter.role}
          onChange={e => setFilter(f => ({ ...f, role: e.target.value, page: 1 }))}
        >
          <option value="">All Roles</option>
          {ROLES.filter(Boolean).map(r => <option key={r} value={r!}>{ROLE_LABELS[r as UserRole]}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">Loading…</div>
      ) : !data?.data.length ? (
        <EmptyState title="No members" description="Invite your first team member." />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
              <tr>
                {['Member', 'Email', 'Role', 'Status', 'Leads', 'Team', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.data.map(m => (
                <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <AgentAvatar
                      agent={{ id: m.id, profile: m.profile ? { ...m.profile } : null }}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', ROLE_STYLES[m.role])}>
                      {ROLE_LABELS[m.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[m.status])}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{m._count?.assignedLeads ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{m.team?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <DeactivateBtn userId={m.id} status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <Pagination page={filter.page} pages={data.meta.pages} total={data.meta.total}
          onChange={p => setFilter(f => ({ ...f, page: p }))} />
      )}
    </div>
  )
}
