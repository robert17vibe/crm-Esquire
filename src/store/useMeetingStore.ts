import { create } from 'zustand'
import { MOCK_MEETINGS } from '@/lib/mock-data'
import { fetchAllMeetings, insertMeeting } from '@/services/meeting.service'
import type { DealMeeting } from '@/types/deal.types'

interface MeetingStore {
  meetings: DealMeeting[]
  isLoading: boolean
  initialize: () => Promise<void>
  addMeeting: (payload: Omit<DealMeeting, 'id'>) => Promise<DealMeeting>
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetings: MOCK_MEETINGS,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true })
    try {
      const meetings = await fetchAllMeetings()
      set({ meetings, isLoading: false })
    } catch {
      set({ isLoading: false })
      // keep mock data on error
    }
  },

  addMeeting: async (payload) => {
    const optimistic: DealMeeting = { ...payload, id: `opt-${Date.now()}` }

    set((s) => ({ meetings: [optimistic, ...s.meetings] }))

    try {
      const confirmed = await insertMeeting(payload)
      set((s) => ({
        meetings: s.meetings.map((m) => (m.id === optimistic.id ? confirmed : m)),
      }))
      return confirmed
    } catch {
      set((s) => ({ meetings: s.meetings.filter((m) => m.id !== optimistic.id) }))
      throw new Error('addMeeting failed')
    }
  },
}))
