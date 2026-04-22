import { create } from 'zustand'
import { fetchTeams, insertTeam, renameTeam, removeTeam } from '@/services/teams.service'
import { useToastStore } from '@/store/useToastStore'
import type { Team } from '@/types/deal.types'

interface TeamStore {
  teams: Team[]
  isLoading: boolean
  initialize: () => Promise<void>
  createTeam: (name: string) => Promise<Team>
  renameTeam: (id: string, name: string) => Promise<void>
  deleteTeam: (id: string) => Promise<void>
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

  renameTeam: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const prev = get().teams
    set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, name: trimmed } : t)) }))
    try {
      await renameTeam(id, trimmed)
    } catch {
      set({ teams: prev })
      useToastStore.getState().addToast('Erro ao renomear time', 'error')
    }
  },

  deleteTeam: async (id) => {
    const team = get().teams.find((t) => t.id === id)
    const prev = get().teams
    set((s) => ({ teams: s.teams.filter((t) => t.id !== id) }))
    try {
      await removeTeam(id)
      if (team) useToastStore.getState().addToast(`Time "${team.name}" removido`, 'info')
    } catch {
      set({ teams: prev })
      useToastStore.getState().addToast('Erro ao remover time', 'error')
    }
  },
}))
