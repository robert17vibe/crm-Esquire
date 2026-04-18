import { create } from 'zustand'
import { fetchAllMeetings, insertMeeting } from '@/services/meeting.service'
import { MOCK_MEETINGS } from '@/lib/mock-data'
import type { DealMeeting } from '@/types/deal.types'

interface MeetingStore {
  meetings: DealMeeting[]
  loading: boolean
  init: () => Promise<void>
  addMeeting: (payload: Omit<DealMeeting, 'id' | 'created_at'>) => Promise<DealMeeting>
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetings: MOCK_MEETINGS,
  loading:  false,

  init: async () => {
    set({ loading: true })
    try {
      const remote = await fetchAllMeetings()
      if (remote.length > 0) set({ meetings: remote })
    } catch {
      // remote unavailable — keep mock data
    } finally {
      set({ loading: false })
    }
  },

  addMeeting: async (payload) => {
    const meeting = await insertMeeting(payload)
    set((s) => ({ meetings: [meeting, ...s.meetings] }))
    return meeting
  },
}))
