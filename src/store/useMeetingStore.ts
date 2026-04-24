import { create } from 'zustand'
import { MOCK_MEETINGS } from '@/lib/mock-data'
import { fetchAllMeetings, insertMeeting } from '@/services/meeting.service'
import { supabase } from '@/lib/supabase'
import type { DealMeeting } from '@/types/deal.types'

interface MeetingStore {
  meetings: DealMeeting[]
  isLoading: boolean
  initialize: () => Promise<void>
  addMeeting: (payload: Omit<DealMeeting, 'id'>) => Promise<DealMeeting>
  updateMeeting: (id: string, patch: Partial<Omit<DealMeeting, 'id'>>) => Promise<void>
  deleteMeeting: (id: string) => Promise<void>
  subscribeRealtime: () => () => void
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

  updateMeeting: async (id, patch) => {
    set((s) => ({ meetings: s.meetings.map((m) => m.id === id ? { ...m, ...patch } : m) }))
    try {
      await supabase.from('deal_meetings').update(patch).eq('id', id)
    } catch {
      // optimistic update stays; realtime will correct if needed
    }
  },

  deleteMeeting: async (id) => {
    set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) }))
    try {
      await supabase.from('deal_meetings').delete().eq('id', id)
    } catch {
      // already removed optimistically
    }
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('meetings-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deal_meetings' },
        (payload) => {
          const meeting = payload.new as DealMeeting
          set((s) => {
            if (s.meetings.some((m) => m.id === meeting.id)) return s
            return { meetings: [meeting, ...s.meetings] }
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deal_meetings' },
        (payload) => {
          const meeting = payload.new as DealMeeting
          set((s) => ({
            meetings: s.meetings.map((m) => (m.id === meeting.id ? meeting : m)),
          }))
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'deal_meetings' },
        (payload) => {
          const id = (payload.old as { id: string }).id
          set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) }))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },
}))
