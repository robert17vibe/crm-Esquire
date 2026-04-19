import { create } from 'zustand'
import { MOCK_ACTIVITIES } from '@/lib/mock-data'
import { fetchActivitiesByDeal, insertActivity } from '@/services/activity.service'
import type { DealActivity, Owner } from '@/types/deal.types'

interface ActivityStore {
  byDeal: Record<string, DealActivity[]>
  fetchForDeal: (dealId: string) => Promise<void>
  addActivity: (
    dealId: string,
    payload: { type: DealActivity['type']; subject: string; body?: string; owner: Owner },
  ) => Promise<DealActivity>
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
      // Revert optimistic on error
      set((s) => ({
        byDeal: {
          ...s.byDeal,
          [dealId]: (s.byDeal[dealId] ?? []).filter((a) => a.id !== optimistic.id),
        },
      }))
      // Re-read what was there before
      const cached = get().byDeal[dealId] ?? []
      set((s) => ({ byDeal: { ...s.byDeal, [dealId]: cached } }))
      throw new Error('addActivity failed')
    }
  },
}))
