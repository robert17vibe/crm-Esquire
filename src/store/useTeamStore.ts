import { create } from 'zustand'
import { fetchTeams, insertTeam } from '@/services/teams.service'
import { useToastStore } from '@/store/useToastStore'
import type { Team } from '@/types/deal.types'

interface TeamStore {
  teams: Team[]
  isLoading: boolean
  initialize: () => Promise<void>
  createTeam: (name: string) => Promise<Team>
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true })
    try {
      const teams = await fetchTeams()
      set({ teams, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  createTeam: async (name) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Nome obrigatório')
    try {
      const team = await insertTeam(trimmed)
      set((s) => ({ teams: [...s.teams, team].sort((a, b) => a.name.localeCompare(b.name)) }))
      useToastStore.getState().addToast(`Time "${team.name}" criado`, 'success')
      return team
    } catch {
      useToastStore.getState().addToast('Erro ao criar time', 'error')
      throw new Error('createTeam failed')
    }
  },
}))
