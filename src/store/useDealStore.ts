import { create } from 'zustand'
import { MOCK_DEALS, MOCK_OWNERS } from '@/lib/mock-data'
import { DEFAULT_PROBABILITIES, STAGES } from '@/constants/pipeline'
import { useToastStore } from '@/store/useToastStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { fetchDeals, insertDeal, patchDeal, removeDeal } from '@/services/deal.service'
import { supabase } from '@/lib/supabase'
import type { Deal, NextActivity } from '@/types/deal.types'
import type { StageId } from '@/constants/pipeline'
import type { NewLeadFormValues } from '@/lib/schemas/deal.schema'

const DEALS_KEY = 'esq_deals_v2'

function persistDeals(deals: Deal[]) {
  try { localStorage.setItem(DEALS_KEY, JSON.stringify(deals)) } catch { /* ignore */ }
}

function loadLocalDeals(): Deal[] {
  try {
    const raw = localStorage.getItem(DEALS_KEY)
    if (!raw) return MOCK_DEALS
    const parsed = JSON.parse(raw) as Deal[]
    if (!Array.isArray(parsed) || parsed.length === 0) return MOCK_DEALS
    return parsed.map((d) => ({
      ...d,
      owner: MOCK_OWNERS.find((o) => o.id === d.owner_id) ?? MOCK_OWNERS[0],
    }))
  } catch {
    return MOCK_DEALS
  }
}

interface DealStore {
  deals: Deal[]
  isLoading: boolean
  error: string | null
  initialize: () => Promise<void>
  subscribeRealtime: () => () => void
  createDeal: (values: NewLeadFormValues) => Promise<Deal>
  updateDeal: (id: string, values: NewLeadFormValues) => Promise<Deal>
  deleteDeal: (id: string) => Promise<void>
  moveDeal: (id: string, stageId: StageId) => Promise<void>
  setLossReason: (id: string, reason: string) => void
  setNextActivity: (id: string, nextActivity: NextActivity | null) => Promise<void>
}

