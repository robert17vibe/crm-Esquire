import { create } from 'zustand'
import { MOCK_DEALS, MOCK_OWNERS } from '@/lib/mock-data'
import { DEFAULT_PROBABILITIES } from '@/constants/pipeline'
import type { Deal } from '@/types/deal.types'
import type { StageId } from '@/constants/pipeline'
import type { NewLeadFormValues } from '@/lib/schemas/deal.schema'

interface DealStore {
  deals: Deal[]
  createDeal: (values: NewLeadFormValues) => Deal
  updateDeal: (id: string, values: NewLeadFormValues) => Deal
  deleteDeal: (id: string) => void
  moveDeal: (id: string, stageId: StageId) => void
  setLossReason: (id: string, reason: string) => void
}

export const useDealStore = create<DealStore>((set, get) => ({
  deals: MOCK_DEALS,

  createDeal: (values) => {
    const owner = MOCK_OWNERS.find((o) => o.id === values.owner_id) ?? MOCK_OWNERS[0]
    const now = new Date().toISOString().slice(0, 10)
    const deal: Deal = {
      id: `d-${Date.now()}`,
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
    set((state) => ({ deals: [deal, ...state.deals] }))
    return deal
  },

  updateDeal: (id, values) => {
    const owner = MOCK_OWNERS.find((o) => o.id === values.owner_id) ?? MOCK_OWNERS[0]
    const now = new Date().toISOString().slice(0, 10)
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
    set((state) => ({
      deals: state.deals.map((d) => (d.id === id ? updated : d)),
    }))
    return updated
  },

  deleteDeal: (id) => {
    set((state) => ({ deals: state.deals.filter((d) => d.id !== id) }))
  },

  moveDeal: (id, stageId) => {
    set((state) => ({
      deals: state.deals.map((d) =>
        d.id === id
          ? { ...d, stage_id: stageId, probability: DEFAULT_PROBABILITIES[stageId] }
          : d
      ),
    }))
  },

  setLossReason: (id, reason) => {
    set((state) => ({
      deals: state.deals.map((d) => (d.id === id ? { ...d, loss_reason: reason } : d)),
    }))
  },
}))
