import { create } from 'zustand'
import { MOCK_ACTIVITIES } from '@/lib/mock-data'
import { fetchActivitiesByDeal, insertActivity } from '@/services/activity.service'
import { supabase } from '@/lib/supabase'
import type { DealActivity, Owner } from '@/types/deal.types'

interface ActivityStore {
  byDeal: Record<string, DealActivity[]>
  fetchForDeal: (dealId: string) => Promise<void>
  addActivity: (
    dealId: string,
    payload: { type: DealActivity['type']; subject: string; body?: string; owner: Owner },
  ) => Promise<DealActivity>
  subscribeRealtime: () => () => void
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  byDeal: MOCK_ACTIVITIES,

  fetchForDeal: async (dealId) => {
    try {
      const activities = await fetchActivitiesByDeal(dealId)
      set((s) => ({ byDeal: { ...s.byDeal, [dealId]: activities } }))
    } catch {
      // keep mock/cached data on error
    }
  },

  addActivity: async (dealId, payload) => {
    const optimistic: DealActivity = {
      id: `opt-${Date.now()}`,
      deal_id: dealId,
      ...payload,
      created_at: new Date().toISOString(),
    }

    set((s) => ({
      byDeal: { ...s.byDeal, [dealId]: [optimistic, ...(s.byDeal[dealId] ?? [])] },
    }))

    try {
      const confirmed = await insertActivity({ deal_id: dealId, ...payload })
      set((s) => ({
        byDeal: {
          ...s.byDeal,
          [dealId]: (s.byDeal[dealId] ?? []).map((a) => (a.id === optimistic.id ? confirmed : a)),
        },
      }))
      return confirmed
    } catch {
      set((s) => ({
        byDeal: {
          ...s.byDeal,
          [dealId]: (s.byDeal[dealId] ?? []).filter((a) => a.id !== optimistic.id),
        },
      }))
      const cached = get().byDeal[dealId] ?? []
      set((s) => ({ byDeal: { ...s.byDeal, [dealId]: cached } }))
      throw new Error('addActivity failed')
    }
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('activities-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deal_activities' },
        (payload) => {
          const activity = payload.new as DealActivity
          const dealId = activity.deal_id
          set((s) => {
            const existing = s.byDeal[dealId] ?? []
            // Skip if already present (optimistic insert from this session)
            if (existing.some((a) => a.id === activity.id)) return s
            return { byDeal: { ...s.byDeal, [dealId]: [activity, ...existing] } }
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'deal_activities' },
        (payload) => {
          const id = (payload.old as { id: string; deal_id: string }).id
          const dealId = (payload.old as { id: string; deal_id: string }).deal_id
          set((s) => {
            const existing = s.byDeal[dealId]
            if (!existing) return s
            return { byDeal: { ...s.byDeal, [dealId]: existing.filter((a) => a.id !== id) } }
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },
}))
