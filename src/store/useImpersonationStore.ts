import { create } from 'zustand'

interface ImpersonationStore {
  impersonatedId: string | null
  impersonatedName: string | null
  startImpersonation: (userId: string, name: string) => void
  stopImpersonation: () => void
}

const KEY_ID   = 'esq_impersonate_id'
const KEY_NAME = 'esq_impersonate_name'

export const useImpersonationStore = create<ImpersonationStore>((set) => ({
  impersonatedId:   sessionStorage.getItem(KEY_ID),
  impersonatedName: sessionStorage.getItem(KEY_NAME),

  startImpersonation: (userId, name) => {
    sessionStorage.setItem(KEY_ID,   userId)
    sessionStorage.setItem(KEY_NAME, name)
    set({ impersonatedId: userId, impersonatedName: name })
  },

  stopImpersonation: () => {
    sessionStorage.removeItem(KEY_ID)
    sessionStorage.removeItem(KEY_NAME)
    set({ impersonatedId: null, impersonatedName: null })
  },
}))
