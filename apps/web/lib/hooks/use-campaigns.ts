'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Campaign, CampaignDetail, CampaignStats, PaginatedResponse } from '@/lib/types'

export interface CampaignsFilter {
  page?:     number
  limit?:    number
  source?:   string
  isActive?: boolean
  search?:   string
}

export function useCampaigns(filter: CampaignsFilter = {}) {
  return useQuery({
    queryKey: ['campaigns', filter],
    queryFn:  async () => {
      const res = await api.get<PaginatedResponse<Campaign>>('/api/v1/campaigns', { params: filter })
      return res.data
    },
  })
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn:  async () => {
      const res = await api.get<CampaignDetail>(`/api/v1/campaigns/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCampaignStats(id: string) {
  return useQuery({
    queryKey: ['campaigns', id, 'stats'],
    queryFn:  async () => {
      const res = await api.get<CampaignStats>(`/api/v1/campaigns/${id}/stats`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name: string; source: string; description?: string; budget?: number
      startDate?: string; endDate?: string; isActive?: boolean
    }) => {
      const res = await api.post<Campaign>('/api/v1/campaigns', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<{
      name: string; source: string; description: string; budget: number
      startDate: string; endDate: string; isActive: boolean
    }>) => {
      const res = await api.patch<Campaign>(`/api/v1/campaigns/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', id] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/campaigns/${id}`)
      return id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}
