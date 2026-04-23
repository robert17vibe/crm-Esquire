import { useNavigate } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/useThemeStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getStageColor, getTagStyle, type StageId } from '@/constants/pipeline'
import type { Deal } from '@/types/deal.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

// ─── Alert system ─────────────────────────────────────────────────────────────

type AlertSeverity = 'high' | 'medium' | 'low'

interface DealAlert {
  id: string
  icon: string
  label: string
  severity: AlertSeverity
}

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  high:   '#dc2626',
  medium: '#b45309',
  low:    '#4a7c8a',
}

function evaluateDealAlerts(deal: Deal): DealAlert[] {
  const isSpecial = deal.stage_id === 'closed_won' || deal.stage_id === 'closed_lost'
  if (isSpecial) return []

  const alerts: DealAlert[] = []
  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // 1. Atividade vencida
  if (deal.next_activity?.due_date && deal.next_activity.due_date < todayStr) {
    alerts.push({ id: 'overdue', icon: '⏰', label: `Vencido: ${deal.next_activity.label}`, severity: 'high' })
  }

  // 2. Sem atividade há 7+ dias
  if (deal.last_activity_at) {
    const daysSince = Math.floor((today.getTime() - new Date(deal.last_activity_at).getTime()) / 86_400_000)
    if (daysSince >= 7) {
      alerts.push({ id: 'stale', icon: '🔥', label: `Sem atividade há ${daysSince}d`, severity: 'high' })
    }
  } else {
    const daysSinceCreated = Math.floor((today.getTime() - new Date(deal.created_at).getTime()) / 86_400_000)
    if (daysSinceCreated >= 2) {
      alerts.push({ id: 'sla', icon: '⚡', label: `${daysSinceCreated}d sem atividade registada`, severity: 'high' })
    }
  }

  // 3. Sem próxima atividade agendada
  if (!deal.next_activity) {
    alerts.push({ id: 'no-next', icon: '📅', label: 'Sem próxima atividade', severity: 'medium' })
  }

  // 4. Estagnado no estágio há muito tempo
  if (deal.days_in_stage > 30) {
    alerts.push({ id: 'stagnant', icon: '⏳', label: `${deal.days_in_stage}d neste estágio`, severity: 'low' })
  }

  return alerts
}

// ─── Probability bar ──────────────────────────────────────────────────────────

