import { create } from 'zustand'
import { DEFAULT_PROBABILITIES } from '@/constants/pipeline'
import { fetchDeals, insertDeal, patchDeal, removeDeal } from '@/services/deal.service'
import { useOwnerStore } from '@/store/useOwnerStore'
import { MOCK_DEALS } from '@/lib/mock-data'
import type { Deal } from '@/types/deal.types'
import type { StageId } from '@/constants/pipeline'
import type { NewLeadFormValues } from '@/lib/schemas/deal.schema'

interface DealStore {
  deals: Deal[]
  loading: boolean
  init: () => Promise<void>
  createDeal: (values: NewLeadFormValues) => Promise<Deal>
  updateDeal: (id: string, values: NewLeadFormValues) => Promise<Deal>
  deleteDeal: (id: string) => Promise<void>
  moveDeal: (id: string, stageId: StageId) => Promise<void>
  setLossReason: (id: string, reason: string) => void
}

export const useDealStore = create<DealStore>((set, get) => ({
  deals: MOCK_DEALS,
  loading: false,

  init: async () => {
    set({ loading: true })
    try {
      const remote = await fetchDeals()
      if (remote.length > 0) set({ deals: remote })
    } catch {
      // remote unavailable — keep mock data
    } finally {
      set({ loading: false })
    }
  },

  createDeal: async (values) => {
    const owner = useOwnerStore.getState().getById(values.owner_id, values.contact_name)
    const deal = await insertDeal({
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
    })
    set((state) => ({ deals: [deal, ...state.deals] }))
    return deal
  },

  updateDeal: async (id, values) => {
    const owner = useOwnerStore.getState().getById(values.owner_id, values.contact_name)
    const existing = get().deals.find((d) => d.id === id)
    const updated = await patchDeal(id, {
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
      company_sector: values.company_sector || existing?.company_sector,
      company_size: values.company_size ?? existing?.company_size,
      lead_source: values.lead_source ?? existing?.lead_source,
    })
    set((state) => ({
      deals: state.deals.map((d) => (d.id === id ? updated : d)),
    }))
    return updated
  },

  deleteDeal: async (id) => {
    await removeDeal(id)
    set((state) => ({ deals: state.deals.filter((d) => d.id !== id) }))
  },

  moveDeal: async (id, stageId) => {
    const updated = await patchDeal(id, {
      stage_id: stageId,
      probability: DEFAULT_PROBABILITIES[stageId],
    })
    set((state) => ({
      deals: state.deals.map((d) => (d.id === id ? updated : d)),
    }))
  },

  setLossReason: (id, reason) => {
    set((state) => ({
      deals: state.deals.map((d) => (d.id === id ? { ...d, loss_reason: reason } : d)),
    }))
  },
}))
