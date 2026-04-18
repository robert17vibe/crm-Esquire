import { create } from 'zustand'
import { fetchActivitiesByDeal, insertActivity } from '@/services/activity.service'
import { MOCK_ACTIVITIES } from '@/lib/mock-data'
import type { DealActivity, Owner } from '@/types/deal.types'

interface ActivityStore {
  byDeal: Record<string, DealActivity[]>
  loading: Record<string, boolean>
  fetchForDeal: (dealId: string) => Promise<void>
  addActivity: (
    dealId: string,
    payload: { type: DealActivity['type']; subject: string; body?: string; owner: Owner },
  ) => Promise<DealActivity>
}

export const useActivityStore = create<ActivityStore>((set) => ({
  byDeal:  MOCK_ACTIVITIES,
  loading: {},

  fetchForDeal: async (dealId) => {
    set((s) => ({ loading: { ...s.loading, [dealId]: true } }))
    try {
      const remote = await fetchActivitiesByDeal(dealId)
      if (remote.length > 0) {
        set((s) => ({ byDeal: { ...s.byDeal, [dealId]: remote } }))
      }
    } catch {
      // remote unavailable — keep mock activities
    } finally {
      set((s) => ({ loading: { ...s.loading, [dealId]: false } }))
    }
  },

  addActivity: async (dealId, payload) => {
    const activity = await insertActivity({ deal_id: dealId, ...payload })
    set((s) => ({
      byDeal: { ...s.byDeal, [dealId]: [activity, ...(s.byDeal[dealId] ?? [])] },
    }))
    return activity
  },
}))
