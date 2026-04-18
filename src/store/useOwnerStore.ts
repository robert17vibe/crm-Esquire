import { create } from 'zustand'
import { fetchOwnersFromDeals } from '@/services/owner.service'
import { supabase } from '@/lib/supabase'
import { buildOwnerFallback } from '@/lib/owner'
import { MOCK_OWNERS } from '@/lib/mock-data'
import type { Owner } from '@/types/deal.types'

interface OwnerStore {
  owners: Owner[]
  loading: boolean
  init: () => Promise<void>
  getById: (ownerId: string, fallbackName?: string) => Owner
}

export const useOwnerStore = create<OwnerStore>((set, get) => ({
  owners: MOCK_OWNERS,
  loading: false,

  init: async () => {
    set({ loading: true })
    try {
      const remote = await fetchOwnersFromDeals()
      if (remote.length > 0) {
        set({ owners: remote })
        return
      }

      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return

      const userName =
        (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
        (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
        user.email ||
        user.id

      set({ owners: [buildOwnerFallback(user.id, userName)] })
    } catch {
      // remote unavailable — keep mock owners
    } finally {
      set({ loading: false })
    }
  },

  getById: (ownerId, fallbackName) => {
    const owner = get().owners.find((item) => item.id === ownerId)
    return owner ?? buildOwnerFallback(ownerId, fallbackName)
  },
}))
