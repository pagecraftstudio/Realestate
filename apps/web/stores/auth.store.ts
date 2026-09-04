/**
 * Phase I — Auth store (Supabase session-aware)
 *
 * Initialises by reading the current Supabase session.
 * Subscribes to onAuthStateChange so the store stays in sync with
 * Supabase's own session lifecycle (refresh, sign-out, tab focus).
 *
 * Components import useAuthStore() — same API as before.
 */
'use client'

import { create } from 'zustand'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getMe, type AuthUser } from '@/lib/auth'

interface AuthState {
  user:        AuthUser | null
  loading:     boolean
  initialized: boolean
  setUser:     (user: AuthUser | null) => void
  setLoading:  (v: boolean) => void
  initialize:  () => Promise<void>
  signOut:     () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:        null,
  loading:     true,
  initialized: false,

  setUser:    (user)    => set({ user }),
  setLoading: (loading) => set({ loading }),

  /** Call once on app mount (in a layout or provider component). */
  initialize: async () => {
    if (get().initialized) return

    const supabase = getSupabaseBrowserClient()

    // Load initial session
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      try {
        const me = await getMe()
        set({ user: me, loading: false, initialized: true })
      } catch {
        set({ user: null, loading: false, initialized: true })
      }
    } else {
      set({ user: null, loading: false, initialized: true })
    }

    // Stay in sync with Supabase session events
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ user: null })
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          const me = await getMe()
          set({ user: me })
        } catch {
          set({ user: null })
        }
      }
    })
  },

  signOut: async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    set({ user: null })
  },
}))
