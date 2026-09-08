'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Contract, PaginatedResponse } from '@/lib/types'

export interface ContractsFilter {
  page?:         number
  limit?:        number
  customerId?:   string
  dealId?:       string
  agentId?:      string
  status?:       string
  contractType?: string
}

export function useContracts(filter: ContractsFilter = {}) {
  return useQuery({
    queryKey: ['contracts', filter],
    queryFn:  async () => {
      const res = await api.get<PaginatedResponse<Contract>>('/api/v1/contracts', { params: filter })
      return res.data
    },
  })
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn:  async () => {
      const res = await api.get<Contract>(`/api/v1/contracts/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      dealId: string; contractType?: string; contractDate?: string
      handoverDate?: string; expiresAt?: string; totalValue: number
      currency?: string; terms?: string; notes?: string; documentUrl?: string
    }) => {
      const res = await api.post<Contract>('/api/v1/contracts', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}

export function useUpdateContract(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<{
      contractDate: string; handoverDate: string; expiresAt: string
      totalValue: number; terms: string; notes: string
      documentUrl: string; signatureUrl: string
    }>) => {
      const res = await api.patch<Contract>(`/api/v1/contracts/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts', id] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}

export function useUpdateContractStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const res = await api.patch<Contract>(`/api/v1/contracts/${id}/status`, { status, reason })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts', id] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}

export function useDeleteContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/contracts/${id}`)
      return id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}
