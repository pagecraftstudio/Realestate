'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse, Deal } from '@/lib/types'
import type { DealDetail } from '@/lib/types-20c'

export interface DealsFilter {
  page?: number
  limit?: number
  status?: string
  pipelineStage?: string
  agentId?: string
  customerId?: string
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export function useDeals(filter: DealsFilter = {}) {
  return useQuery({
    queryKey: ['deals', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Deal>>('/api/v1/deals', { params: filter })
      return res.data
    },
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: async () => {
      const res = await api.get<DealDetail>(`/api/v1/deals/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useUpdateDealStage(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pipelineStage: string) => {
      const res = await api.patch<Deal>(`/api/v1/deals/${id}`, { pipelineStage })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useUpdateDealStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch<Deal>(`/api/v1/deals/${id}`, { status })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}
