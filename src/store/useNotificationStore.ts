import { create } from 'zustand'

export type NotificationType = 'new_deal' | 'overdue_activity' | 'sla_breach'

export interface AppNotification {
  id: string
  dealId: string
  dealName: string
  type: NotificationType
  createdAt: string
  read: boolean
  meta?: string
}

const KEY = 'esq_notifications_v2'

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
  addNotification: (dealId: string, dealName: string, type?: NotificationType, meta?: string) => void
  addAlertIfNew: (dealId: string, dealName: string, type: NotificationType, meta?: string) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearByDeal: (dealId: string) => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: load(),

  addNotification: (dealId, dealName, type = 'new_deal', meta) => {
    const n: AppNotification = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      dealId, dealName, type, meta,
      createdAt: new Date().toISOString(),
      read: false,
    }
    const next = [n, ...get().notifications].slice(0, 60)
    set({ notifications: next })
    persist(next)
  },

  // Only adds alert if there's no existing unread alert of same type for this deal
  addAlertIfNew: (dealId, dealName, type, meta) => {
    const existing = get().notifications.find(
      (n) => n.dealId === dealId && n.type === type && !n.read,
    )
    if (existing) return
    const n: AppNotification = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      dealId, dealName, type, meta,
      createdAt: new Date().toISOString(),
      read: false,
    }
    const next = [n, ...get().notifications].slice(0, 60)
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
