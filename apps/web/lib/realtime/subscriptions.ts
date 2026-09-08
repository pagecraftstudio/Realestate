/**
 * Phase J — Supabase Realtime subscriptions
 *
 * Enabled only for tables where realtime delivers product value:
 *   - notifications      → badge count / toast alerts
 *   - leads              → lead assignment, status changes visible to team
 *   - units              → availability changes (AVAILABLE/RESERVED/SOLD)
 *
 * NOT enabled for: audit_logs, installments, payments, commissions
 * (these are write-heavy but not UI-critical for realtime updates).
 *
 * Usage:
 *   const unsub = subscribeToNotifications(orgId, userId, (row) => { ... })
 *   // cleanup
 *   unsub()
 *
 * Channels are namespaced per org so tenants never receive cross-org events.
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload } from '@supabase/supabase-js'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RealtimeNotification {
  id:              string
  organization_id: string
  user_id:         string
  type:            string
  title:           string
  body:            string | null
  is_read:         boolean
  created_at:      string
}

export interface RealtimeLeadUpdate {
  id:                string
  organization_id:   string
  full_name:         string
  status:            string
  assigned_agent_id: string | null
  temperature:       string | null
  updated_at:        string
}

export interface RealtimeUnitUpdate {
  id:              string
  organization_id: string
  unit_number:     string
  status:          string   // AVAILABLE | RESERVED | SOLD | HOLD
  project_id:      string
  building_id:     string
  updated_at:      string
}

// ─── Notifications ─────────────────────────────────────────────────────────────

/**
 * Subscribe to new notifications for the current user.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  organizationId: string,
  userId:         string,
  onInsert:       (notification: RealtimeNotification) => void,
): () => void {
  const supabase = getSupabaseBrowserClient()

  const channel = supabase
    .channel(`notifications:org=${organizationId}:user=${userId}`)
    .on<RealtimeNotification>(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `organization_id=eq.${organizationId}`,
      },
      (payload: RealtimePostgresInsertPayload<RealtimeNotification>) => {
        // Only fire for this user's notifications
        if (payload.new.user_id === userId) {
          onInsert(payload.new)
        }
      },
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ─── Lead updates ─────────────────────────────────────────────────────────────

/**
 * Subscribe to lead INSERT and UPDATE events for an org.
 * Useful for sales managers watching pipeline in real-time.
 *
 * Granular control: pass `agentId` to scope to a specific agent's leads.
 */
export function subscribeToLeads(
  organizationId: string,
  callbacks: {
    onInsert?: (lead: RealtimeLeadUpdate) => void
    onUpdate?: (lead: RealtimeLeadUpdate) => void
  },
  options?: { agentId?: string },
): () => void {
  const supabase = getSupabaseBrowserClient()
  const channelId = options?.agentId
    ? `leads:org=${organizationId}:agent=${options.agentId}`
    : `leads:org=${organizationId}`

  let ch = supabase.channel(channelId)

  if (callbacks.onInsert) {
    ch = ch.on<RealtimeLeadUpdate>(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'leads',
        filter: `organization_id=eq.${organizationId}`,
      },
      (payload: RealtimePostgresInsertPayload<RealtimeLeadUpdate>) => {
        if (!options?.agentId || payload.new.assigned_agent_id === options.agentId) {
          callbacks.onInsert!(payload.new)
        }
      },
    )
  }

  if (callbacks.onUpdate) {
    ch = ch.on<RealtimeLeadUpdate>(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'leads',
        filter: `organization_id=eq.${organizationId}`,
      },
      (payload: RealtimePostgresUpdatePayload<RealtimeLeadUpdate>) => {
        if (!options?.agentId || payload.new.assigned_agent_id === options.agentId) {
          callbacks.onUpdate!(payload.new)
        }
      },
    )
  }

  ch.subscribe()
  return () => { supabase.removeChannel(ch) }
}

// ─── Unit availability ────────────────────────────────────────────────────────

/**
 * Subscribe to unit status changes for an org (or a specific project).
 * Critical for preventing double-reservations in the UI — agents see
 * units flip to RESERVED/SOLD in real-time without polling.
 */
export function subscribeToUnitAvailability(
  organizationId: string,
  onUpdate:        (unit: RealtimeUnitUpdate) => void,
  options?:        { projectId?: string },
): () => void {
  const supabase = getSupabaseBrowserClient()
  const channelId = options?.projectId
    ? `units:org=${organizationId}:project=${options.projectId}`
    : `units:org=${organizationId}`

  const filter = options?.projectId
    ? `organization_id=eq.${organizationId}`   // filter by org; project checked below
    : `organization_id=eq.${organizationId}`

  const channel = supabase
    .channel(channelId)
    .on<RealtimeUnitUpdate>(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'units',
        filter,
      },
      (payload: RealtimePostgresUpdatePayload<RealtimeUnitUpdate>) => {
        if (!options?.projectId || payload.new.project_id === options.projectId) {
          onUpdate(payload.new)
        }
      },
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
