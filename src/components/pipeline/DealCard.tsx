import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/useThemeStore'
import { getStageColor, getTagStyle, STAGES, type StageId } from '@/constants/pipeline'
import type { Deal } from '@/types/deal.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)
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
          Editar lead
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
          Excluir lead
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

  const isWon     = deal.stage_id === 'closed_won'
  const isLost    = deal.stage_id === 'closed_lost'
  const isSpecial = isWon || isLost

  // Base colors
  const cardBg      = isWon
    ? (isDark ? '#0d1a14' : '#f0f7f3')
    : isLost
      ? (isDark ? '#1a1010' : '#f7f2f2')
      : (isDark ? '#161616' : '#ffffff')
  const cardBorder  = isDark ? '#242424' : '#e2e8f0'
  const textPrimary = isDark ? '#e2e8f0' : '#1e293b'
  const textMuted   = isDark ? '#4a5568' : '#94a3b8'
  const avatarBorder = `2px solid ${cardBg}`

  // Opacity
  const baseOpacity = isLost ? 0.75 : 1
  const cardOpacity = isDragging ? 0.3 : dimmed ? 0.2 : baseOpacity

  const cardStyle: React.CSSProperties = {
    borderRadius: '6px',
    backgroundColor: cardBg,
    border: `1px solid ${cardBorder}`,
    ...(isSpecial && { borderLeft: `3px solid ${stageColor}` }),
    overflow: 'hidden',
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

  const hasAvatars = (deal.stakeholders?.length ?? 0) > 0
  const extraCount = (deal.stakeholders?.length ?? 0) - 3

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
      {/* Top color bar — only for non-special stages */}
      {!isSpecial && (
        <div style={{ height: '3px', backgroundColor: stageColor }} />
      )}

      <div style={{ padding: '8px 10px' }}>

        {/* ── Line 1: Tag + days + menu ── */}
        <div className="flex items-center justify-between gap-1">
          {tagStyle && tag ? (
            <span
              className="truncate"
              style={{
                fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: tagStyle.bg, flex: 1, minWidth: 0,
              }}
            >
              {tag}
            </span>
          ) : (
            <span style={{ flex: 1 }} />
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <span style={{
              fontSize: '11px', fontWeight: 500,
              color: deal.days_in_stage > 90 ? '#8b1a1a' : textMuted,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {deal.days_in_stage}d
            </span>

            {!isOverlay && (
              <div className="relative opacity-0 group-hover/card:opacity-100 transition-opacity duration-100 shrink-0">
                <button
                  type="button"
                  aria-label="Opções"
                  onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v) }}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '18px', height: '18px', borderRadius: '4px',
                    border: `1px solid ${cardBorder}`, backgroundColor: 'transparent',
                    color: textMuted, cursor: 'pointer',
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

        {/* ── Line 2: Company name ── */}
        <p className="truncate" style={{ fontSize: '11px', fontWeight: 400, color: textMuted, marginTop: '8px' }}>
          {deal.company_name}
        </p>

        {/* ── Line 3: Deal title ── */}
        <p className="line-clamp-2" style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, lineHeight: 1.4, marginTop: '2px' }}>
          {deal.title}
        </p>

        {/* ── Won: value highlight ── */}
        {isWon && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
              Acordo fechado
            </p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#2d9e6b', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(Number(deal.value))}
            </p>
          </div>
        )}

        {/* ── Lost: loss reason ── */}
        {isLost && deal.loss_reason && (
          <p style={{ fontSize: '10px', color: textMuted, marginTop: '6px', fontStyle: 'italic', lineHeight: 1.4 }}>
            {deal.loss_reason}
          </p>
        )}

        {/* ── Line 4: Avatars ── */}
        {hasAvatars && (
          <div className="flex justify-end" style={{ marginTop: '10px' }}>
            {deal.stakeholders?.slice(0, 3).map((s, i) => (
              <div
                key={s.name}
                title={s.name}
                className="flex items-center justify-center text-white"
                style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  backgroundColor: s.color, border: avatarBorder,
                  marginLeft: i === 0 ? 0 : '-5px', fontSize: '7px',
                  fontWeight: 700, zIndex: 3 - i, position: 'relative', flexShrink: 0,
                }}
              >
                {s.initials}
              </div>
            ))}
            {extraCount > 0 && (
              <div
                className="flex items-center justify-center"
                style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  backgroundColor: cardBorder, border: avatarBorder,
                  marginLeft: '-5px', fontSize: '7px',
                  fontWeight: 600, color: textMuted,
                  zIndex: 0, position: 'relative', flexShrink: 0,
                }}
              >
                +{extraCount}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
