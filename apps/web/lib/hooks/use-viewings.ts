'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'
import type { Viewing } from '@/lib/types-20b'

export interface ViewingsFilter {
  page?: number; limit?: number
  status?: string; agentId?: string
  leadId?: string; customerId?: string
  from?: string; to?: string
}

export function useViewings(filter: ViewingsFilter = {}) {
  return useQuery({
    queryKey: ['viewings', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Viewing>>('/api/v1/viewings', { params: filter })
      return res.data
    },
  })
}

export function useViewing(id: string) {
  return useQuery({
    queryKey: ['viewings', id],
    queryFn: async () => {
      const res = await api.get<Viewing>(`/api/v1/viewings/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateViewing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<Viewing>('/api/v1/viewings', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['viewings'] }),
  })
}

export function useUpdateViewing(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.patch<Viewing>(`/api/v1/viewings/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['viewings', id] })
      qc.invalidateQueries({ queryKey: ['viewings'] })
    },
  })
}

export function useCancelViewing(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => api.patch(`/api/v1/viewings/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['viewings'] }),
  })
}
