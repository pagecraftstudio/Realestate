'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'
import type { Commission } from '@/lib/types-20c'

export interface CommissionsFilter {
  page?: number
  limit?: number
  status?: string
  agentId?: string
  dealId?: string
}

export function useCommissions(filter: CommissionsFilter = {}) {
  return useQuery({
    queryKey: ['commissions', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Commission>>('/api/v1/commissions', { params: filter })
      return res.data
    },
  })
}

export function useApproveCommission(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch<Commission>(`/api/v1/commissions/${id}/approve`)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  })
}

export function useMarkCommissionPaid(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { paidAt?: string; notes?: string }) => {
      const res = await api.patch<Commission>(`/api/v1/commissions/${id}/pay`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  })
}

export function useBulkApproveCommissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post('/api/v1/commissions/bulk-approve', { ids })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  })
}
