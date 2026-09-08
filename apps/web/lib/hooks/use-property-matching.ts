'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PropertyMatchRequest, PaginatedResponse } from '@/lib/types'

export interface MatchFilter {
  page?:       number
  limit?:      number
  leadId?:     string
  customerId?: string
  agentId?:    string
  status?:     string
}

export function useMatchRequests(filter: MatchFilter = {}) {
  return useQuery({
    queryKey: ['match-requests', filter],
    queryFn:  async () => {
      const res = await api.get<PaginatedResponse<PropertyMatchRequest>>(
        '/api/v1/property-matching', { params: filter }
      )
      return res.data
    },
  })
}

export function useMatchRequest(id: string) {
  return useQuery({
    queryKey: ['match-requests', id],
    queryFn:  async () => {
      const res = await api.get<PropertyMatchRequest>(`/api/v1/property-matching/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useRunMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      leadId?: string; customerId?: string
      budgetMin?: number; budgetMax?: number; propertyType?: string
      preferredLocation?: string; bedrooms?: number
      areaMin?: number; areaMax?: number
      purpose?: string; financing?: string; notes?: string
    }) => {
      const res = await api.post<PropertyMatchRequest>('/api/v1/property-matching/run', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['match-requests'] }),
  })
}

export function useShortlistUnit(matchRequestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ unitId, isShortlisted }: { unitId: string; isShortlisted: boolean }) => {
      const res = await api.patch(
        `/api/v1/property-matching/${matchRequestId}/shortlist`,
        { unitId, isShortlisted }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['match-requests', matchRequestId] }),
  })
}
