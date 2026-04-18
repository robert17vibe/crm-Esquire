import { create } from 'zustand'
import { MOCK_OWNERS } from '@/lib/mock-data'
import { buildOwnerFallback } from '@/lib/owner'
import type { Owner } from '@/types/deal.types'

interface OwnerStore {
  owners: Owner[]
  getById: (ownerId: string, fallbackName?: string) => Owner
}

export const useOwnerStore = create<OwnerStore>((set, get) => ({
  owners: MOCK_OWNERS,

  getById: (ownerId, fallbackName) => {
    const owner = get().owners.find((item) => item.id === ownerId)
    return owner ?? buildOwnerFallback(ownerId, fallbackName)
  },
}))
