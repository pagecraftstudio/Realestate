'use client'
import { useState } from 'react'
import { Users, Plus } from 'lucide-react'
import { TeamMembersTable } from '@/components/modules/team/team-members-table'
import { InviteMemberDialog } from '@/components/modules/team/invite-member-dialog'

export function TeamClient() {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" />
            Team
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage members, roles, and teams</p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      <TeamMembersTable />
      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}
