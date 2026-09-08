'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface OrgSettings {
  id:       string
  name:     string
  slug:     string
  plan:     string
  status:   string
  settings: {
    currency?:             string
    timezone?:             string
    defaultLeadStatus?:    string
    notificationEmail?:    boolean
    notificationWhatsApp?: boolean
  } | null
}

export interface LeadScoringRule {
  id:     string
  signal: string
  points: number
}

export interface UpdateOrgInput {
  name?:     string
  settings?: OrgSettings['settings']
}

export function useOrgSettings() {
  return useQuery({
    queryKey: ['settings', 'org'],
    queryFn:  async () => {
      const res = await api.get<OrgSettings>('/api/v1/settings/org')
      return res.data
    },
  })
}

export function useUpdateOrgSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateOrgInput) => {
      const res = await api.patch<OrgSettings>('/api/v1/settings/org', input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

export function useLeadScoringRules() {
  return useQuery({
    queryKey: ['settings', 'scoring-rules'],
    queryFn:  async () => {
      const res = await api.get<LeadScoringRule[]>('/api/v1/settings/lead-scoring-rules')
      return res.data
    },
  })
}

export function useUpsertScoringRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rule: Omit<LeadScoringRule, 'id'> & { id?: string }) => {
      const res = rule.id
        ? await api.patch<LeadScoringRule>(`/api/v1/settings/lead-scoring-rules/${rule.id}`, rule)
        : await api.post<LeadScoringRule>('/api/v1/settings/lead-scoring-rules', rule)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'scoring-rules'] }),
  })
}
