import { create } from 'zustand'

export interface AppNotification {
  id: string
  dealId: string
  dealName: string
  type: 'new_deal'
  createdAt: string
  read: boolean
}

const KEY = 'esq_notifications_v1'

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as AppNotification[]) : []
  } catch { return [] }
}

function persist(ns: AppNotification[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ns)) } catch { /* ignore */ }
}

interface NotificationStore {
  notifications: AppNotification[]
  addNotification: (dealId: string, dealName: string) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearByDeal: (dealId: string) => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: load(),

  addNotification: (dealId, dealName) => {
    const n: AppNotification = {
      id: `n-${Date.now()}`,
      dealId,
      dealName,
      type: 'new_deal',
      createdAt: new Date().toISOString(),
      read: false,
    }
    const next = [n, ...get().notifications].slice(0, 50)
    set({ notifications: next })
    persist(next)
  },

  markRead: (id) => {
    const next = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    set({ notifications: next })
    persist(next)
  },

  markAllRead: () => {
    const next = get().notifications.map((n) => ({ ...n, read: true }))
    set({ notifications: next })
    persist(next)
  },

  clearByDeal: (dealId) => {
    const next = get().notifications.map((n) =>
      n.dealId === dealId ? { ...n, read: true } : n,
    )
    set({ notifications: next })
    persist(next)
  },
}))
