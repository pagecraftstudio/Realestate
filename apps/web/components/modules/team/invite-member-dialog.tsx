'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useInviteMember, type UserRole } from '@/lib/hooks/use-team'

const ROLES: UserRole[] = [
  'COMPANY_ADMIN', 'SALES_MANAGER', 'SALES_AGENT',
  'MARKETING_MANAGER', 'ACCOUNTANT', 'PROPERTY_MANAGER', 'VIEWER',
]

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN:       'Super Admin',
  COMPANY_ADMIN:     'Company Admin',
  SALES_MANAGER:     'Sales Manager',
  SALES_AGENT:       'Sales Agent',
  MARKETING_MANAGER: 'Marketing Manager',
  ACCOUNTANT:        'Accountant',
  PROPERTY_MANAGER:  'Property Manager',
  VIEWER:            'Viewer',
}

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
}

export function InviteMemberDialog({ open, onOpenChange }: Props) {
  const invite = useInviteMember()
  const [email, setEmail]   = useState('')
  const [role,  setRole]    = useState<UserRole>('SALES_AGENT')
  const [first, setFirst]   = useState('')
  const [last,  setLast]    = useState('')

  async function submit() {
    if (!email.trim()) return
    await invite.mutateAsync({ email: email.trim(), role, firstName: first || undefined, lastName: last || undefined })
    setEmail(''); setRole('SALES_AGENT'); setFirst(''); setLast('')
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card border border-border p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold text-foreground">Invite Team Member</Dialog.Title>
            <Dialog.Close className="rounded-md p-1 hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">First name</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={first} onChange={e => setFirst(e.target.value)} placeholder="Ahmed" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last name</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={last} onChange={e => setLast(e.target.value)} placeholder="Hassan" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email *</label>
              <input type="email" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@company.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role *</label>
              <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={role} onChange={e => setRole(e.target.value as UserRole)}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancel</Dialog.Close>
            <button onClick={submit} disabled={!email.trim() || invite.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {invite.isPending ? 'Inviting…' : 'Send Invite'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
