import { create } from 'zustand'
import { MOCK_ACTIVITIES } from '@/lib/mock-data'
import type { DealActivity, Owner } from '@/types/deal.types'

interface ActivityStore {
  byDeal: Record<string, DealActivity[]>
  fetchForDeal: (dealId: string) => void
  addActivity: (
    dealId: string,
    payload: { type: DealActivity['type']; subject: string; body?: string; owner: Owner },
  ) => DealActivity
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  byDeal: MOCK_ACTIVITIES,

  fetchForDeal: (_dealId) => {
    // mock data already loaded in initial state — no-op
  },

  addActivity: (dealId, payload) => {
    const activity: DealActivity = {
      id: `a-${Date.now()}`,
      deal_id: dealId,
      ...payload,
      created_at: new Date().toISOString(),
    }
    set((s) => ({
      byDeal: { ...s.byDeal, [dealId]: [activity, ...(s.byDeal[dealId] ?? [])] },
    }))
    return activity
  },
}))
