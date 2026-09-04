'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Customer, CustomerDetail, PaginatedResponse } from '@/lib/types'

export interface CustomersFilter {
  page?: number
  limit?: number
  search?: string
  assignedAgentId?: string
}

export function useCustomers(filter: CustomersFilter = {}) {
  return useQuery({
    queryKey: ['customers', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Customer>>('/api/v1/customers', { params: filter })
      return res.data
    },
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const res = await api.get<CustomerDetail>(`/api/v1/customers/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<Customer>('/api/v1/customers', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.patch<Customer>(`/api/v1/customers/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', id] })
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
