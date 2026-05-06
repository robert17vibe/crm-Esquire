import type { Deal } from '@/types/deal.types'

export interface DealScoreContext {
  meetingCount?: number
  completedTaskCount?: number
  pendingTaskCount?: number
  proposalCount?: number
  hasAcceptedProposal?: boolean
}

// Posição na jornada (0 = entrada, 4 = fechamento)
const STAGE_PROGRESS: Record<string, number> = {
  leads: 0, prospecting: 1, qualification: 2, proposal: 3, negotiation: 4,
}

// Score começa em 0 e sobe com cada acção positiva do lead.
// Máximo teórico ≈ 100. Nunca penaliza abaixo do já conquistado — só não avança.
export function evaluateDealScore(deal: Deal, ctx: DealScoreContext = {}): number {
  if (['closed_won', 'closed_lost'].includes(deal.stage_id)) return 0

  let score = 0

  // ── 1. Progressão na jornada (0–20 pts) ──────────────────────────────────
  // Cada etapa avançada vale 5 pts — reflecte o esforço de mover o lead
  const stagePos = STAGE_PROGRESS[deal.stage_id] ?? 0
  score += stagePos * 5   // leads=0  prospecção=5  qualif=10  proposta=15  fechamento=20

  // ── 2. Reuniões realizadas (0–15 pts) ────────────────────────────────────
  const meetings = ctx.meetingCount ?? 0
  if      (meetings >= 4) score += 15
  else if (meetings === 3) score += 12
  else if (meetings === 2) score += 8
  else if (meetings === 1) score += 4

  // ── 3. Tarefas concluídas (0–12 pts) ────────────────────────────────────
  const done = ctx.completedTaskCount ?? 0
  score += Math.min(done * 4, 12)

  // ── 4. Proposta criada / aceite (0–15 pts) ───────────────────────────────
  if (ctx.hasAcceptedProposal)              score += 15
  else if ((ctx.proposalCount ?? 0) > 0)   score += 8

  // ── 5. Actividade recente (0–15 pts) ────────────────────────────────────
  // Mantém o score vivo — sem contacto recente o lead "esfria"
  if (deal.last_activity_at) {
    const days = Math.floor((Date.now() - new Date(deal.last_activity_at).getTime()) / 86_400_000)
    if      (days <= 3)  score += 15
    else if (days <= 7)  score += 10
    else if (days <= 14) score += 5
    else if (days <= 30) score += 2
    // >30 dias: +0 (não penaliza o progresso já feito, mas não soma)
  }

  // ── 6. Próxima actividade agendada (0–10 pts) ────────────────────────────
  if (deal.next_activity) {
    const today = new Date().toISOString().slice(0, 10)
    if (deal.next_activity.due_date && deal.next_activity.due_date >= today) {
      score += 10  // tem follow-up marcado e não está atrasado
    } else if (deal.next_activity.due_date) {
      score += 3   // existe mas está atrasado
    }
  }

  // ── 7. Probabilidade definida (0–8 pts) ──────────────────────────────────
  // Peso menor — reflecte a estimativa do vendedor
  score += Math.round((deal.probability ?? 0) * 0.08)

  // ── 8. Dados de contacto preenchidos (0–5 pts) ───────────────────────────
  if (deal.contact_email) score += 2
  if (deal.contact_phone) score += 2
  if (deal.company_sector || deal.company_size) score += 1

  return Math.min(100, Math.max(0, Math.round(score)))
}

export function scoreColor(score: number): string {
  if (score >= 70) return '#2c5545'
  if (score >= 45) return '#a88030'
  return '#b83535'
}

export function scoreBg(score: number, isDark: boolean): string {
  if (score >= 70) return isDark ? '#0d2318' : '#f0faf4'
  if (score >= 45) return isDark ? '#2a1e08' : '#fdf6e3'
  return isDark ? '#2a0d0d' : '#fdf4f4'
}
