'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'
import type { Offer } from '@/lib/types-20b'

export interface OffersFilter {
  page?: number; limit?: number; status?: string
  agentId?: string; leadId?: string; customerId?: string
}

export function useOffers(filter: OffersFilter = {}) {
  return useQuery({
    queryKey: ['offers', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Offer>>('/api/v1/offers', { params: filter })
      return res.data
    },
  })
}

export function useCreateOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<Offer>('/api/v1/offers', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  })
}

export function useUpdateOfferStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch<Offer>(`/api/v1/offers/${id}/status`, { status })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  })
}
