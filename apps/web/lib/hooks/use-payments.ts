'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'
import type { Payment } from '@/lib/types-20c'

export interface PaymentsFilter {
  page?: number
  limit?: number
  dealId?: string
  method?: string
  from?: string
  to?: string
}

export function usePayments(filter: PaymentsFilter = {}) {
  return useQuery({
    queryKey: ['payments', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Payment>>('/api/v1/payments', { params: filter })
      return res.data
    },
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<Payment>('/api/v1/payments', data)
      return res.data
    },
    onSuccess: (_, vars: Record<string, unknown>) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['installments'] })
      if (vars['dealId']) qc.invalidateQueries({ queryKey: ['deals', vars['dealId']] })
    },
  })
}
