import { useNavigate } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/useThemeStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getStageColor, getTagStyle, type StageId } from '@/constants/pipeline'
import { evaluateDealScore, scoreColor, scoreBg } from '@/lib/dealScore'
import type { Deal } from '@/types/deal.types'

function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

const TEMP_CFG = {
  hot:  { dot: '#ef4444', label: 'Quente' },
  warm: { dot: '#f59e0b', label: 'Morno'  },
  cold: { dot: '#60a5fa', label: 'Frio'   },
} as const

function probColor(p: number) {
  if (p >= 70) return '#22c55e'
  if (p >= 35) return '#f59e0b'
  return '#f87171'
}

interface DealCardProps {
  deal: Deal
  isOverlay?: boolean
  onMoveDeal?: (dealId: string, targetStage: StageId) => void
  dimmed?: boolean
  showScore?: boolean
}

export function DealCard({ deal, isOverlay = false, dimmed = false, showScore = false }: DealCardProps) {
  const navigate      = useNavigate()
  const isDark        = useThemeStore((s) => s.isDark)
  const notifications = useNotificationStore((s) => s.notifications)

  const isNew = notifications.some((n) => n.dealId === deal.id && !n.read)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, disabled: isOverlay })

  const isWon     = deal.stage_id === 'closed_won'
  const isLost    = deal.stage_id === 'closed_lost'
  const isSpecial = isWon || isLost

  const stageColor  = getStageColor(deal.stage_id)
  const tag         = deal.tags?.[0]
  const tagStyle    = tag ? getTagStyle(tag) : null
  const temp        = deal.lead_temperature ? TEMP_CFG[deal.lead_temperature] : null
  const probability = Math.min(100, Math.max(0, deal.probability ?? 0))
  const score       = showScore && !isSpecial ? evaluateDealScore(deal) : null
  const value       = Number(deal.value ?? 0)
  const today       = new Date().toISOString().slice(0, 10)
  const isOverdue   = !isSpecial && !!deal.next_activity?.due_date && deal.next_activity.due_date < today

  // SLA: lead stage + created >2h ago + no activity
  const isSLABreach = !isSpecial && deal.stage_id === 'leads' && !deal.last_activity_at &&
    (Date.now() - new Date(deal.created_at).getTime()) > 2 * 3600 * 1000

  // Competitor mentioned in notes
  const isCompetitorMentioned = !isSpecial && !!(deal.notes?.match(/concorrente|salesforce|pipedrive|hubspot|rdstation|moskit/i))

  // Proposal stage with no activity for 5+ days
  const isProposalOverdue = !isSpecial && deal.stage_id === 'proposal' &&
    (() => { const ref = deal.last_activity_at ?? deal.created_at; return (Date.now() - new Date(ref).getTime()) > 5 * 86_400_000 })()

  // ── theme tokens ──
  const cardBg      = isWon  ? (isDark ? '#0c1a10' : '#f0faf4')
                    : isLost ? (isDark ? '#1a0e0e' : '#fdf4f4')
                    :          (isDark ? '#18181b' : '#ffffff')
  const cardBorder  = isOverdue          ? (isDark ? '#7f1d1d55' : '#fca5a555')
                    : deal.days_in_stage > 30 ? (isDark ? '#44403c55' : '#d6d3d155')
                    :                      (isDark ? '#27272a'   : '#e4e4e7')
  const textPrimary = isDark ? '#f4f4f5' : '#18181b'
  const textMuted   = isDark ? '#52525b' : '#a1a1aa'
  const trackBg     = isDark ? '#27272a' : '#f4f4f5'

  const cardOpacity = isDragging ? 0.25 : dimmed ? 0.18 : isLost ? 0.7 : 1

  const cardStyle: React.CSSProperties = {
    height: '118px',
    borderRadius: '8px',
    backgroundColor: cardBg,
    border: isSpecial
      ? `1px solid ${cardBorder}`
      : `1px solid ${cardBorder}`,
    ...(isSpecial && { borderLeft: `3px solid ${stageColor}` }),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: isOverlay
      ? '0 16px 40px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.12)'
      : isDark
        ? '0 1px 3px rgba(0,0,0,0.4)'
        : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    ...(isOverlay
      ? { transform: 'rotate(2deg)', opacity: 1 }
      : { transform: CSS.Transform.toString(transform), transition, opacity: cardOpacity }),
  }

  const stakeholders = deal.stakeholders?.slice(0, 3) ?? []
  const extraCount   = (deal.stakeholders?.length ?? 0) - 3

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      onClick={isOverlay ? undefined : () => navigate(`/deal/${deal.id}`)}
      className={cn(
        'deal-card group/card w-full select-none',
        !isOverlay && !isDragging && 'cursor-grab active:cursor-grabbing',
      )}
    >
      {/* Stage color top strip */}
      {!isSpecial && (
        <div style={{ height: '3px', flexShrink: 0, background: stageColor }} />
      )}

      <div style={{ flex: 1, padding: '9px 11px 9px', display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '4px' }}>

        {/* Row 1: tag + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, minHeight: '16px' }}>
          {isNew && (
            <span style={{
              fontSize: '8px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#fff', backgroundColor: '#2c5545', borderRadius: '3px', padding: '1px 5px', flexShrink: 0,
            }}>NOVO</span>
          )}
          {isSLABreach && (
            <span title="SLA: sem contato há mais de 2h" style={{
              fontSize: '8px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#fff', backgroundColor: '#b45309', borderRadius: '3px', padding: '1px 5px', flexShrink: 0,
            }}>SLA</span>
          )}
          {isProposalOverdue && (
            <span title="Proposta sem resposta há 5+ dias" style={{
              fontSize: '8px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#fff', backgroundColor: '#7c3aed', borderRadius: '3px', padding: '1px 5px', flexShrink: 0,
            }}>PROP</span>
          )}
          {isCompetitorMentioned && (
            <span title="Competidor mencionado nas notas" style={{
              fontSize: '8px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#b45309', backgroundColor: '#fef3c7', borderRadius: '3px', padding: '1px 5px', flexShrink: 0, border: '1px solid #f59e0b40',
            }}>⚔</span>
          )}
          {tagStyle && tag && (
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: isDark ? tagStyle.bg : tagStyle.text ?? tagStyle.bg,
              backgroundColor: `${tagStyle.bg}18`, borderRadius: '3px', padding: '1px 5px', flexShrink: 0,
            }}>{tag}</span>
          )}
          <div style={{ flex: 1 }} />
          {/* Score badge */}
          {score !== null && (
            <span style={{
              fontSize: '9px', fontWeight: 800, letterSpacing: '0.04em',
              color: scoreColor(score),
              backgroundColor: scoreBg(score, isDark),
              borderRadius: '4px', padding: '1px 5px', flexShrink: 0,
            }}>{score}</span>
          )}
          {/* Temperature dot */}
          {temp && (
            <span title={temp.label} style={{
              width: '7px', height: '7px', borderRadius: '50%',
              backgroundColor: temp.dot, flexShrink: 0,
              boxShadow: `0 0 0 2px ${temp.dot}30`,
            }} />
          )}
          {/* Overdue indicator */}
          {isOverdue && (
            <span title={`Vencido: ${deal.next_activity?.label}`} style={{
              width: '5px', height: '5px', borderRadius: '50%',
              backgroundColor: '#ef4444', flexShrink: 0,
              animation: 'none',
            }} />
          )}
          <span style={{
            fontSize: '10px', fontWeight: 500, color: deal.days_in_stage > 30 ? '#a78060' : textMuted,
            fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>
            {deal.days_in_stage}d
          </span>
        </div>

        {/* Row 2: title */}
        <p className="line-clamp-2" style={{
          fontSize: '13px', fontWeight: 600, color: textPrimary,
          lineHeight: 1.3, flex: 1, overflow: 'hidden',
          letterSpacing: '-0.01em',
          textDecoration: isLost ? 'line-through' : 'none',
          textDecorationColor: textMuted,
        }}>
          {deal.title}
        </p>

        {/* Row 3: company */}
        <p className="truncate" style={{
          fontSize: '11px', fontWeight: 400, color: textMuted, flexShrink: 0,
        }}>
          {deal.company_name}
        </p>

        {/* Row 4: value + probability + avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, height: '20px' }}>

          {/* Value */}
          {value > 0 && (
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: isWon ? '#16a34a' : isDark ? '#a1a1aa' : '#52525b',
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', flexShrink: 0,
            }}>
              {fmtCompact(value)}
            </span>
          )}

          {/* Probability bar */}
          {!isSpecial && probability > 0 && (
            <div style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: trackBg, overflow: 'hidden', minWidth: '24px' }}>
              <div style={{
                height: '100%', width: `${probability}%`,
                backgroundColor: probColor(probability),
                borderRadius: '2px',
              }} />
            </div>
          )}

          {/* Lost reason */}
          {isLost && deal.loss_reason && (
            <span className="truncate" style={{ fontSize: '10px', color: textMuted, fontStyle: 'italic', flex: 1 }}>
              {deal.loss_reason}
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Stakeholder avatars */}
          {stakeholders.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {stakeholders.map((s, i) => (
                <div key={s.name} title={s.name} style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: s.color, border: `2px solid ${cardBg}`,
                  marginLeft: i === 0 ? 0 : '-5px',
                  fontSize: '7px', fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 3 - i, position: 'relative', flexShrink: 0,
                }}>{s.initials}</div>
              ))}
              {extraCount > 0 && (
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: trackBg, border: `2px solid ${cardBg}`,
                  marginLeft: '-5px', fontSize: '7px', fontWeight: 600, color: textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', flexShrink: 0,
                }}>+{extraCount}</div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
