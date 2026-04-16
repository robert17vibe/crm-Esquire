import { create } from 'zustand'
import type { DealStage } from '@/types'

interface PipelineState {
  // Drag & drop state
  draggingDealId: string | null
  dragOverStage: DealStage | null
  setDraggingDeal: (id: string | null) => void
  setDragOverStage: (stage: DealStage | null) => void
}

export const usePipelineStore = create<PipelineState>((set) => ({
  draggingDealId: null,
  dragOverStage: null,
  setDraggingDeal: (id) => set({ draggingDealId: id }),
  setDragOverStage: (stage) => set({ dragOverStage: stage }),
}))

// ─── Stage config ──────────────────────────────────────────────────────────

export const STAGE_CONFIG: Record<DealStage, { label: string; color: string; probability: number }> = {
  prospecting:   { label: 'Prospecção',    color: 'bg-slate-500',   probability: 10 },
  qualification: { label: 'Qualificação',  color: 'bg-blue-500',    probability: 25 },
  proposal:      { label: 'Proposta',      color: 'bg-violet-500',  probability: 50 },
  negotiation:   { label: 'Negociação',    color: 'bg-amber-500',   probability: 75 },
  closed_won:    { label: 'Ganho',         color: 'bg-emerald-500', probability: 100 },
  closed_lost:   { label: 'Perdido',       color: 'bg-red-500',     probability: 0 },
}

export const PIPELINE_STAGES: DealStage[] = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
]
