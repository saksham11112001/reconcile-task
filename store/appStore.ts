import { create } from 'zustand'
import type { AppSession } from '@/types'

// ─── App store ─────────────────────────────────────────────────

interface AppState {
  session:        AppSession | null
  sidebarOpen:    boolean
  setSession:     (s: AppSession) => void
  clearSession:   () => void
  setSidebarOpen: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  session:        null,
  sidebarOpen:    true,
  setSession:     (s) => set({ session: s }),
  clearSession:   ()  => set({ session: null }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}))

// ─── Toast store ───────────────────────────────────────────────

interface Toast { id: string; type: 'success' | 'error' | 'info'; message: string }

interface ToastState {
  toasts: Toast[]
  push:   (t: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2)
    set(s => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(x => x.id !== id) })), 3500)
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(x => x.id !== id) })),
}))

export const toast = {
  success: (message: string) => useToastStore.getState().push({ type: 'success', message }),
  error:   (message: string) => useToastStore.getState().push({ type: 'error',   message }),
  info:    (message: string) => useToastStore.getState().push({ type: 'info',     message }),
}
