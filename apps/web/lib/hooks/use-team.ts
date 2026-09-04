'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'

export type UserRole =
  | 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SALES_MANAGER'
  | 'SALES_AGENT' | 'MARKETING_MANAGER' | 'ACCOUNTANT'
  | 'PROPERTY_MANAGER' | 'VIEWER'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'INVITED'

export interface TeamMember {
  id:     string
  email:  string
  role:   UserRole
  status: UserStatus
  createdAt: string
  profile: {
    firstName: string | null
    lastName:  string | null
    phone:     string | null
    avatarUrl: string | null
  } | null
  team: { id: string; name: string } | null
  _count?: { assignedLeads: number; agentDeals?: number; agentViewings?: number }
}

export interface Team {
  id:   string
  name: string
  description: string | null
  managerId: string | null
  _count: { members: number; leads: number }
  manager: { id: string; profile: { firstName: string | null; lastName: string | null } | null } | null
}

export interface InviteMemberInput {
  email:  string
  role:   UserRole
  teamId?: string
  firstName?: string
  lastName?:  string
}

export interface CreateTeamInput {
  name:        string
  description?: string
  managerId?:  string
}

// ─── Members ──────────────────────────────────────────────────────────────────

export function useTeamMembers(filter: { page?: number; limit?: number; role?: string; status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ['team-members', filter],
    queryFn:  async () => {
      const res = await api.get<PaginatedResponse<TeamMember>>('/api/v1/users', { params: filter })
      return res.data
    },
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const res = await api.post<TeamMember>('/api/v1/users/invite', input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

export function useUpdateMemberRole(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (role: UserRole) => {
      const res = await api.patch<TeamMember>(`/api/v1/users/${userId}`, { role })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

export function useDeactivateMember(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<TeamMember>(`/api/v1/users/${userId}/deactivate`)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn:  async () => {
      const res = await api.get<PaginatedResponse<Team>>('/api/v1/teams')
      return res.data
    },
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTeamInput) => {
      const res = await api.post<Team>('/api/v1/teams', input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  })
}