function probColor(pct: number): string {
  if (pct >= 70) return '#2d9e6b'
  if (pct >= 35) return '#d97706'
  return '#dc2626'
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface DealCardProps {
  deal: Deal
  isOverlay?: boolean
  onMoveDeal?: (dealId: string, targetStage: StageId) => void
  dimmed?: boolean
}

export function DealCard({ deal, isOverlay = false, dimmed = false }: DealCardProps) {
  const navigate      = useNavigate()
  const isDark        = useThemeStore((s) => s.isDark)
  const notifications = useNotificationStore((s) => s.notifications)

  const isNew = notifications.some((n) => n.dealId === deal.id && !n.read)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, disabled: isOverlay })

  const stageColor = getStageColor(deal.stage_id)
  const tag        = deal.tags?.[0]
  const tagStyle   = tag ? getTagStyle(tag) : null

  const tempCfg = {
    hot:  { label: '🔥', title: 'Lead quente',  color: '#dc2626' },
    warm: { label: '🌡',  title: 'Lead morno',   color: '#b45309' },
    cold: { label: '🧊', title: 'Lead frio',    color: '#4a7c8a' },
  } as const
  const tempDisplay = deal.lead_temperature ? tempCfg[deal.lead_temperature] : null

  const isWon     = deal.stage_id === 'closed_won'
  const isLost    = deal.stage_id === 'closed_lost'
  const isSpecial = isWon || isLost

  const alerts    = evaluateDealAlerts(deal)
  const topAlerts = alerts.slice(0, 2)

  const probability = Math.min(100, Math.max(0, deal.probability ?? 0))

  const cardBg     = isWon
    ? (isDark ? '#0d1a14' : '#f0f7f3')
    : isLost
      ? (isDark ? '#1a1010' : '#f7f2f2')
      : (isDark ? '#161616' : '#ffffff')
  const cardBorder  = isDark ? '#242424' : '#e2e8f0'
  const textPrimary = isDark ? '#e2e8f0' : '#1e293b'
  const textMuted   = isDark ? '#4a5568' : '#94a3b8'
  const trackBg     = isDark ? '#1e2022' : '#f1f5f9'

  const hasHighAlert = alerts.some((a) => a.severity === 'high')

  const baseOpacity = isLost ? 0.75 : 1
  const cardOpacity = isDragging ? 0.3 : dimmed ? 0.2 : baseOpacity

  const cardStyle: React.CSSProperties = {
    height: '130px',
    borderRadius: '6px',
    backgroundColor: cardBg,
    border: hasHighAlert && !isSpecial
      ? '1px solid rgba(197,48,48,0.35)'
      : `1px solid ${cardBorder}`,
    ...(isSpecial && { borderLeft: `3px solid ${stageColor}` }),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: isOverlay
      ? '0 12px 32px rgba(0,0,0,0.25)'
      : isDark
        ? '0 1px 4px rgba(0,0,0,0.3)'
        : '0 1px 3px rgba(0,0,0,0.06)',
    ...(isOverlay
      ? { transform: 'rotate(1.5deg)', opacity: 1 }
      : {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: cardOpacity,
        }),
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
      {/* Top color bar */}
      {!isSpecial && (
        <div style={{ height: '3px', backgroundColor: stageColor, flexShrink: 0 }} />
      )}

      <div style={{
        flex: 1, padding: '7px 10px 8px',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Row 1: tag + alerts + meta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {isNew && (
              <span style={{
                fontSize: '8px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#fff', backgroundColor: '#2c5545', borderRadius: '3px',
                padding: '1px 5px', flexShrink: 0,
              }}>NOVO</span>
            )}
            {tagStyle && tag && (
              <span className="truncate" style={{
                fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: tagStyle.bg, minWidth: 0,
              }}>{tag}</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {/* Alert dots */}
            {topAlerts.map((alert) => (
              <span
                key={alert.id}
                title={alert.label}
                style={{
                  fontSize: '9px', lineHeight: 1,
                  width: '16px', height: '16px',
                  borderRadius: '4px',
                  backgroundColor: `${SEVERITY_COLOR[alert.severity]}18`,
                  border: `1px solid ${SEVERITY_COLOR[alert.severity]}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'default',
                }}
              >
                {alert.icon}
              </span>
            ))}
            {alerts.length > 2 && (
              <span
                title={alerts.slice(2).map((a) => a.label).join(' · ')}
                style={{
                  fontSize: '8px', fontWeight: 700,
                  color: textMuted, cursor: 'default',
                }}
              >
                +{alerts.length - 2}
              </span>
            )}
            {tempDisplay && (
              <span title={tempDisplay.title} style={{ fontSize: '10px', lineHeight: 1, marginLeft: '1px' }}>{tempDisplay.label}</span>
            )}
            <span style={{
              fontSize: '11px', fontWeight: 500, fontVariantNumeric: 'tabular-nums',
              color: deal.days_in_stage > 90 ? '#8b1a1a' : textMuted,
            }}>
              {deal.days_in_stage}d
            </span>
          </div>
        </div>

        {/* Row 2: company name */}
        <p className="truncate" style={{
          fontSize: '11px', fontWeight: 400, color: textMuted,
          marginTop: '4px', flexShrink: 0,
        }}>
          {deal.company_name}
        </p>

        {/* Row 3: title */}
        <p className="line-clamp-2" style={{
          fontSize: '13px', fontWeight: 600, color: textPrimary,
          lineHeight: 1.35, marginTop: '3px',
          flex: 1, overflow: 'hidden',
        }}>
          {deal.title}
        </p>

        {/* Row 4: probability bar */}
        {!isSpecial && (
          <div style={{ marginTop: '5px', flexShrink: 0 }}>
            <div style={{
              height: '3px', borderRadius: '2px',
              backgroundColor: trackBg, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${probability}%`,
                backgroundColor: probColor(probability),
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{
              fontSize: '9px', color: textMuted,
              marginTop: '1px', textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {probability}%
            </p>
          </div>
        )}

        {/* Row 5: bottom — value + stakeholders */}
        <div style={{
          marginTop: isSpecial ? '6px' : '2px', flexShrink: 0,
          height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {isWon && Number(deal.value) > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#2d9e6b',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtCompact(Number(deal.value))}
              </span>
            )}
            {!isSpecial && Number(deal.value) > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 600, color: textMuted,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtCompact(Number(deal.value))}
              </span>
            )}
            {isLost && deal.loss_reason && (
              <span className="truncate" style={{
                fontSize: '10px', color: textMuted, fontStyle: 'italic',
                display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {deal.loss_reason}
              </span>
            )}
          </div>

          {stakeholders.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {stakeholders.map((s, i) => (
                <div key={s.name} title={s.name}
                  style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    backgroundColor: s.color, border: `2px solid ${cardBg}`,
                    marginLeft: i === 0 ? 0 : '-5px',
                    fontSize: '7px', fontWeight: 700, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 3 - i, position: 'relative', flexShrink: 0,
                  }}
                >
                  {s.initials}
                </div>
              ))}
              {extraCount > 0 && (
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: cardBorder, border: `2px solid ${cardBg}`,
                  marginLeft: '-5px', fontSize: '7px', fontWeight: 600, color: textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 0, position: 'relative', flexShrink: 0,
                }}>
                  +{extraCount}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
