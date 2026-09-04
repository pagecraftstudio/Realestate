'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Lead, LeadDetail, PaginatedResponse } from '@/lib/types'

export interface LeadsFilter {
  page?: number
  limit?: number
  search?: string
  status?: string
  source?: string
  temperature?: string
  assignedAgentId?: string
  teamId?: string
  isArchived?: boolean
  overdueFollowup?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function useLeads(filter: LeadsFilter = {}) {
  return useQuery({
    queryKey: ['leads', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Lead>>('/api/v1/leads', { params: filter })
      return res.data
    },
  })
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const res = await api.get<LeadDetail>(`/api/v1/leads/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useLeadStats() {
  return useQuery({
    queryKey: ['leads', 'stats'],
    queryFn: async () => {
      const res = await api.get<{
        total: number
        overdue: number
        byStatus: Record<string, number>
        bySource: Record<string, number>
      }>('/api/v1/leads/stats')
      return res.data
    },
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<{ lead: Lead; duplicate: Lead | null }>('/api/v1/leads', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

export function useUpdateLead(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.patch<Lead>(`/api/v1/leads/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useAssignLead(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { assignedAgentId: string | null; teamId?: string | null }) => {
      const res = await api.patch<Lead>(`/api/v1/leads/${id}/assign`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useLogActivity(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { type: string; payload?: Record<string, unknown> }) => {
      await api.post(`/api/v1/leads/${leadId}/activities`, data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads', leadId] }),
  })
}

export function useArchiveLead(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => api.patch(`/api/v1/leads/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}
