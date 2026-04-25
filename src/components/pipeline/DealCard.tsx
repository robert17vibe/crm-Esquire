import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/useThemeStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useToastStore } from '@/store/useToastStore'
import { FileText } from 'lucide-react'
import { getStageColor, getTagStyle, type StageId } from '@/constants/pipeline'
import { evaluateDealScore, scoreColor, scoreBg } from '@/lib/dealScore'
import type { Deal } from '@/types/deal.types'


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
  highlightNew?: boolean
}

// ─── Task Quick-Add Popover ───────────────────────────────────────────────────

function TaskQuickAdd({ dealId, isDark, onClose }: { dealId: string; isDark: boolean; onClose: () => void }) {
  const createTask = useTaskStore((s) => s.create)
  const addToast   = useToastStore((s) => s.addToast)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function getDate(offset: number) {
    const d = new Date(); d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
  }

  async function save(dueDate: string | null) {
    if (!title.trim() || saving) return
    setSaving(true)
    const err = await createTask({ title: title.trim(), deal_id: dealId, due_date: dueDate, priority: 'medium', task_type: 'follow_up' })
    setSaving(false)
    if (!err) { addToast('Tarefa criada', 'success'); onClose() }
    else addToast('Erro ao criar tarefa', 'error')
  }

  const bg     = isDark ? '#1a1a18' : '#ffffff'
  const border = isDark ? '#2e2e2c' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#5a5652' : '#8a857d'

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, marginTop: '4px',
        backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '8px',
        padding: '10px', boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(getDate(0)); if (e.key === 'Escape') onClose() }}
        placeholder="O que precisa ser feito?"
        style={{
          width: '100%', height: '30px', padding: '0 8px', fontSize: '12px',
          backgroundColor: isDark ? '#111110' : '#f5f4f0', border: `1px solid ${border}`,
          borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '4px' }}>
        {[
          { label: 'Hoje', date: getDate(0) },
          { label: 'Amanhã', date: getDate(1) },
          { label: 'Prox sem', date: getDate(7) },
        ].map(({ label, date }) => (
          <button key={label} type="button" onClick={() => save(date)} disabled={!title.trim() || saving}
            style={{
              flex: 1, height: '26px', fontSize: '10px', fontWeight: 600,
              backgroundColor: title.trim() ? (isDark ? '#0d1a14' : '#f0f7f3') : (isDark ? '#111110' : '#f5f4f0'),
              color: title.trim() ? (isDark ? '#a0c4b4' : '#2c5545') : muted,
              border: `1px solid ${title.trim() ? (isDark ? '#1e4a38' : '#a3d9c0') : border}`,
              borderRadius: '5px', cursor: title.trim() ? 'pointer' : 'not-allowed',
            }}>{label}</button>
        ))}
      </div>
      <button type="button" onClick={() => onClose()}
        style={{ alignSelf: 'flex-end', fontSize: '10px', color: muted, background: 'none', border: 'none', cursor: 'pointer' }}>
        Cancelar
      </button>
    </div>
  )
}

// ─── DealCard ─────────────────────────────────────────────────────────────────

