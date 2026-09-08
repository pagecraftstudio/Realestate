'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskStatus   = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

export interface Task {
  id:          string
  organizationId: string
  assigneeId:  string | null
  relatedType: string | null
  relatedId:   string | null
  title:       string
  description: string | null
  dueAt:       string | null
  priority:    TaskPriority
  status:      TaskStatus
  createdAt:   string
  updatedAt:   string
  assignee:    { id: string; profile: { firstName: string | null; lastName: string | null } | null } | null
}

export interface TasksFilter {
  page?:       number
  limit?:      number
  assigneeId?: string
  status?:     TaskStatus
  priority?:   TaskPriority
  relatedType?: string
  relatedId?:  string
  search?:     string
  overdue?:    boolean
}

export interface CreateTaskInput {
  title:       string
  description?: string
  assigneeId?: string
  relatedType?: string
  relatedId?:  string
  dueAt?:      string
  priority?:   TaskPriority
}

export function useTasks(filter: TasksFilter = {}) {
  return useQuery({
    queryKey: ['tasks', filter],
    queryFn:  async () => {
      const res = await api.get<PaginatedResponse<Task>>('/api/v1/tasks', { params: filter })
      return res.data
    },
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn:  async () => {
      const res = await api.get<Task>(`/api/v1/tasks/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const res = await api.post<Task>('/api/v1/tasks', input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<CreateTaskInput & { status: TaskStatus }>) => {
      const res = await api.patch<Task>(`/api/v1/tasks/${id}`, input)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', id] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useCompleteTask(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<Task>(`/api/v1/tasks/${id}/complete`)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', id] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/api/v1/tasks/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
