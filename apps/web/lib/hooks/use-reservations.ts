'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'
import type { Reservation } from '@/lib/types-20b'

export interface ReservationsFilter {
  page?: number; limit?: number; status?: string; agentId?: string
}

export function useReservations(filter: ReservationsFilter = {}) {
  return useQuery({
    queryKey: ['reservations', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Reservation>>('/api/v1/reservations', { params: filter })
      return res.data
    },
  })
}

export function useCreateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<Reservation>('/api/v1/reservations', data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useCancelReservation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (reason?: string) => api.patch(`/api/v1/reservations/${id}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['units'] })
    },
  })
}
