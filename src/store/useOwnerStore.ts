import { create } from 'zustand'
import { MOCK_OWNERS } from '@/lib/mock-data'
import { buildOwnerFallback } from '@/lib/owner'
import { fetchOwners, updateOwnerTeam } from '@/services/owner.service'
import { supabase } from '@/lib/supabase'
import type { Owner } from '@/types/deal.types'

interface OwnerStore {
  owners: Owner[]
  initialize: () => Promise<void>
  subscribeRealtime: () => () => void
  getById: (ownerId: string, fallbackName?: string) => Owner
  setOwnerTeam: (ownerId: string, teamId: string | null) => Promise<void>
  getRoundRobinOwner: (activeDealsByOwner: Record<string, number>, teamId?: string) => Owner | null
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

  getRoundRobinOwner: (activeDealsByOwner, teamId) => {
    const pool = get().owners.filter((o) => !teamId || o.team_id === teamId)
    if (pool.length === 0) return get().owners[0] ?? null
    return pool.reduce((least, o) =>
      (activeDealsByOwner[o.id] ?? 0) < (activeDealsByOwner[least.id] ?? 0) ? o : least
    )
  },

  setOwnerTeam: async (ownerId, teamId) => {
    set((s) => ({
      owners: s.owners.map((o) =>
        o.id === ownerId ? { ...o, team_id: teamId ?? undefined } : o
      ),
    }))
    try {
      await updateOwnerTeam(ownerId, teamId)
    } catch {
      // revert on failure
      const owners = await fetchOwners()
      if (owners.length > 0) set({ owners })
    }
  },
}))
