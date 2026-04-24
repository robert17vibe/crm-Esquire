import type { Deal } from '@/types/deal.types'

export function evaluateDealScore(deal: Deal): number {
  if (['closed_won', 'closed_lost'].includes(deal.stage_id)) return 0

  let score = 45
  const today = new Date().toISOString().slice(0, 10)

  // ── Activity recency ──────────────────────────────────────────────────────
  if (deal.last_activity_at) {
    const days = Math.floor((Date.now() - new Date(deal.last_activity_at).getTime()) / 86_400_000)
    if      (days <= 2)  score += 20
    else if (days <= 7)  score += 10
    else if (days <= 14) score -= 5
    else if (days <= 30) score -= 15
    else                 score -= 25
  } else {
    score -= 15
  }

  // ── Next activity ─────────────────────────────────────────────────────────
  if (deal.next_activity) {
    if (deal.next_activity.due_date && deal.next_activity.due_date < today) {
      score -= 18  // overdue
    } else {
      score += 14  // scheduled and on time
    }
  } else {
    score -= 10  // nothing planned
  }

  // ── Probability (0-20 pts) ────────────────────────────────────────────────
  score += Math.round((deal.probability ?? 0) * 0.2)

  // ── Stagnation ───────────────────────────────────────────────────────────
  if      (deal.days_in_stage > 60) score -= 18
  else if (deal.days_in_stage > 30) score -= 9
  else if (deal.days_in_stage > 14) score -= 3

  // ── Data completeness ─────────────────────────────────────────────────────
  if (deal.contact_email) score += 3
  if (deal.contact_phone) score += 2

  return Math.min(100, Math.max(0, Math.round(score)))
}

export function scoreColor(score: number): string {
  if (score >= 70) return '#16a34a'
  if (score >= 45) return '#d97706'
  return '#dc2626'
}

export function scoreBg(score: number, isDark: boolean): string {
  if (score >= 70) return isDark ? '#14532d30' : '#dcfce7'
  if (score >= 45) return isDark ? '#78350f30' : '#fef3c7'
  return isDark ? '#7f1d1d30' : '#fee2e2'
}
