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
import { getStageColor, type StageId } from '@/constants/pipeline'
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
              backgroundColor: title.trim() ? (isDark ? 'rgba(227,30,36,0.08)' : '#f0f7f3') : (isDark ? '#111110' : '#f5f4f0'),
              color: title.trim() ? (isDark ? 'rgba(227,30,36,0.50)' : '#e31e24') : muted,
              border: `1px solid ${title.trim() ? (isDark ? 'rgba(227,30,36,0.15)' : '#a3d9c0') : border}`,
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

  const hasUnread = notifications.some((n) => n.dealId === deal.id && !n.read)
  const daysSinceCreated = deal.created_at
    ? Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86_400_000)
    : 999
  const isNew = daysSinceCreated <= 5 || hasUnread

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, disabled: isOverlay })

  const wasDraggingRef = useRef(false)
  useEffect(() => { if (isDragging) wasDraggingRef.current = true }, [isDragging])

  const isWon     = deal.stage_id === 'closed_won'
  const isLost    = deal.stage_id === 'closed_lost'
  const isSpecial = isWon || isLost

  const stageColor  = getStageColor(deal.stage_id)
  const probability = Math.min(100, Math.max(0, deal.probability ?? 0))
  const score       = showScore && !isSpecial ? evaluateDealScore(deal) : null
  const today       = new Date().toISOString().slice(0, 10)
  // isOverdue kept for future use — suppress with void cast
  void (!isSpecial && !!deal.next_activity?.due_date && deal.next_activity.due_date < today)


  // ── theme tokens ──
  const cardBg     = isWon  ? (isDark ? '#0a1f0e' : '#f0faf4')
                   : isLost ? (isDark ? '#1a0c0c' : '#fdf4f4')
                   :          'var(--surface-card)'
  const isHighlighted = highlightNew && isNew
  const cardBorder = deal.days_in_stage > 30 ? (isDark ? 'rgba(120,113,108,0.3)' : 'rgba(214,211,209,0.8)')
                   :                          'var(--line)'
  const textPrimary = 'var(--ink-base)'
  const textMuted   = 'var(--ink-muted)'
  const trackBg     = 'var(--surface-raised)'

  const cardOpacity = isDragging ? 0.2 : dimmed ? 0.15 : isLost ? 0.65 : 1

  const cardStyle: React.CSSProperties = {
    borderRadius: 'var(--radius-lg)',
    backgroundColor: cardBg,
    border: `1px solid ${cardBorder}`,
    ...(isSpecial ? { borderLeft: `3px solid ${stageColor}` } : isHighlighted ? { borderLeft: '3px solid #f59e0b' } : {}),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '114px',
    boxShadow: isOverlay ? '0 20px 48px rgba(0,0,0,0.3), 0 6px 16px rgba(0,0,0,0.15)' : 'none',
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
      onClick={isOverlay ? undefined : () => {
        if (wasDraggingRef.current) { wasDraggingRef.current = false; return }
        if (!showQuickAdd) navigate(`/deal/${deal.id}`)
      }}
      className={cn(
        'deal-card group/card w-full select-none',
        !isOverlay && !isDragging && 'cursor-grab active:cursor-grabbing',
      )}
    >
      {/* Stage color top strip */}
      {!isSpecial && (
        <div style={{ height: '3px', flexShrink: 0, background: stageColor }} />
      )}

      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>

        {/* Row 1: dias + score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isHighlighted && (
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: '#f59e0b', flexShrink: 0,
                boxShadow: '0 0 0 2px rgba(245,158,11,0.25)',
              }} />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {score !== null && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: scoreColor(score), backgroundColor: scoreBg(score, isDark), borderRadius: 'var(--radius-full)', padding: '1px 6px' }}>{score}</span>
            )}
            <span style={{ fontSize: '10px', fontWeight: 500, color: deal.days_in_stage > 30 ? '#b45309' : textMuted, fontVariantNumeric: 'tabular-nums' }}>{deal.days_in_stage}d</span>
          </div>
        </div>

        {/* Row 2: empresa + contato · responsável */}
        <div style={{ margin: '3px 0' }}>
          <p className="line-clamp-1" style={{
            fontSize: '13px', fontWeight: 700, color: textPrimary,
            lineHeight: 1.25, letterSpacing: '-0.02em',
            textDecoration: isLost ? 'line-through' : 'none',
            textDecorationColor: textMuted,
          }}>
            {deal.company_name || deal.title}
          </p>
          <p className="line-clamp-1" style={{
            fontSize: '11px', fontWeight: 400, color: textMuted,
            lineHeight: 1.3, marginTop: '3px',
          }}>
            {[deal.contact_name, deal.owner?.name].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Row 3: barra prob / valor ganho  +  avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* lado esquerdo */}
          {!isSpecial ? (
            <div style={{ flex: 1, height: '4px', borderRadius: '999px', backgroundColor: trackBg, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${probability}%`, backgroundColor: probability > 0 ? probColor(probability) : 'transparent', borderRadius: '999px', transition: 'width 0.4s ease' }} />
            </div>
          ) : isWon && deal.value > 0 ? (
            <span style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: isDark ? '#6ee7b7' : '#16a34a', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.value)}
            </span>
          ) : isLost && deal.loss_reason ? (
            <span className="truncate" style={{ flex: 1, fontSize: '10px', color: textMuted, fontStyle: 'italic' }}>{deal.loss_reason}</span>
          ) : (
            <div style={{ flex: 1 }} />
          )}

          {/* meta icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            {taskCount > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '9px', color: '#16a34a', fontWeight: 600 }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4 7.5L8 3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {taskCount}
              </span>
            )}
            {deal.notes && deal.notes.trim().length > 0 && (
              <FileText size={9} color={textMuted} />
            )}
          </div>

          {/* avatars */}
          {stakeholders.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {stakeholders.map((s, i) => (
                <div key={s.name} title={s.name} style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: s.color, border: '2px solid var(--surface-card)',
                  marginLeft: i === 0 ? 0 : '-5px',
                  fontSize: '6px', fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 3 - i, position: 'relative', flexShrink: 0,
                }}>{s.initials}</div>
              ))}
              {extraCount > 0 && (
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: trackBg, border: '2px solid var(--surface-card)',
                  marginLeft: '-5px', fontSize: '6px', fontWeight: 600, color: textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', flexShrink: 0,
                }}>+{extraCount}</div>
              )}
            </div>
          )}
        </div>

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
            backgroundColor: showQuickAdd ? (isDark ? 'rgba(227,30,36,0.15)' : 'rgba(227,30,36,0.10)') : 'transparent',
            border: `1px solid ${showQuickAdd ? (isDark ? '#e31e24' : '#6ee7b7') : 'transparent'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: showQuickAdd ? '#e31e24' : textMuted,
            opacity: showQuickAdd ? 1 : 0,
            transition: 'opacity 0.1s, background-color 0.1s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = isDark ? 'rgba(227,30,36,0.15)' : 'rgba(227,30,36,0.10)'; e.currentTarget.style.borderColor = isDark ? '#e31e24' : '#6ee7b7' }}
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
