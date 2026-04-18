import { create } from 'zustand'
import { MOCK_MEETINGS } from '@/lib/mock-data'
import type { DealMeeting } from '@/types/deal.types'

interface MeetingStore {
  meetings: DealMeeting[]
  addMeeting: (payload: Omit<DealMeeting, 'id' | 'created_at'>) => DealMeeting
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetings: MOCK_MEETINGS,

  addMeeting: (payload) => {
    const meeting: DealMeeting = {
      ...payload,
      id: `m-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    set((s) => ({ meetings: [meeting, ...s.meetings] }))
    return meeting
  },
}))
