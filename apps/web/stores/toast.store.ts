import { create } from 'zustand'

export interface ToastItem {
  id:          string
  type?:       'success' | 'error' | 'info'
  title?:      string
  description?: string
  duration?:   number
}

interface ToastState {
  toasts: ToastItem[]
  toast:  (item: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  toast: (item) =>
    set((s) => ({
      toasts: [...s.toasts, { ...item, id: Math.random().toString(36).slice(2) }],
    })),
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Imperative helper — usable outside React
export const toast = (item: Omit<ToastItem, 'id'>) =>
  useToastStore.getState().toast(item)