export const useDealStore = create<DealStore>((set, get) => ({
  deals: loadLocalDeals(),
  isLoading: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null })
    try {
      const deals = await fetchDeals()
      set({ deals, isLoading: false })
      persistDeals(deals)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar deals'
      set({ isLoading: false, error: msg })
      // keep localStorage fallback already in state
    }
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('deals-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deals' }, (payload) => {
        const deal = payload.new as Deal
        set((s) => {
          // Skip if we already have it (optimistic insert from this session)
          if (s.deals.some((d) => d.id === deal.id)) return s
          const next = [deal, ...s.deals]
          persistDeals(next)
          return { deals: next }
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, (payload) => {
        const deal = payload.new as Deal
        set((s) => {
          const next = s.deals.map((d) => (d.id === deal.id ? deal : d))
          persistDeals(next)
          return { deals: next }
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'deals' }, (payload) => {
        const id = (payload.old as { id: string }).id
        set((s) => {
          const next = s.deals.filter((d) => d.id !== id)
          persistDeals(next)
          return { deals: next }
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },

  createDeal: async (values) => {
    const owner = useOwnerStore.getState().getById(values.owner_id) ?? MOCK_OWNERS[0]
    const now = new Date().toISOString()
    const optimistic: Deal = {
      id: `opt-${Date.now()}`,
      company_id: `c-${Date.now()}`,
      title: `${values.company_name} — ${values.contact_name}`,
      stage_id: values.stage_id,
      value: values.value ?? 0,
      currency: 'BRL',
      probability: values.probability ?? DEFAULT_PROBABILITIES[values.stage_id] ?? 10,
      days_in_stage: 0,
      notes: values.notes,
      owner_id: owner.id,
      owner,
      contact_name: values.contact_name,
      contact_title: values.contact_title,
      contact_email: values.contact_email,
      contact_phone: values.contact_phone,
      contact_linkedin: values.contact_linkedin || undefined,
      company_name: values.company_name,
      company_sector: values.company_sector,
      company_size: values.company_size,
      lead_source: values.lead_source,
      created_at: now,
      updated_at: now,
    }

    // Optimistic insert
    const optimisticList = [optimistic, ...get().deals]
    set({ deals: optimisticList })
    persistDeals(optimisticList)

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...payload } = optimistic
      const confirmed = await insertDeal(payload)
      const next = get().deals.map((d) => (d.id === optimistic.id ? confirmed : d))
      set({ deals: next })
      persistDeals(next)
      useToastStore.getState().addToast(`Lead criado — ${values.company_name}`, 'success')
      useNotificationStore.getState().addNotification(confirmed.id, values.company_name)
      return confirmed
    } catch {
      // Revert optimistic
      const reverted = get().deals.filter((d) => d.id !== optimistic.id)
      set({ deals: reverted })
      persistDeals(reverted)
      useToastStore.getState().addToast('Erro ao criar lead — tente novamente', 'error')
      throw new Error('create failed')
    }
  },

  updateDeal: async (id, values) => {
    const owner = useOwnerStore.getState().getById(values.owner_id) ?? MOCK_OWNERS[0]
    const now = new Date().toISOString()
    const existing = get().deals.find((d) => d.id === id)
    const updated: Deal = {
      ...(existing ?? ({} as Deal)),
      title: `${values.company_name} — ${values.contact_name}`,
      stage_id: values.stage_id,
      value: values.value ?? existing?.value ?? 0,
      probability: values.probability ?? existing?.probability ?? 10,
      notes: values.notes,
      owner_id: owner.id,
      owner,
      contact_name: values.contact_name,
      contact_title: values.contact_title,
      contact_email: values.contact_email,
      contact_phone: values.contact_phone,
      contact_linkedin: values.contact_linkedin || undefined,
      company_name: values.company_name,
      company_sector: values.company_sector,
      company_size: values.company_size,
      lead_source: values.lead_source,
      updated_at: now,
    }

    const prev = get().deals
    const optimisticList = prev.map((d) => (d.id === id ? updated : d))
    set({ deals: optimisticList })
    persistDeals(optimisticList)

    try {
      const { id: _id, company_id: _cid, created_at: _ca, ...patch } = updated
      const confirmed = await patchDeal(id, patch)
      const next = get().deals.map((d) => (d.id === id ? confirmed : d))
      set({ deals: next })
      persistDeals(next)
      useToastStore.getState().addToast(`Lead atualizado — ${values.company_name}`, 'success')
      return confirmed
    } catch {
      set({ deals: prev })
      persistDeals(prev)
      useToastStore.getState().addToast('Erro ao atualizar lead — tente novamente', 'error')
      throw new Error('update failed')
    }
  },

  deleteDeal: async (id) => {
    const deal = get().deals.find((d) => d.id === id)
    const prev = get().deals
    const next = prev.filter((d) => d.id !== id)
    set({ deals: next })
    persistDeals(next)

    try {
      await removeDeal(id)
      if (deal) useToastStore.getState().addToast(`Lead removido — ${deal.company_name}`, 'error')
    } catch {
      set({ deals: prev })
      persistDeals(prev)
      useToastStore.getState().addToast('Erro ao remover lead — tente novamente', 'error')
    }
  },

  moveDeal: async (id, stageId) => {
    const deal = get().deals.find((d) => d.id === id)
    const prev = get().deals
    const next = prev.map((d) =>
      d.id === id ? { ...d, stage_id: stageId, probability: DEFAULT_PROBABILITIES[stageId] } : d,
    )
    set({ deals: next })
    persistDeals(next)

    try {
      await patchDeal(id, { stage_id: stageId, probability: DEFAULT_PROBABILITIES[stageId] })
      if (deal) {
        const stageLabel = STAGES.find((s) => s.id === stageId)?.label ?? stageId
        useToastStore.getState().addToast(`${deal.company_name} → ${stageLabel}`, 'info')
      }
    } catch {
      set({ deals: prev })
      persistDeals(prev)
      useToastStore.getState().addToast('Erro ao mover lead — tente novamente', 'error')
    }
  },

  setLossReason: (id, reason) => {
    const prev = get().deals
    const next = prev.map((d) => (d.id === id ? { ...d, loss_reason: reason } : d))
    set({ deals: next })
    persistDeals(next)
    patchDeal(id, { loss_reason: reason }).catch(() => {
      set({ deals: prev })
      persistDeals(prev)
    })
  },

  setNextActivity: async (id, nextActivity) => {
    const prev = get().deals
    const next = prev.map((d) =>
      d.id === id ? { ...d, next_activity: nextActivity === null ? undefined : nextActivity } : d,
    )
    set({ deals: next })
    persistDeals(next)
    try {
      await patchDeal(id, { next_activity: nextActivity })
    } catch {
      set({ deals: prev })
      persistDeals(prev)
      useToastStore.getState().addToast('Erro ao salvar atividade — tente novamente', 'error')
    }
  },
}))
