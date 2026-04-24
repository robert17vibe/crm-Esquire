import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type NotifType = 'info' | 'warning' | 'urgent' | 'announcement'

export interface TeamNotification {
  id: string
  created_by: string | null
  title: string
  body?: string | null
  type: NotifType
  team_id?: string | null
  created_at: string
  expires_at?: string | null
  archived_at?: string | null
}

interface TeamNotifStore {
  notifications: TeamNotification[]
  readIds: Set<string>
  isLoading: boolean
  fetch: () => Promise<void>
  create: (payload: { title: string; body?: string; type: NotifType; team_id?: string | null; expires_at?: string | null }) => Promise<void>
  archive: (id: string) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  subscribeRealtime: () => () => void
}

export const useTeamNotificationStore = create<TeamNotifStore>((set, get) => ({
  notifications: [],
  readIds: new Set(),
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true })
    const [{ data: notifs }, { data: reads }] = await Promise.all([
      supabase.from('team_notifications').select('*').order('created_at', { ascending: false }),
      supabase.from('notification_reads').select('notification_id'),
    ])
    set({
      notifications: (notifs ?? []) as TeamNotification[],
      readIds: new Set((reads ?? []).map((r: { notification_id: string }) => r.notification_id)),
      isLoading: false,
    })
  },

  create: async (payload) => {
    const { data: me } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('team_notifications')
      .insert({ ...payload, created_by: me?.user?.id })
      .select()
      .single()
    if (data) set((s) => ({ notifications: [data as TeamNotification, ...s.notifications] }))
  },

  archive: async (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }))
    await supabase.from('team_notifications').update({ archived_at: new Date().toISOString() }).eq('id', id)
  },

  markRead: async (id) => {
    set((s) => { const next = new Set(s.readIds); next.add(id); return { readIds: next } })
    await supabase.from('notification_reads').upsert({ notification_id: id, user_id: (await supabase.auth.getUser()).data.user?.id })
  },

  markAllRead: async () => {
    const { notifications, readIds } = get()
    const unread = notifications.filter((n) => !readIds.has(n.id))
    set((s) => { const next = new Set(s.readIds); unread.forEach((n) => next.add(n.id)); return { readIds: next } })
    const uid = (await supabase.auth.getUser()).data.user?.id
    if (!uid) return
    await supabase.from('notification_reads').upsert(unread.map((n) => ({ notification_id: n.id, user_id: uid })))
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('team-notifications-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_notifications' }, (payload) => {
        const n = payload.new as TeamNotification
        set((s) => ({ notifications: [n, ...s.notifications] }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_notifications' }, (payload) => {
        const n = payload.new as TeamNotification
        set((s) => ({
          notifications: n.archived_at
            ? s.notifications.filter((x) => x.id !== n.id)
            : s.notifications.map((x) => x.id === n.id ? n : x),
        }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}))
