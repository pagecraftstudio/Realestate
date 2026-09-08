'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'

export type CommChannel   = 'WHATSAPP' | 'EMAIL' | 'CALL' | 'SMS' | 'NOTE'
export type CommDirection = 'INBOUND' | 'OUTBOUND'

export interface Communication {
  id:             string
  organizationId: string
  leadId:         string | null
  customerId:     string | null
  channel:        CommChannel
  direction:      CommDirection
  content:        string
  sentAt:         string
  createdAt:      string
  lead:     { id: string; fullName: string } | null
  customer: { id: string; fullName: string } | null
  sender:   { id: string; profile: { firstName: string | null; lastName: string | null } | null } | null
}

export interface CommsFilter {
  page?:       number
  limit?:      number
  leadId?:     string
  customerId?: string
  channel?:    CommChannel
  direction?:  CommDirection
  search?:     string
}

export interface SendWhatsAppInput {
  leadId?:     string
  customerId?: string
  phone:       string
  message:     string
}

export interface LogCommInput {
  leadId?:     string
  customerId?: string
  channel:     CommChannel
  direction:   CommDirection
  content:     string
  sentAt?:     string
}

export function useCommunications(filter: CommsFilter = {}) {
  return useQuery({
    queryKey: ['comms', filter],
    queryFn:  async () => {
      const res = await api.get<PaginatedResponse<Communication>>('/api/v1/communications', { params: filter })
      return res.data
    },
  })
}

export function useSendWhatsApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SendWhatsAppInput) => {
      const res = await api.post<Communication>('/api/v1/communications/whatsapp/send', input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comms'] }),
  })
}

export function useLogCommunication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: LogCommInput) => {
      const res = await api.post<Communication>('/api/v1/communications', input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comms'] }),
  })
}
