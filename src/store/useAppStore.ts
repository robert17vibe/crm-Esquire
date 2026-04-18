import { create } from 'zustand'

interface AppState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  leftColWidth: number
  rightColWidth: number
  setLeftColWidth: (w: number) => void
  setRightColWidth: (w: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  leftColWidth:  260,
  rightColWidth: 268,
  setLeftColWidth:  (w) => set({ leftColWidth:  Math.min(Math.max(w, 200), 350) }),
  setRightColWidth: (w) => set({ rightColWidth: Math.min(Math.max(w, 200), 350) }),
}))
