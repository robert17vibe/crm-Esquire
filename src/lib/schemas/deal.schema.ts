import { z } from 'zod'

const STAGE_IDS = [
  'leads',
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const

const COMPANY_SIZES = ['1-50', '51-200', '201-1000', '1000+'] as const
const LEAD_SOURCES  = ['Indicação', 'Inbound', 'Outbound', 'Evento'] as const

export const newLeadSchema = z.object({
  contact_name:     z.string().min(1, 'Nome obrigatório'),
  company_name:     z.string().optional().or(z.literal('')),
  contact_email:    z.string().email('Email inválido').optional().or(z.literal('')),
  contact_phone:    z.string().optional(),
  contact_title:    z.string().optional(),
  contact_linkedin: z.string().url('URL inválida').optional().or(z.literal('')),
  company_sector:   z.string().optional(),
  company_size:     z.enum(COMPANY_SIZES).optional(),
  value:            z.coerce.number().min(0, 'Valor inválido').optional(),
  probability:      z.coerce.number().min(0).max(100).optional(),
  owner_id:         z.string().min(1, 'Responsável obrigatório'),
  lead_source:      z.enum(LEAD_SOURCES).optional(),
  stage_id:         z.enum(STAGE_IDS),
  notes:            z.string().optional(),
})

export type NewLeadFormValues = z.infer<typeof newLeadSchema>
