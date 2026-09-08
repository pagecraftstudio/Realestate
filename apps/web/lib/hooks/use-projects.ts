'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'
import type { Project, Building } from '@/lib/types-20b'

export interface ProjectsFilter {
  page?: number; limit?: number; search?: string
  status?: string; propertyType?: string; city?: string
}

export function useProjects(filter: ProjectsFilter = {}) {
  return useQuery({
    queryKey: ['projects', filter],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Project>>('/api/v1/projects', { params: filter })
      return res.data
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const res = await api.get<Project & { buildings: Building[] }>(`/api/v1/projects/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<Project>('/api/v1/projects', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.patch<Project>(`/api/v1/projects/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
