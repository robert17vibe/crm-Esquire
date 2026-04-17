import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Video,
  Phone,
  CheckSquare,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/useThemeStore'
import { getStageColor, getTagStyle, STAGES, type StageId } from '@/constants/pipeline'
import type { Deal, NextActivity } from '@/types/deal.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: number): string {
  if (value === 0) return 'R$ —'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function daysDiff(isoDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(isoDate)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function activityUrgency(dueDate: string): { label: string; color: string } {
  const diff = daysDiff(dueDate)
  if (diff < 0)  return { label: `Atrasado ${Math.abs(diff)}d`, color: '#c53030' }
  if (diff === 0) return { label: 'Hoje',   color: '#b45309' }
  if (diff === 1) return { label: 'Amanhã', color: '#b45309' }
  return { label: `Em ${diff}d`, color: '#64748b' }
}

const ACTIVITY_ICONS: Record<NextActivity['type'], typeof Video> = {
  meeting: Video,
  call:    Phone,
  task:    CheckSquare,
  email:   Mail,
}

// ─── Card context menu ────────────────────────────────────────────────────────

function CardMenu({
  deal,
  onMove,
  onEdit,
  onDelete,
  onClose,
  isDark,
}: {
  deal: Deal
  onMove: (s: StageId) => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  isDark: boolean
}) {
  const menuBg     = isDark ? '#1a1a1a' : '#ffffff'
  const menuBorder = isDark ? '#2a2a2a' : '#e2e8f0'
  const hoverBg    = isDark ? '#222222' : '#f8fafc'
  const textMain   = isDark ? '#c8d0da' : '#334155'
  const textMuted  = isDark ? '#4a5568' : '#94a3b8'

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={(e) => { e.stopPropagation(); onClose() }} />
      <div
        className="absolute right-0 top-full mt-1 z-50 py-1"
        style={{
          backgroundColor: menuBg,
          border: `1px solid ${menuBorder}`,
          borderRadius: '8px',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
          width: '172px',
        }}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
          style={{ fontSize: '12px', fontWeight: 500, color: textMain, backgroundColor: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Pencil style={{ width: '11px', height: '11px', flexShrink: 0, color: textMuted }} />
          Editar deal
        </button>

        <div style={{ height: '1px', backgroundColor: menuBorder, margin: '4px 8px' }} />

        <p style={{ fontSize: '9px', fontWeight: 700, color: textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px 2px' }}>
          Mover para
        </p>
        {STAGES.filter((s) => s.id !== deal.stage_id).map((stage) => (
          <button
            key={stage.id}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onMove(stage.id) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
            style={{ fontSize: '12px', fontWeight: 500, color: textMain, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stage.color, flexShrink: 0 }} />
            {stage.label}
          </button>
        ))}

        <div style={{ height: '1px', backgroundColor: menuBorder, margin: '4px 8px' }} />

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
          style={{ fontSize: '12px', fontWeight: 500, color: '#c53030', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Trash2 style={{ width: '11px', height: '11px', flexShrink: 0 }} />
          Excluir deal
        </button>
      </div>
    </>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface DealCardProps {
  deal: Deal
  isOverlay?: boolean
  onMoveDeal?: (dealId: string, targetStage: StageId) => void
  onEditDeal?: (deal: Deal) => void
  onDeleteDeal?: (dealId: string) => void
  dimmed?: boolean
}

export function DealCard({
  deal,
  isOverlay = false,
  onMoveDeal,
  onEditDeal,
  onDeleteDeal,
  dimmed = false,
}: DealCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const navigate  = useNavigate()
  const isDark    = useThemeStore((s) => s.isDark)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, disabled: isOverlay })

  const stageColor = getStageColor(deal.stage_id)
  const tag        = deal.tags?.[0]
  const tagStyle   = tag ? getTagStyle(tag) : null

  // ── Colors per mode ──────────────────────────────────────────────────────
  const cardBg      = isDark ? '#161616' : '#ffffff'
  const cardBorder  = isDark ? '#242424' : '#e2e8f0'
  const textPrimary = isDark ? '#e2e8f0' : '#1e293b'
  const textSecond  = isDark ? '#4a5568' : '#94a3b8'
  const textValue   = isDark ? '#f1f5f9' : '#0f172a'
  const trackBg     = isDark ? '#1e1e1e' : '#f1f5f9'
  const avatarBorder = `2px solid ${isDark ? '#161616' : '#ffffff'}`

  const cardStyle: React.CSSProperties = {
    borderRadius: '6px',
    backgroundColor: cardBg,
    borderTop:    `1px solid ${cardBorder}`,
    borderRight:  `1px solid ${cardBorder}`,
    borderBottom: `1px solid ${cardBorder}`,
    borderLeft:   `3px solid ${stageColor}`,
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
          opacity: isDragging ? 0.3 : dimmed ? 0.2 : 1,
        }),
  }

  // ── Activity ──────────────────────────────────────────────────────────────
  let activityNode: React.ReactNode = null
  if (deal.next_activity) {
    const { label, color } = activityUrgency(deal.next_activity.due_date)
    const Icon = ACTIVITY_ICONS[deal.next_activity.type]
    activityNode = (
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <Icon style={{ width: '10px', height: '10px', flexShrink: 0, color }} />
        <span className="truncate" style={{ fontSize: '10px', color, fontWeight: 500 }}>{label}</span>
      </div>
    )
  }

  const hasAvatars = (deal.stakeholders?.length ?? 0) > 0
  const extraCount = (deal.stakeholders?.length ?? 0) - 3
  const showFooter = activityNode !== null || hasAvatars

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
      <div style={{ padding: '8px 10px' }}>

        {/* ── Row 1: Company + menu + days ── */}
        <div className="flex items-center justify-between gap-1">
          <p
            className="truncate"
            style={{ fontSize: '10px', fontWeight: 700, color: textSecond, letterSpacing: '0.03em', textTransform: 'uppercase', flex: 1, minWidth: 0 }}
          >
            {deal.company_name}
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Days badge */}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: deal.days_in_stage > 90
                  ? (isDark ? '#fc8181' : '#c53030')
                  : textSecond,
                backgroundColor: deal.days_in_stage > 90
                  ? (isDark ? '#2d1515' : '#fff5f5')
                  : 'transparent',
                borderRadius: '3px',
                padding: deal.days_in_stage > 90 ? '1px 5px' : '0',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {deal.days_in_stage}d
            </span>

            {/* Context menu trigger */}
            {!isOverlay && (
              <div className="relative opacity-0 group-hover/card:opacity-100 transition-opacity duration-100 shrink-0">
                <button
                  type="button"
                  aria-label="Opções"
                  onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v) }}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: `1px solid ${cardBorder}`,
                    backgroundColor: 'transparent',
                    color: textSecond,
                    cursor: 'pointer',
                  }}
                >
                  <MoreHorizontal style={{ width: '10px', height: '10px' }} />
                </button>
                {showMenu && (
                  <CardMenu
                    deal={deal}
                    isDark={isDark}
                    onMove={(s) => { onMoveDeal?.(deal.id, s); setShowMenu(false) }}
                    onEdit={() => { onEditDeal?.(deal); setShowMenu(false) }}
                    onDelete={() => { onDeleteDeal?.(deal.id); setShowMenu(false) }}
                    onClose={() => setShowMenu(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: Deal title ── */}
        <p
          className="line-clamp-2"
          style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, lineHeight: 1.35, marginTop: '4px', letterSpacing: '-0.01em' }}
        >
          {deal.title}
        </p>

        {/* ── Row 3: Tag ── */}
        {tagStyle && tag && (
          <div style={{ marginTop: '5px' }}>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: tagStyle.bg,
                border: `1px solid ${tagStyle.bg}40`,
                borderRadius: '3px',
                padding: '1px 5px',
                backgroundColor: `${tagStyle.bg}12`,
              }}
            >
              {tag}
            </span>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: '1px', backgroundColor: isDark ? '#1e1e1e' : '#f1f5f9', margin: '7px 0' }} />

        {/* ── Row 4: Value + Probability ── */}
        <div className="flex items-baseline justify-between">
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: textValue,
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'monospace',
              letterSpacing: '-0.02em',
            }}
          >
            {formatValue(deal.value)}
          </span>
          {deal.probability > 0 && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: textSecond, flexShrink: 0, marginLeft: '6px', fontVariantNumeric: 'tabular-nums' }}>
              {deal.probability}%
            </span>
          )}
        </div>

        {/* ── Row 5: Progress bar ── */}
        {deal.probability > 0 && (
          <div
            style={{ height: '3px', borderRadius: '99px', backgroundColor: trackBg, marginTop: '4px', overflow: 'hidden' }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: '99px',
                width: `${deal.probability}%`,
                backgroundColor: stageColor,
                transition: 'width 0.5s ease',
                opacity: 0.85,
              }}
            />
          </div>
        )}

        {/* ── Row 6: Footer ── */}
        {showFooter && (
          <div className="flex items-center justify-between" style={{ marginTop: '6px' }}>
            {activityNode ?? <span className="flex-1" />}
            {hasAvatars && (
              <div className="flex shrink-0 ml-2">
                {deal.stakeholders?.slice(0, 3).map((s, i) => (
                  <div
                    key={s.initials}
                    title={s.name}
                    className="flex items-center justify-center text-white"
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: s.color, border: avatarBorder,
                      marginLeft: i === 0 ? 0 : '-5px', fontSize: '6px',
                      fontWeight: 700, zIndex: 3 - i, position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    {s.initials}
                  </div>
                ))}
                {extraCount > 0 && (
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: trackBg, border: avatarBorder,
                      marginLeft: '-5px', fontSize: '6px',
                      fontWeight: 600, color: textSecond,
                      zIndex: 0, position: 'relative', flexShrink: 0,
                    }}
                  >
                    +{extraCount}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
