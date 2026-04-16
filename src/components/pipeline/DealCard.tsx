import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronRight,
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
  if (diff < 0)  return { label: `Atrasado ${Math.abs(diff)}d`, color: '#ef4444' }
  if (diff === 0) return { label: 'Hoje',   color: '#f59e0b' }
  if (diff === 1) return { label: 'Amanhã', color: '#f59e0b' }
  return { label: `Em ${diff}d`, color: '#8b8aa3' }
}

const ACTIVITY_ICONS: Record<NextActivity['type'], typeof Video> = {
  meeting: Video,
  call:    Phone,
  task:    CheckSquare,
  email:   Mail,
}

// ─── Stage picker ─────────────────────────────────────────────────────────────

function StagePicker({
  currentStage,
  onSelect,
  onClose,
}: {
  currentStage: StageId
  onSelect: (s: StageId) => void
  onClose: () => void
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onPointerDown={(e) => { e.stopPropagation(); onClose() }}
      />
      <div
        className="absolute right-0 top-full mt-1 z-50 bg-surface-card rounded-[12px] border border-line py-1.5 w-44"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}
      >
        <p className="text-[9px] font-bold text-ink-muted uppercase tracking-widest px-3 py-1">
          Mover para
        </p>
        {STAGES.filter((s) => s.id !== currentStage).map((stage) => (
          <button
            key={stage.id}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSelect(stage.id) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-ink-base hover:bg-surface-col transition-colors text-left"
            style={{ fontSize: '12px', fontWeight: 500 }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
            {stage.label}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface DealCardProps {
  deal: Deal
  isOverlay?: boolean
  onMoveDeal?: (dealId: string, targetStage: StageId) => void
  dimmed?: boolean
}

export function DealCard({
  deal,
  isOverlay = false,
  onMoveDeal,
  dimmed = false,
}: DealCardProps) {
  const [showPicker, setShowPicker] = useState(false)
  const navigate  = useNavigate()
  const isDark    = useThemeStore((s) => s.isDark)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, disabled: isOverlay })

  const stageColor = getStageColor(deal.stage_id)
  const tag        = deal.tags?.[0]
  const tagStyle   = tag ? getTagStyle(tag) : null

  // ── Per-mode values ──
  const cardShadow = isOverlay
    ? '0 8px 24px rgba(91,80,232,0.18)'
    : isDark
      ? '0 1px 6px rgba(0,0,0,0.2)'
      : '0 1px 4px rgba(91,80,232,0.06)'

  const avatarBorder = `2px solid ${isDark ? '#1e1c35' : 'white'}`

  const cardStyle = {
    borderRadius: '12px',
    boxShadow: cardShadow,
    ...(isOverlay
      ? { transform: 'rotate(2deg)' }
      : {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.35 : dimmed ? 0.25 : 1,
          scale: isDragging ? '0.95' : '1',
        }),
  }

  // ── Activity node (hidden if no next activity) ──
  let activityNode: React.ReactNode = null
  if (deal.next_activity) {
    const { label, color } = activityUrgency(deal.next_activity.due_date)
    const Icon = ACTIVITY_ICONS[deal.next_activity.type]
    activityNode = (
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <Icon style={{ width: '11px', height: '11px', flexShrink: 0, color }} />
        <span className="truncate" style={{ fontSize: '11px', color }}>
          {label}
        </span>
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
        'bg-white dark:bg-[#1e1c35]',
        'border border-[#e8e5f8] dark:border-[#2e2b4a]',
        !isOverlay && !isDragging && 'cursor-grab active:cursor-grabbing',
        !isOverlay && !isDragging && 'hover:shadow-[0_3px_12px_rgba(91,80,232,0.12)]',
        isOverlay && 'cursor-grabbing',
      )}
    >
      <div style={{ padding: '12px 14px' }}>

        {/* ── Line 1: Tag + move button + days ── */}
        <div className="flex items-center gap-1.5">

          {/* Tag */}
          <div className="flex-1 min-w-0">
            {tagStyle && tag ? (
              <span
                className="inline-block uppercase"
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  borderRadius: '99px',
                  padding: '2px 8px',
                  // Light: solid bg + white text | Dark: 15% tint + solid color text
                  backgroundColor: isDark ? `${tagStyle.bg}26` : tagStyle.bg,
                  color:           isDark ? tagStyle.bg          : 'white',
                  transition: 'background-color 0.3s ease, color 0.3s ease',
                }}
              >
                {tag}
              </span>
            ) : (
              <span style={{ display: 'inline-block', height: '18px' }} />
            )}
          </div>

          {/* Move picker trigger — visible on hover */}
          {!isOverlay && (
            <div className="relative opacity-0 group-hover/card:opacity-100 transition-opacity duration-150 shrink-0">
              <button
                type="button"
                aria-label="Mover"
                onClick={(e) => { e.stopPropagation(); setShowPicker((v) => !v) }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center justify-center rounded-[6px] border border-line text-ink-muted hover:text-brand hover:border-brand/40 transition-colors"
                style={{ width: '16px', height: '16px' }}
              >
                <ChevronRight style={{ width: '10px', height: '10px' }} />
              </button>
              {showPicker && (
                <StagePicker
                  currentStage={deal.stage_id}
                  onSelect={(s) => { onMoveDeal?.(deal.id, s); setShowPicker(false) }}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </div>
          )}

          {/* Days in stage */}
          {deal.days_in_stage > 90 ? (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                // Light: #fff1f1 bg / #ef4444 text | Dark: #3a1a1a bg / #f87171 text
                color:           isDark ? '#f87171' : '#ef4444',
                backgroundColor: isDark ? '#3a1a1a' : '#fff1f1',
                borderRadius: '99px',
                padding: '2px 6px',
                flexShrink: 0,
                transition: 'background-color 0.3s ease, color 0.3s ease',
              }}
            >
              {deal.days_in_stage}d
            </span>
          ) : (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                // Light: #8b8aa3 | Dark: #6b69a3
                color: isDark ? '#6b69a3' : '#8b8aa3',
                flexShrink: 0,
                transition: 'color 0.3s ease',
              }}
            >
              {deal.days_in_stage}d
            </span>
          )}
        </div>

        {/* ── Line 2: Company name ── */}
        <p
          className="truncate"
          style={{ fontSize: '11px', fontWeight: 400, color: '#8b8aa3', marginTop: '8px' }}
        >
          {deal.company_name}
        </p>

        {/* ── Line 3: Deal title ── */}
        <p
          className="text-[#1a1a2e] dark:text-[#e8e6ff] line-clamp-2"
          style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4, marginTop: '4px' }}
        >
          {deal.title}
        </p>

        {/* ── Line 4: Value + Probability ── */}
        <div className="flex items-baseline justify-between" style={{ marginTop: '8px' }}>
          <span
            className="text-[#1a1a2e] dark:text-[#e8e6ff]"
            style={{ fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          >
            {formatValue(deal.value)}
          </span>
          {deal.probability > 0 && (
            <span
              style={{ fontSize: '11px', color: '#8b8aa3', flexShrink: 0, marginLeft: '6px' }}
            >
              {deal.probability}%
            </span>
          )}
        </div>

        {/* ── Line 5: Progress bar ── */}
        {deal.probability > 0 && (
          <div
            className="rounded-full overflow-hidden bg-[#eeecf9] dark:bg-[#2a2860]"
            style={{ height: '4px', marginTop: '4px' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${deal.probability}%`,
                backgroundColor: stageColor,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        )}

        {/* ── Line 6: Footer (activity + avatars) ── */}
        {showFooter && (
          <div className="flex items-center justify-between" style={{ marginTop: '10px' }}>

            {/* Activity — hidden if no next_activity */}
            {activityNode ?? <span className="flex-1" />}

            {/* Avatar stack */}
            {hasAvatars && (
              <div className="flex shrink-0 ml-2">
                {deal.stakeholders?.slice(0, 3).map((s, i) => (
                  <div
                    key={s.initials}
                    title={s.name}
                    className="flex items-center justify-center text-white font-bold"
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: s.color,
                      border: avatarBorder,
                      marginLeft: i === 0 ? 0 : '-6px',
                      fontSize: '7px',
                      zIndex: 3 - i,
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'border-color 0.3s ease',
                    }}
                  >
                    {s.initials}
                  </div>
                ))}
                {extraCount > 0 && (
                  <div
                    className="flex items-center justify-center font-semibold"
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--surface-col)',
                      border: avatarBorder,
                      marginLeft: '-6px',
                      fontSize: '7px',
                      color: 'var(--ink-muted)',
                      zIndex: 0,
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'border-color 0.3s ease, background-color 0.3s ease',
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
