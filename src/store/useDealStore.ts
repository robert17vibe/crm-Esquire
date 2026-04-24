import { create } from 'zustand'
import { MOCK_DEALS, MOCK_OWNERS } from '@/lib/mock-data'
import { DEFAULT_PROBABILITIES, STAGES } from '@/constants/pipeline'
import { useToastStore } from '@/store/useToastStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useWebhookStore } from '@/store/useWebhookStore'
import { fetchDeals, insertDeal, patchDeal, removeDeal } from '@/services/deal.service'
import { supabase } from '@/lib/supabase'
import type { Deal, NextActivity } from '@/types/deal.types'
import type { StageId } from '@/constants/pipeline'
import type { NewLeadFormValues } from '@/lib/schemas/deal.schema'

const DEALS_KEY = 'esq_deals_v2'

function _runStaleAlerts(deals: Deal[]) {
  const { addAlertIfNew } = useNotificationStore.getState()
  const now  = Date.now()
  const staleMs  = 21 * 86_400_000   // 21 days no activity
  const slaMs    = 2  * 3_600_000    // 2h first contact SLA

  for (const d of deals) {
    if (['closed_won', 'closed_lost'].includes(d.stage_id)) continue
    const label = d.company_name || d.title

    // SLA breach: first stage, no activity, created >2h ago
    if (d.stage_id === 'leads' && !d.last_activity_at && (now - new Date(d.created_at).getTime()) > slaMs) {
      addAlertIfNew(d.id, label, 'sla_breach', 'Sem primeiro contato em 2h')
    }

    // Stale: no activity for 21+ days
    const lastAct = d.last_activity_at ? new Date(d.last_activity_at).getTime() : new Date(d.created_at).getTime()
    if (now - lastAct > staleMs) {
      addAlertIfNew(d.id, label, 'overdue_activity', `${Math.floor((now - lastAct) / 86_400_000)}d sem atividade`)
    }
  }
}

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
  staleDeals: Deal[]
  staleCount: number
  initialize: () => Promise<void>
  subscribeRealtime: () => () => void
  createDeal: (values: NewLeadFormValues) => Promise<Deal>
  updateDeal: (id: string, values: NewLeadFormValues) => Promise<Deal>
  deleteDeal: (id: string) => Promise<void>
  moveDeal: (id: string, stageId: StageId) => Promise<void>
  setLossReason: (id: string, reason: string) => void
  setNextActivity: (id: string, nextActivity: NextActivity | null) => Promise<void>
  patchDealFields: (id: string, patch: Partial<Deal>) => Promise<void>
  getNextRoundRobinOwner: (teamId: string) => Promise<string | null>
}

function _computeStale(deals: Deal[]): Deal[] {
  const now = Date.now()
  const cutoffMs = 7 * 86_400_000
  return deals.filter((d) => {
    if (['closed_won', 'closed_lost'].includes(d.stage_id)) return false
    const ref = d.last_activity_at
      ? new Date(d.last_activity_at).getTime()
      : new Date(d.created_at).getTime()
    return now - ref > cutoffMs
  })
}

