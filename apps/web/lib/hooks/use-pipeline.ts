'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Deal, PaginatedResponse } from '@/lib/types'

export interface PipelineFilter {
  page?: number
  limit?: number
  status?: string
  agentId?: string
}

export function usePipeline(filter: PipelineFilter = {}) {
  return useQuery({
    queryKey: ['pipeline', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Deal>>('/api/v1/deals', { params: { ...filter, limit: 200 } })
      return res.data
    },
  })
}

export function useMoveDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, pipelineStage }: { id: string; pipelineStage: string }) => {
      const res = await api.patch<Deal>(`/api/v1/deals/${id}`, { pipelineStage })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  })
}
