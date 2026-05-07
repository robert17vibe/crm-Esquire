import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/useThemeStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useTaskStore } from '@/store/useTaskStore'
import { CheckSquare, Clock, FileText, Tag, AlertCircle } from 'lucide-react'
import { getStageColor, STAGES, type StageId } from '@/constants/pipeline'
import { evaluateDealScore, scoreColor, scoreBg } from '@/lib/dealScore'
import type { Deal } from '@/types/deal.types'
import { useProposalStore } from '@/store/useProposalStore'
import { usePaymentStore } from '@/store/usePaymentStore'


interface DealCardProps {
  deal: Deal
  isOverlay?: boolean
  onMoveDeal?: (dealId: string, targetStage: StageId) => void
  dimmed?: boolean
  showScore?: boolean
  highlightNew?: boolean
}

// ─── DealCard (Aurea-style) ────────────────────────────────────────────────────

export function DealCard({ deal, isOverlay = false, dimmed = false, showScore = false, highlightNew = false }: DealCardProps) {
  const navigate      = useNavigate()
  const isDark        = useThemeStore((s) => s.isDark)
  const notifications = useNotificationStore((s) => s.notifications)
  const taskCount     = useTaskStore((s) => s.tasks.filter((t) => t.deal_id === deal.id && !t.completed_at).length)
  const [hovered, setHovered] = useState(false)

  const hasUnread = notifications.some((n) => n.dealId === deal.id && !n.read)
  const daysSinceCreated = deal.created_at
    ? Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86_400_000)
    : 999
  const isNew = daysSinceCreated <= 7 || hasUnread

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, disabled: isOverlay })

  const wasDraggingRef = useRef(false)
  useEffect(() => {
    if (isDragging) {
      wasDraggingRef.current = true
      setHovered(false)
    }
  }, [isDragging])
  const isWon     = deal.stage_id === 'closed_won'
  const isLost    = deal.stage_id === 'closed_lost'
  const isSpecial = isWon || isLost

  const stageColor  = getStageColor(deal.stage_id)
  const stageLabel  = STAGES.find((s) => s.id === deal.stage_id)?.label ?? deal.stage_id
  const dealProposalsRaw = useProposalStore((s) => s.byDeal[deal.id])
  const dealProposals = dealProposalsRaw ?? []
  const proposalCtx = (() => {
    if (!showScore || isSpecial) return {}
    return {
      proposalCount: dealProposals.length,
      hasAcceptedProposal: dealProposals.some((p) => p.status === 'accepted'),
    }
  })()
  const score = showScore && !isSpecial ? evaluateDealScore(deal, {
    pendingTaskCount: taskCount,
    ...proposalCtx,
  }) : null
  const tagCount = (deal.tags ?? []).length
  const hasOverduePayment = usePaymentStore((s) =>
    isWon && s.payments.some((p) => p.deal_id === deal.id && p.status === 'overdue')
  )
  const wonContract = usePaymentStore((s) =>
    isWon ? s.contracts.find((c) => c.deal_id === deal.id) : undefined
  )


  const cardBg = isWon  ? (isDark ? '#0d2318' : '#f0faf4')
               : isLost ? (isDark ? '#1f0e0e' : '#fdf4f4')
               :          (isDark ? `${stageColor}1f` : `${stageColor}13`)

  const cardBorderNormal = isSpecial
    ? (isDark ? '#2a2a28' : '#e0e2e6')
    : `${stageColor}22`
  const cardBorderHover  = isSpecial
    ? (isDark ? '#3a3a38' : '#c5c9d0')
    : `${stageColor}44`
  const cardBorderNew    = '#6b1212'
  const cardBorder       = hovered ? cardBorderHover : (highlightNew && isNew) ? cardBorderNew : cardBorderNormal
  const cardShadow       = isOverlay
    ? '0 20px 48px rgba(0,0,0,0.3), 0 6px 16px rgba(0,0,0,0.15)'
    : hovered ? (isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(16,24,40,0.10), 0 1px 3px rgba(16,24,40,0.06)')
    : '0 1px 2px rgba(16,24,40,0.04)'

  const textPrimary = isDark ? '#e8e4dc' : '#101828'
  const textSecond  = isDark ? '#a09b95' : '#475467'
  const textMuted   = isDark ? '#6b6560' : '#98a2b3'

  const cardOpacity = isDragging ? 0.2 : dimmed ? 0.15 : isLost ? 0.65 : 1

  // valor da proposta aceite (ou maior proposta) — só para Ganho
  const proposalValue = (() => {
    if (!isWon || !dealProposals.length) return null
    const accepted = dealProposals.filter((p) => p.status === 'accepted')
    const source = accepted.length ? accepted : dealProposals
    return Math.max(...source.map((p) => {
      const sub = p.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
      return sub - sub * ((p.discount_pct ?? 0) / 100)
    }))
  })()

  const cardStyle: React.CSSProperties = {
    borderRadius: '12px',
    backgroundColor: cardBg,
    border: `1px solid ${cardBorder}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '148px',
    boxShadow: cardShadow,
    transform: isOverlay ? 'rotate(1.5deg)' : CSS.Transform.toString(transform),
    transition: isOverlay ? undefined : transition,
    opacity: cardOpacity,
    cursor: isOverlay ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
    position: 'relative',
  }

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      onMouseEnter={() => { setHovered(true) }}
      onMouseLeave={() => { setHovered(false) }}
      onClick={isOverlay ? undefined : () => {
        if (wasDraggingRef.current) { wasDraggingRef.current = false; return }
        navigate(`/deal/${deal.id}`)
      }}
      className={cn('group/card w-full select-none')}
    >
      <div style={{ padding: '14px 14px 10px', flex: 1 }}>

        {/* ── Row 1: categoria (stage label) + menu ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: isSpecial ? (isWon ? '#2c5545' : '#c94444') : stageColor,
          }}>
            {isWon ? 'Ganho' : isLost ? 'Perdido' : stageLabel}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isNew && highlightNew && (
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: '#6b1212',
                boxShadow: '0 0 0 2px rgba(107,18,18,0.25)',
                flexShrink: 0,
              }} />
            )}
            {score !== null && (
              <span style={{
                fontSize: '9px', fontWeight: 700,
                color: scoreColor(score), backgroundColor: scoreBg(score, isDark),
                borderRadius: '999px', padding: '1px 6px',
              }}>{score}</span>
            )}
          </div>
        </div>

        {/* ── Row 2: dias em stage — só visível quando zap ativo e não é lead novo ── */}
        {highlightNew && !isNew && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '9px', fontWeight: 500,
              color: deal.days_in_stage > 30 ? '#a88030' : textMuted,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {deal.days_in_stage}d nesta etapa
            </span>
          </div>
        )}

        {/* ── Row 3: título / empresa ── */}
        <p className="line-clamp-2" style={{
          fontSize: '13px', fontWeight: 600, color: textPrimary,
          lineHeight: 1.35, letterSpacing: '-0.01em',
          textDecoration: isLost ? 'line-through' : 'none',
          textDecorationColor: textMuted,
          marginBottom: '3px',
        }}>
          {deal.company_name || deal.title}
        </p>

        {/* ── Row 4: contato · responsável ── */}
        {(deal.contact_name || deal.owner?.name) && (
          <p className="line-clamp-1" style={{ fontSize: '11px', color: textSecond, lineHeight: 1.3, marginBottom: '10px' }}>
            {[deal.contact_name, deal.owner?.name].filter(Boolean).join(' · ')}
          </p>
        )}


        {/* ── Footer: valor ganho + meta icons ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto', paddingTop: '6px' }}>
          {/* valor da proposta — só em Ganho */}
          {isWon && (
            proposalValue != null && proposalValue > 0 ? (
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#2c5545',
                fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.01em',
              }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(proposalValue)}
              </span>
            ) : (
              <span style={{ fontSize: '10px', color: '#a88030', fontWeight: 600 }}>Sem proposta</span>
            )
          )}

          {/* badge parcela vencida */}
          {hasOverduePayment && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              fontSize: '9px', fontWeight: 700, color: '#b83535',
              backgroundColor: 'rgba(184,53,53,0.12)', borderRadius: '999px',
              padding: '2px 6px',
            }}>
              <AlertCircle size={9} />
              Pagamento vencido
            </span>
          )}

          {/* badges de progresso pós-venda (closed_won) */}
          {isWon && wonContract && !hasOverduePayment && (() => {
            const ds = wonContract.delivery_status
            const ss = wonContract.signing_status
            if (ds === 'delivered') return (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: 700, color: '#2c5545', backgroundColor: 'rgba(44,85,69,0.12)', borderRadius: '999px', padding: '2px 6px' }}>
                ✓ Entregue
              </span>
            )
            if (ds === 'in_progress') return (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: 600, color: '#a88030', backgroundColor: 'rgba(168,128,48,0.12)', borderRadius: '999px', padding: '2px 6px' }}>
                Em entrega
              </span>
            )
            if (ss === 'unsigned') return (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: 600, color: '#6b6560', backgroundColor: 'rgba(107,101,96,0.10)', borderRadius: '999px', padding: '2px 6px' }}>
                Sem assinatura
              </span>
            )
            return null
          })()}

          {/* meta icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            {taskCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#3d7060', fontWeight: 600 }}>
                <CheckSquare size={11} />
                {taskCount}
              </span>
            )}
            {deal.notes && deal.notes.trim().length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: textMuted }}>
                <FileText size={10} />
              </span>
            )}
            {tagCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: textMuted }}>
                <Tag size={10} />
                {tagCount}
              </span>
            )}
            {deal.next_activity && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '2px',
                fontSize: '10px', fontWeight: 500,
                color: deal.next_activity.due_date < new Date().toISOString().slice(0, 10) ? '#b83535' : '#4d7aa8',
              }}>
                <Clock size={10} />
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ── Probability bar ── */}
      {!isSpecial && (deal.probability ?? 0) > 0 && (
        <div style={{ height: '3px', backgroundColor: isDark ? '#1a1a18' : '#f0f0f0', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${deal.probability}%`,
            background: deal.probability >= 70
              ? 'linear-gradient(90deg, #2c5545, #3d7060)'
              : deal.probability >= 40
              ? 'linear-gradient(90deg, #a88030, #f59e0b)'
              : 'linear-gradient(90deg, #8b2020, #b83535)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

    </div>
  )
}
