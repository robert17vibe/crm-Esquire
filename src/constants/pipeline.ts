export type StageId =
  | 'leads'
  | 'prospecting'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost'

export interface Stage {
  id: StageId
  label: string
  color: string
  order: number
  is_closed: boolean
  is_won: boolean
}

export const STAGES: Stage[] = [
  { id: 'leads',         label: 'Entrada',     color: '#b0a990', order: 0, is_closed: false, is_won: false },
  { id: 'prospecting',   label: 'Prospecção',  color: '#78909c', order: 1, is_closed: false, is_won: false },
  { id: 'qualification', label: 'Qualificação', color: '#4a7c8a', order: 2, is_closed: false, is_won: false },
  { id: 'proposal',      label: 'Proposta',    color: '#8b6914', order: 3, is_closed: false, is_won: false },
  { id: 'negotiation',   label: 'Fechamento',  color: '#2c5545', order: 4, is_closed: false, is_won: false },
  { id: 'closed_won',    label: 'Ganho',       color: '#1a3a2a', order: 5, is_closed: true,  is_won: true  },
  { id: 'closed_lost',   label: 'Perdido',     color: '#6b3a3a', order: 6, is_closed: true,  is_won: false },
]

export const DEFAULT_PROBABILITIES: Record<StageId, number> = {
  leads:         0,
  prospecting:   10,
  qualification: 25,
  proposal:      50,
  negotiation:   75,
  closed_won:    100,
  closed_lost:   0,
}

export function getStageColor(stageId: string): string {
  return STAGES.find((s) => s.id === stageId)?.color ?? '#94a3b8'
}

// ─── Tag palette — solid colors, white text ───────────────────────────────────

export const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  'SaaS':       { bg: '#3b82f6', text: '#fff' },
  'Enterprise': { bg: '#2c5545', text: '#fff' },
  'Fintech':    { bg: '#0284c7', text: '#fff' },
  'Varejo':     { bg: '#ea580c', text: '#fff' },
  'ESG':        { bg: '#16a34a', text: '#fff' },
  'Saúde':      { bg: '#0d9488', text: '#fff' },
  'Crítico':    { bg: '#dc2626', text: '#fff' },
  'Urgente':    { bg: '#dc2626', text: '#fff' },
  'Dados':      { bg: '#7c3aed', text: '#fff' },
  'IA':         { bg: '#7c3aed', text: '#fff' },
  'Manufatura': { bg: '#6366f1', text: '#fff' },
  'Energia':    { bg: '#059669', text: '#fff' },
  'Telecom':    { bg: '#0ea5e9', text: '#fff' },
}

export function getTagStyle(tag: string): { bg: string; text: string } {
  return TAG_STYLES[tag] ?? { bg: '#8b8aa3', text: '#fff' }
}
