'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'
import type { Unit } from '@/lib/types-20b'

export interface UnitsFilter {
  page?: number; limit?: number; search?: string
  status?: string; unitType?: string; projectId?: string
  buildingId?: string; bedrooms?: number
  priceMin?: number; priceMax?: number
  sortBy?: string; sortDir?: 'asc' | 'desc'
}

export function useUnits(filter: UnitsFilter = {}) {
  return useQuery({
    queryKey: ['units', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Unit>>('/api/v1/units', { params: filter })
      return res.data
    },
  })
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: ['units', id],
    queryFn: async () => {
      const res = await api.get<Unit>(`/api/v1/units/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<Unit>('/api/v1/units', data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateUnit(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.patch<Unit>(`/api/v1/units/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units', id] })
      qc.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useUpdateUnitStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch<Unit>(`/api/v1/units/${id}/status`, { status })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units', id] })
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
