import { create } from 'zustand'
import { MOCK_OWNERS } from '@/lib/mock-data'
import { buildOwnerFallback } from '@/lib/owner'
import { fetchOwners } from '@/services/owner.service'
import { supabase } from '@/lib/supabase'
import type { Owner } from '@/types/deal.types'

interface OwnerStore {
  owners: Owner[]
  initialize: () => Promise<void>
  subscribeRealtime: () => () => void
  getById: (ownerId: string, fallbackName?: string) => Owner
}

export const useOwnerStore = create<OwnerStore>((set, get) => ({
  owners: MOCK_OWNERS,

  initialize: async () => {
    try {
      const owners = await fetchOwners()
      if (owners.length > 0) set({ owners })
    } catch {
      // keep mock data on error
    }
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
        try {
          const owners = await fetchOwners()
          if (owners.length > 0) set({ owners })
        } catch { /* keep current */ }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },

  getById: (ownerId, fallbackName) => {
    const owner = get().owners.find((item) => item.id === ownerId)
    return owner ?? buildOwnerFallback(ownerId, fallbackName)
  },
}))