export function DealCard({ deal, isOverlay = false, dimmed = false, showScore = false, highlightNew = false }: DealCardProps) {
  const navigate      = useNavigate()
  const isDark        = useThemeStore((s) => s.isDark)
  const notifications = useNotificationStore((s) => s.notifications)
  const taskCount     = useTaskStore((s) => s.tasks.filter((t) => t.deal_id === deal.id && !t.completed_at).length)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const isNew = notifications.some((n) => n.dealId === deal.id && !n.read)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, disabled: isOverlay })

  const isWon     = deal.stage_id === 'closed_won'
  const isLost    = deal.stage_id === 'closed_lost'
  const isSpecial = isWon || isLost

  const stageColor  = getStageColor(deal.stage_id)
  const tag         = deal.tags?.[0]
  const tagStyle    = tag ? getTagStyle(tag) : null
  const probability = Math.min(100, Math.max(0, deal.probability ?? 0))
  const score       = showScore && !isSpecial ? evaluateDealScore(deal) : null
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
  const cardBg     = isWon  ? (isDark ? '#0a1f0e' : '#f0faf4')
                   : isLost ? (isDark ? '#1a0c0c' : '#fdf4f4')
                   :          'var(--surface-card)'
  const isHighlighted = highlightNew && isNew
  const cardBorder = isHighlighted            ? (isDark ? 'rgba(234,179,8,0.5)' : 'rgba(234,179,8,0.6)')
                   : isOverdue               ? (isDark ? 'rgba(220,38,38,0.3)'  : 'rgba(252,165,165,0.6)')
                   : deal.days_in_stage > 30 ? (isDark ? 'rgba(120,113,108,0.3)' : 'rgba(214,211,209,0.8)')
                   :                           'var(--line)'
  const textPrimary = 'var(--ink-base)'
  const textMuted   = 'var(--ink-muted)'
  const trackBg     = 'var(--surface-raised)'

  const cardOpacity = isDragging ? 0.2 : dimmed ? 0.15 : isLost ? 0.65 : 1

  const cardStyle: React.CSSProperties = {
    borderRadius: 'var(--radius-lg)',
    backgroundColor: isHighlighted ? (isDark ? '#1a1500' : '#fffbeb') : cardBg,
    border: `1px solid ${cardBorder}`,
    ...(isSpecial && { borderLeft: `3px solid ${stageColor}` }),
    ...(isHighlighted && !isSpecial && { borderLeft: '3px solid #eab308' }),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '128px',
    boxShadow: isHighlighted ? (isDark ? '0 0 0 1px rgba(234,179,8,0.2)' : '0 0 0 1px rgba(234,179,8,0.15)') : isOverlay ? '0 20px 48px rgba(0,0,0,0.3), 0 6px 16px rgba(0,0,0,0.15)' : 'none',
    ...(isOverlay
      ? { transform: 'rotate(1.5deg)', opacity: 1 }
      : { transform: CSS.Transform.toString(transform), transition, opacity: cardOpacity }),
  }

  const stakeholders = deal.stakeholders?.slice(0, 3) ?? []
  const extraCount   = (deal.stakeholders?.length ?? 0) - 3

  return (
    <div style={{ position: 'relative', width: '100%' }}>
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      onClick={isOverlay ? undefined : () => { if (!showQuickAdd) navigate(`/deal/${deal.id}`) }}
      className={cn(
        'deal-card group/card w-full select-none',
        !isOverlay && !isDragging && 'cursor-grab active:cursor-grabbing',
      )}
    >
      {/* Stage color top strip */}
      {!isSpecial && (
        <div style={{ height: '3px', flexShrink: 0, background: stageColor }} />
      )}

      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '5px' }}>

        {/* Row 1: badges + score + days */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, minHeight: '16px' }}>
          {isNew && (
            <span style={{
              fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#fff', backgroundColor: 'var(--brand)', borderRadius: 'var(--radius-full)', padding: '1px 6px', flexShrink: 0,
            }}>NOVO</span>
          )}
          {isSLABreach && (
            <span title="SLA: sem contato há mais de 2h" style={{
              fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#fff', backgroundColor: '#b45309', borderRadius: 'var(--radius-full)', padding: '1px 6px', flexShrink: 0,
            }}>SLA</span>
          )}
          {isProposalOverdue && (
            <span title="Proposta sem resposta há 5+ dias" style={{
              fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#fff', backgroundColor: '#7c3aed', borderRadius: 'var(--radius-full)', padding: '1px 6px', flexShrink: 0,
            }}>PROP</span>
          )}
          {isCompetitorMentioned && (
            <span title="Competidor mencionado" style={{
              fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#b45309', backgroundColor: isDark ? 'rgba(180,83,9,0.15)' : '#fef3c7',
              borderRadius: 'var(--radius-full)', padding: '1px 6px', flexShrink: 0,
            }}>⚔</span>
          )}
          <div style={{ flex: 1 }} />
          {score !== null && (
            <span style={{
              fontSize: '9px', fontWeight: 700,
              color: scoreColor(score), backgroundColor: scoreBg(score, isDark),
              borderRadius: 'var(--radius-full)', padding: '1px 6px', flexShrink: 0,
            }}>{score}</span>
          )}
          {isOverdue && (
            <span title={`Vencido: ${deal.next_activity?.label}`} style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: '#ef4444', flexShrink: 0,
            }} />
          )}
          <span style={{
            fontSize: '10px', fontWeight: 500,
            color: deal.days_in_stage > 30 ? '#b45309' : textMuted,
            fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>{deal.days_in_stage}d</span>
        </div>

        {/* Row 2: title */}
        <p className="line-clamp-2" style={{
          fontSize: '13.5px', fontWeight: 600, color: textPrimary,
          lineHeight: 1.35, flex: 1, overflow: 'hidden',
          letterSpacing: '-0.015em',
          textDecoration: isLost ? 'line-through' : 'none',
          textDecorationColor: textMuted,
        }}>
          {deal.title}
        </p>

        {/* Row 3: company */}
        <p className="truncate" style={{ fontSize: '11px', fontWeight: 400, color: textMuted, flexShrink: 0 }}>
          {deal.company_name}
        </p>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--line)', flexShrink: 0, marginTop: '1px' }} />

        {/* Row 4: prob bar + avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
          {!isSpecial && probability > 0 && (
            <div style={{ flex: 1, height: '5px', borderRadius: '999px', backgroundColor: trackBg, overflow: 'hidden', minWidth: '20px' }}>
              <div style={{ height: '100%', width: `${probability}%`, backgroundColor: probColor(probability), borderRadius: '999px', transition: 'width 0.4s ease' }} />
            </div>
          )}
          {isLost && deal.loss_reason && (
            <span className="truncate" style={{ fontSize: '10px', color: textMuted, fontStyle: 'italic', flex: 1 }}>{deal.loss_reason}</span>
          )}
          <div style={{ flex: 1 }} />
          {stakeholders.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {stakeholders.map((s, i) => (
                <div key={s.name} title={s.name} style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  backgroundColor: s.color, border: '2px solid var(--surface-card)',
                  marginLeft: i === 0 ? 0 : '-6px',
                  fontSize: '7px', fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 3 - i, position: 'relative', flexShrink: 0,
                }}>{s.initials}</div>
              ))}
              {extraCount > 0 && (
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  backgroundColor: trackBg, border: '2px solid var(--surface-card)',
                  marginLeft: '-6px', fontSize: '7px', fontWeight: 600, color: textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', flexShrink: 0,
                }}>+{extraCount}</div>
              )}
            </div>
          )}
        </div>

        {/* Row 5: metadata — tasks / notes / extra tags */}
        {(taskCount > 0 || (deal.notes && deal.notes.trim().length > 0) || (deal.tags && deal.tags.length > 1)) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {taskCount > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#16a34a', fontWeight: 600 }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5.5L4 7.5L8 3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {taskCount}
              </span>
            )}
            {deal.notes && deal.notes.trim().length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', color: textMuted }}><FileText size={10} /></span>
            )}
            {deal.tags && deal.tags.length > 1 && (
              <span style={{ fontSize: '9px', color: textMuted }}>+{deal.tags.length - 1} tags</span>
            )}
          </div>
        )}

      </div>

      {/* Quick-add task button — top-right corner, hover only */}
      {!isOverlay && !isSpecial && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowQuickAdd((v) => !v) }}
          title="Adicionar tarefa rápida"
          className="group/qadd"
          style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '18px', height: '18px', borderRadius: '4px',
            backgroundColor: showQuickAdd ? (isDark ? '#1e4a38' : '#d1fae5') : 'transparent',
            border: `1px solid ${showQuickAdd ? (isDark ? '#2c5545' : '#6ee7b7') : 'transparent'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: showQuickAdd ? '#2c5545' : textMuted,
            opacity: showQuickAdd ? 1 : 0,
            transition: 'opacity 0.1s, background-color 0.1s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = isDark ? '#1e4a38' : '#d1fae5'; e.currentTarget.style.borderColor = isDark ? '#2c5545' : '#6ee7b7' }}
          onMouseLeave={(e) => { if (!showQuickAdd) { e.currentTarget.style.opacity = '0'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent' } }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          </svg>
        </button>
      )}
    </div>

    {/* Quick-add popover */}
    {showQuickAdd && (
      <TaskQuickAdd dealId={deal.id} isDark={isDark} onClose={() => setShowQuickAdd(false)} />
    )}
    </div>
  )
}
