'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'
import type { Installment } from '@/lib/types-20c'

export interface InstallmentsFilter {
  page?: number
  limit?: number
  dealId?: string
  status?: string
  overdueOnly?: boolean
  from?: string
  to?: string
}

export function useInstallments(filter: InstallmentsFilter = {}) {
  return useQuery({
    queryKey: ['installments', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Installment>>('/api/v1/installments', { params: filter })
      return res.data
    },
  })
}

export function useMarkInstallmentPaid(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { paidAmount?: number; paidAt?: string; notes?: string }) => {
      const res = await api.patch<Installment>(`/api/v1/installments/${id}/pay`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installments'] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}
