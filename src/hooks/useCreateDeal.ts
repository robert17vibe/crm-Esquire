import { MOCK_OWNERS } from '@/lib/mock-data'
import type { Deal } from '@/types/deal.types'
import type { NewLeadFormValues } from '@/lib/schemas/deal.schema'

// Probability defaults per stage
const STAGE_PROBABILITY: Record<string, number> = {
  prospecting:  10,
  qualification: 25,
  proposal:      50,
  negotiation:   75,
  closed_won:   100,
  closed_lost:    0,
}

export function useCreateDeal() {
  function createDeal(values: NewLeadFormValues): Deal {
    const owner = MOCK_OWNERS.find((o) => o.id === values.owner_id) ?? MOCK_OWNERS[0]
    const now   = new Date().toISOString().slice(0, 10)
    const id    = `d-${Date.now()}`

    return {
      id,
      company_id:       `c-${Date.now()}`,
      title:            `${values.company_name} — ${values.contact_name}`,
      stage_id:         values.stage_id,
      value:            values.value ?? 0,
      currency:         'BRL',
      probability:      values.probability ?? STAGE_PROBABILITY[values.stage_id] ?? 10,
      days_in_stage:    0,
      notes:            values.notes,
      owner_id:         owner.id,
      owner,
      // Contact
      contact_name:     values.contact_name,
      contact_title:    values.contact_title,
      contact_email:    values.contact_email,
      contact_phone:    values.contact_phone,
      contact_linkedin: values.contact_linkedin || undefined,
      // Company
      company_name:     values.company_name,
      company_sector:   values.company_sector,
      company_size:     values.company_size,
      // Lead
      lead_source:      values.lead_source,
      // Timestamps
      created_at:       now,
      updated_at:       now,
    }
  }

  return { createDeal }
}
