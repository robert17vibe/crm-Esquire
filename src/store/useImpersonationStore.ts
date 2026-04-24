import { create } from 'zustand'

const KEY        = 'esq_impersonation'
const TIMEOUT_MS = 30 * 60 * 1000   // 30 min

export interface ImpersonationState {
  ownerId:   string
  ownerName: string
  startedAt: number
}

function load(): ImpersonationState | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ImpersonationState
    if (Date.now() - s.startedAt > TIMEOUT_MS) { sessionStorage.removeItem(KEY); return null }
    return s
  } catch { return null }
}

interface Store {
  impersonation: ImpersonationState | null
  start: (ownerId: string, ownerName: string) => void
  stop:  () => void
}

export const useImpersonationStore = create<Store>((set) => ({
  impersonation: load(),

  start: (ownerId, ownerName) => {
    const state: ImpersonationState = { ownerId, ownerName, startedAt: Date.now() }
    sessionStorage.setItem(KEY, JSON.stringify(state))
    set({ impersonation: state })
  },

  stop: () => {
    sessionStorage.removeItem(KEY)
    set({ impersonation: null })
  },
}))
