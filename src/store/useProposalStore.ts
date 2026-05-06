import { create } from 'zustand'
import {
  fetchProposalsByDeals,
  insertProposal,
  updateProposalStatus,
  deleteProposal as deleteProposalSvc,
  type Proposal,
  type ProposalInsert,
} from '@/services/proposal.service'
import { useToastStore } from '@/store/useToastStore'

interface ProposalStore {
  // dealId → proposals (sorted newest first)
  byDeal: Record<string, Proposal[]>
  loadingDeals: Set<string>

  loadForDeals: (dealIds: string[]) => Promise<void>
  loadForDeal:  (dealId: string) => Promise<void>
  saveProposal: (payload: ProposalInsert) => Promise<Proposal>
  removeProposal: (id: string, dealId: string) => Promise<void>
  setStatus: (id: string, dealId: string, status: Proposal['status']) => Promise<void>

  hasProposal: (dealId: string) => boolean
  getByDeal:   (dealId: string) => Proposal[]
}

export const useProposalStore = create<ProposalStore>((set, get) => ({
  byDeal: {},
  loadingDeals: new Set(),

  loadForDeals: async (dealIds) => {
    const toLoad = dealIds.filter((id) => !(id in get().byDeal))
    if (!toLoad.length) return
    set((s) => ({ loadingDeals: new Set([...s.loadingDeals, ...toLoad]) }))
    try {
      const proposals = await fetchProposalsByDeals(toLoad)
      const grouped: Record<string, Proposal[]> = {}
      for (const id of toLoad) grouped[id] = []
      for (const p of proposals) {
        if (!grouped[p.deal_id]) grouped[p.deal_id] = []
        grouped[p.deal_id].push(p)
      }
      set((s) => ({
        byDeal: { ...s.byDeal, ...grouped },
        loadingDeals: new Set([...s.loadingDeals].filter((id) => !toLoad.includes(id))),
      }))
    } catch (err) {
      // Tabela ainda não existe (migration pendente) — falha silenciosa
      const isTableMissing = (err as { code?: string })?.code === '42P01'
      if (!isTableMissing) console.error('[useProposalStore] loadForDeals:', err)
      set((s) => ({
        byDeal: {
          ...s.byDeal,
          ...Object.fromEntries(toLoad.map((id) => [id, s.byDeal[id] ?? []])),
        },
        loadingDeals: new Set([...s.loadingDeals].filter((id) => !toLoad.includes(id))),
      }))
    }
  },

  loadForDeal: async (dealId) => {
    if (dealId in get().byDeal) return
    await get().loadForDeals([dealId])
  },

  saveProposal: async (payload) => {
    try {
      const proposal = await insertProposal(payload)
      set((s) => ({
        byDeal: {
          ...s.byDeal,
          [payload.deal_id]: [proposal, ...(s.byDeal[payload.deal_id] ?? [])],
        },
      }))
      return proposal
    } catch (err) {
      const isTableMissing = (err as { code?: string })?.code === '42P01'
      useToastStore.getState().addToast(
        isTableMissing ? 'Migration pendente — aplica 20260505155431_proposals.sql no Supabase' : 'Erro ao guardar proposta',
        'error',
      )
      throw err
    }
  },

  removeProposal: async (id, dealId) => {
    const prev = get().byDeal[dealId] ?? []
    set((s) => ({
      byDeal: { ...s.byDeal, [dealId]: prev.filter((p) => p.id !== id) },
    }))
    try {
      await deleteProposalSvc(id)
    } catch {
      set((s) => ({ byDeal: { ...s.byDeal, [dealId]: prev } }))
      useToastStore.getState().addToast('Erro ao apagar proposta', 'error')
    }
  },

  setStatus: async (id, dealId, status) => {
    const prev = get().byDeal[dealId] ?? []
    set((s) => ({
      byDeal: {
        ...s.byDeal,
        [dealId]: prev.map((p) => (p.id === id ? { ...p, status } : p)),
      },
    }))
    try {
      await updateProposalStatus(id, status)
    } catch {
      set((s) => ({ byDeal: { ...s.byDeal, [dealId]: prev } }))
      useToastStore.getState().addToast('Erro ao actualizar estado', 'error')
    }
  },

  hasProposal: (dealId) => (get().byDeal[dealId]?.length ?? 0) > 0,
  getByDeal:   (dealId) => get().byDeal[dealId] ?? [],
}))
