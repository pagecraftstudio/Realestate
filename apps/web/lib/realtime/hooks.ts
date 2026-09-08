/**
 * React hooks for Supabase Realtime subscriptions.
 * Each hook subscribes on mount, cleans up on unmount.
 *
 * Usage:
 *   useNotificationRealtime(orgId, userId, (n) => showToast(n.title))
 *   useLeadRealtime(orgId, { onUpdate: (l) => queryClient.invalidateQueries(['leads']) })
 *   useUnitAvailabilityRealtime(orgId, (u) => queryClient.invalidateQueries(['units']))
 */
'use client'

import { useEffect } from 'react'
import {
  subscribeToNotifications,
  subscribeToLeads,
  subscribeToUnitAvailability,
  type RealtimeNotification,
  type RealtimeLeadUpdate,
  type RealtimeUnitUpdate,
} from './subscriptions'

// ─── Notifications ─────────────────────────────────────────────────────────────

export function useNotificationRealtime(
  organizationId: string | undefined,
  userId:         string | undefined,
  onInsert:       (notification: RealtimeNotification) => void,
) {
  useEffect(() => {
    if (!organizationId || !userId) return
    const unsub = subscribeToNotifications(organizationId, userId, onInsert)
    return unsub
  }, [organizationId, userId, onInsert])
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export function useLeadRealtime(
  organizationId: string | undefined,
  callbacks: {
    onInsert?: (lead: RealtimeLeadUpdate) => void
    onUpdate?: (lead: RealtimeLeadUpdate) => void
  },
  options?: { agentId?: string },
) {
  useEffect(() => {
    if (!organizationId) return
    const unsub = subscribeToLeads(organizationId, callbacks, options)
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, options?.agentId])
}

// ─── Unit availability ────────────────────────────────────────────────────────

export function useUnitAvailabilityRealtime(
  organizationId: string | undefined,
  onUpdate:        (unit: RealtimeUnitUpdate) => void,
  options?:        { projectId?: string },
) {
  useEffect(() => {
    if (!organizationId) return
    const unsub = subscribeToUnitAvailability(organizationId, onUpdate, options)
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, options?.projectId])
}