export const useDealStore = create<DealStore>((set, get) => {
  // Helper: set deals + recompute stale derived state
  function setDeals(next: Deal[]) {
    set({ deals: next, staleDeals: _computeStale(next), staleCount: _computeStale(next).length })
  }

  return ({
  deals: loadLocalDeals(),
  isLoading: false,
  error: null,
  staleDeals: _computeStale(loadLocalDeals()),
  staleCount: _computeStale(loadLocalDeals()).length,

  initialize: async () => {
    set({ isLoading: true, error: null })
    try {
      const deals = await fetchDeals()
      set({ deals, isLoading: false, staleDeals: _computeStale(deals), staleCount: _computeStale(deals).length })
      persistDeals(deals)
      _runStaleAlerts(deals)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar deals'
      set({ isLoading: false, error: msg })
    }
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('deals-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deals' }, (payload) => {
        const deal = payload.new as Deal
        if (get().deals.some((d) => d.id === deal.id)) return
        const next = [deal, ...get().deals]
        persistDeals(next)
        setDeals(next)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, (payload) => {
        const deal = payload.new as Deal & { deleted_at?: string | null }
        if (deal.deleted_at) {
          const next = get().deals.filter((d) => d.id !== deal.id)
          persistDeals(next)
          setDeals(next)
          return
        }
        const next = get().deals.map((d) => (d.id === deal.id ? deal : d))
        persistDeals(next)
        setDeals(next)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'deals' }, (payload) => {
        const id = (payload.old as { id: string }).id
        const next = get().deals.filter((d) => d.id !== id)
        persistDeals(next)
        setDeals(next)
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
      company_name: values.company_name || values.contact_name,
      company_sector: values.company_sector,
      company_size: values.company_size,
      lead_source: values.lead_source,
      created_at: now,
      updated_at: now,
    }

    // Optimistic insert
    const optimisticList = [optimistic, ...get().deals]
    setDeals(optimisticList)
    persistDeals(optimisticList)

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...payload } = optimistic
      const confirmed = await insertDeal(payload)
      const next = get().deals.map((d) => (d.id === optimistic.id ? confirmed : d))
      setDeals(next)
      persistDeals(next)
      const displayName = values.company_name ?? values.contact_name
      useToastStore.getState().addToast(`Lead criado — ${displayName}`, 'success')
      useNotificationStore.getState().addNotification(confirmed.id, displayName)
      useWebhookStore.getState().fire('deal.created', { id: confirmed.id, title: confirmed.title, company_name: confirmed.company_name, stage_id: confirmed.stage_id, owner_id: confirmed.owner_id, value: confirmed.value })
      return confirmed
    } catch {
      // Revert optimistic
      const reverted = get().deals.filter((d) => d.id !== optimistic.id)
      setDeals(reverted)
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
      title: `${values.company_name ?? values.contact_name} — ${values.contact_name}`,
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
      company_name: values.company_name || values.contact_name,
      company_sector: values.company_sector,
      company_size: values.company_size,
      lead_source: values.lead_source,
      updated_at: now,
    }

    const prev = get().deals
    const optimisticList = prev.map((d) => (d.id === id ? updated : d))
    setDeals(optimisticList)
    persistDeals(optimisticList)

    try {
      const { id: _id, company_id: _cid, created_at: _ca, ...patch } = updated
      const confirmed = await patchDeal(id, patch)
      const next = get().deals.map((d) => (d.id === id ? confirmed : d))
      setDeals(next)
      persistDeals(next)
      useToastStore.getState().addToast(`Lead atualizado — ${values.company_name}`, 'success')
      return confirmed
    } catch {
      setDeals(prev)
      persistDeals(prev)
      useToastStore.getState().addToast('Erro ao atualizar lead — tente novamente', 'error')
      throw new Error('update failed')
    }
  },

  deleteDeal: async (id) => {
    const deal = get().deals.find((d) => d.id === id)
    const prev = get().deals
    const next = prev.filter((d) => d.id !== id)
    setDeals(next)
    persistDeals(next)

    try {
      await removeDeal(id)
      if (deal) {
        useToastStore.getState().addToast(`Lead removido — ${deal.company_name}`, 'error')
        useWebhookStore.getState().fire('deal.deleted', { id: deal.id, company_name: deal.company_name })
      }
    } catch {
      setDeals(prev)
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
    setDeals(next)
    persistDeals(next)

    try {
      await patchDeal(id, { stage_id: stageId, probability: DEFAULT_PROBABILITIES[stageId] })
      if (deal) {
        const stageLabel = STAGES.find((s) => s.id === stageId)?.label ?? stageId
        useToastStore.getState().addToast(`${deal.company_name} → ${stageLabel}`, 'info')
        useWebhookStore.getState().fire('deal.stage_changed', { id: deal.id, company_name: deal.company_name, from_stage: deal.stage_id, to_stage: stageId })
      }
    } catch {
      setDeals(prev)
      persistDeals(prev)
      useToastStore.getState().addToast('Erro ao mover lead — tente novamente', 'error')
    }
  },

  setLossReason: (id, reason) => {
    const prev = get().deals
    const next = prev.map((d) => (d.id === id ? { ...d, loss_reason: reason } : d))
    setDeals(next)
    persistDeals(next)
    patchDeal(id, { loss_reason: reason }).catch(() => {
      setDeals(prev)
      persistDeals(prev)
    })
  },

  setNextActivity: async (id, nextActivity) => {
    const prev = get().deals
    const next = prev.map((d) =>
      d.id === id ? { ...d, next_activity: nextActivity === null ? undefined : nextActivity } : d,
    )
    setDeals(next)
    persistDeals(next)
    try {
      await patchDeal(id, { next_activity: nextActivity })
    } catch {
      setDeals(prev)
      persistDeals(prev)
      useToastStore.getState().addToast('Erro ao salvar atividade — tente novamente', 'error')
    }
  },

  patchDealFields: async (id, patch) => {
    const prev = get().deals
    const next = prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    setDeals(next)
    persistDeals(next)
    try {
      await patchDeal(id, patch)
      useToastStore.getState().addToast('Alteração guardada', 'success')
    } catch {
      setDeals(prev)
      persistDeals(prev)
      useToastStore.getState().addToast('Erro ao salvar — tente novamente', 'error')
    }
  },

  getNextRoundRobinOwner: async (teamId) => {
    try {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .select('id, owner_ids, round_robin_index')
        .eq('team_id', teamId)
        .eq('active', true)
        .single()
      if (error || !data) return null
      const ownerIds = data.owner_ids as string[]
      if (!ownerIds.length) return null
      const idx = data.round_robin_index % ownerIds.length
      const ownerId = ownerIds[idx]
      await supabase
        .from('lead_assignment_rules')
        .update({ round_robin_index: idx + 1 })
        .eq('id', data.id)
      return ownerId
    } catch {
      return null
    }
  },
  })
})
