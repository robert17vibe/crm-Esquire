import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare, Plus, X, Clock, AlertTriangle, Calendar,
  ArrowRight, Check, Trash2, Phone, Mail, Video, Users, MoreHorizontal,
} from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import type { Task, TaskPriority, TaskType } from '@/types/task.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr()    { return new Date().toISOString().slice(0, 10) }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }
function nextWeekStr() { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) }

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso + 'T12:00:00'))
}

const PRIORITY_CFG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  high:   { label: 'Alta',   color: '#dc2626', bg: '#fee2e2' },
  medium: { label: 'Média',  color: '#b45309', bg: '#fef3c7' },
  low:    { label: 'Baixa',  color: '#4a7c8a', bg: '#e0f2fe' },
}

const TYPE_ICONS: Record<TaskType, React.ComponentType<{ style?: React.CSSProperties }>> = {
  call:      Phone,
  email:     Mail,
  meeting:   Video,
  follow_up: Users,
  other:     MoreHorizontal,
}


type TaskFilter = 'all' | 'pending' | 'done'

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task, isDark, border, text, muted, cardBg, hoverBg,
  onComplete, onUncomplete, onRemove, onNavigate,
}: {
  task: Task
  isDark: boolean; border: string; text: string; muted: string; cardBg: string; hoverBg: string
  onComplete: () => void
  onUncomplete: () => void
  onRemove: () => void
  onNavigate?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isDone   = !!task.completed_at
  const pCfg     = PRIORITY_CFG[task.priority]
  const TypeIcon = TYPE_ICONS[task.task_type]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px', borderBottom: `1px solid ${border}`,
        backgroundColor: hovered ? hoverBg : cardBg,
        transition: 'background-color 0.1s ease',
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={isDone ? onUncomplete : onComplete}
        style={{
          width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
          border: `2px solid ${isDone ? '#2d9e6b' : border}`,
          backgroundColor: isDone ? '#2d9e6b' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isDone && <Check style={{ width: '10px', height: '10px', color: '#fff' }} />}
      </button>

      {/* Type icon */}
      <div style={{
        width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0,
        backgroundColor: isDark ? '#1e1e1c' : '#f0eeea',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TypeIcon style={{ width: '12px', height: '12px', color: muted }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '13px', fontWeight: 500, color: isDone ? muted : text,
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.title}
        </p>
        {task.deal_title && (
          <button
            type="button"
            onClick={onNavigate}
            style={{
              fontSize: '11px', color: muted, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px',
              marginTop: '1px',
            }}
          >
            {task.deal_title}
            <ArrowRight style={{ width: '9px', height: '9px' }} />
          </button>
        )}
      </div>

      {/* Priority */}
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
        color: pCfg.color,
        backgroundColor: isDark ? `${pCfg.color}18` : pCfg.bg,
        borderRadius: '4px', padding: '2px 6px', flexShrink: 0,
        textTransform: 'uppercase',
      }}>
        {pCfg.label}
      </span>

      {/* Due date */}
      {task.due_date && (
        <span style={{
          fontSize: '11px', color: muted, flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtDate(task.due_date)}
        </span>
      )}

      {/* Delete */}
      {hovered && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            color: muted, flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
          onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
        >
          <Trash2 style={{ width: '12px', height: '12px' }} />
        </button>
      )}
    </div>
  )
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupHeader({ label, count, icon: Icon, color, border }: {
  label: string; count: number; icon: React.ComponentType<{ style?: React.CSSProperties }>
  color: string; border: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 16px 6px', borderBottom: `1px solid ${border}`,
    }}>
      <Icon style={{ width: '12px', height: '12px', color }} />
      <span style={{ fontSize: '10px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontSize: '10px', color, opacity: 0.6 }}>({count})</span>
    </div>
  )
}

// ─── Add task form ────────────────────────────────────────────────────────────

function AddTaskForm({
  deals, isDark, border, text, muted, inputBg, onAdd, onClose,
}: {
  deals: { id: string; title: string }[]
  isDark: boolean; border: string; text: string; muted: string; inputBg: string
  onAdd: (t: { title: string; due_date?: string; priority: TaskPriority; task_type: TaskType; deal_id?: string }) => void
  onClose: () => void
}) {
  const [title, setTitle]       = useState('')
  const [dueDate, setDueDate]   = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [taskType, setTaskType] = useState<TaskType>('other')
  const [dealId, setDealId]     = useState('')
  const [saving, setSaving]     = useState(false)

  const selectStyle: React.CSSProperties = {
    height: '30px', padding: '0 8px', fontSize: '12px',
    backgroundColor: inputBg, border: `1px solid ${border}`,
    borderRadius: '6px', color: text, outline: 'none', cursor: 'pointer',
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setSaving(true)
    await onAdd({ title: title.trim(), due_date: dueDate || undefined, priority, task_type: taskType, deal_id: dealId || undefined })
    setSaving(false)
    setTitle(''); setDueDate(''); setPriority('medium'); setTaskType('other'); setDealId('')
    onClose()
  }

  return (
    <div style={{
      margin: '12px 16px', padding: '14px', borderRadius: '8px',
      border: `1px solid ${border}`,
      backgroundColor: isDark ? '#111110' : '#fafaf8',
    }}>
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose() }}
        placeholder="O que precisa ser feito?"
        style={{
          width: '100%', height: '34px', padding: '0 10px', fontSize: '13px',
          backgroundColor: inputBg, border: `1px solid ${border}`,
          borderRadius: '6px', color: text, outline: 'none', marginBottom: '10px',
        }}
      />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {/* Quick date */}
        {[
          { label: 'Hoje', value: todayStr() },
          { label: 'Amanhã', value: tomorrowStr() },
          { label: 'Próx. semana', value: nextWeekStr() },
        ].map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setDueDate(dueDate === value ? '' : value)}
            style={{
              height: '26px', padding: '0 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 500,
              backgroundColor: dueDate === value ? '#2c5545' : 'transparent',
              color: dueDate === value ? '#fff' : muted,
              border: `1px solid ${dueDate === value ? '#2c5545' : border}`,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ ...selectStyle, width: '130px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} style={selectStyle}>
          <option value="high">🔴 Alta</option>
          <option value="medium">🟡 Média</option>
          <option value="low">🔵 Baixa</option>
        </select>
        <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} style={selectStyle}>
          <option value="call">📞 Ligação</option>
          <option value="email">✉️ Email</option>
          <option value="meeting">📹 Reunião</option>
          <option value="follow_up">👥 Follow-up</option>
          <option value="other">📋 Outro</option>
        </select>
        {deals.length > 0 && (
          <select value={dealId} onChange={(e) => setDealId(e.target.value)} style={{ ...selectStyle, maxWidth: '180px' }}>
            <option value="">— Associar deal (opcional)</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || saving}
          style={{
            height: '30px', padding: '0 14px', borderRadius: '6px',
            backgroundColor: '#2c5545', color: '#fff', border: 'none',
            fontSize: '12px', fontWeight: 600, cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
            opacity: title.trim() && !saving ? 1 : 0.6,
          }}
        >
          {saving ? 'A criar...' : 'Criar tarefa'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            height: '30px', padding: '0 12px', borderRadius: '6px',
            backgroundColor: 'transparent', border: `1px solid ${border}`,
            color: muted, fontSize: '12px', cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TasksPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const tasks    = useTaskStore((s) => s.tasks)
  const loading  = useTaskStore((s) => s.loading)
  const fetch    = useTaskStore((s) => s.fetch)
  const create   = useTaskStore((s) => s.create)
  const complete = useTaskStore((s) => s.complete)
  const uncomplete = useTaskStore((s) => s.uncomplete)
  const remove   = useTaskStore((s) => s.remove)
  const deals    = useDealStore((s) => s.deals)
  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter]     = useState<TaskFilter>('pending')

  useEffect(() => { fetch() }, [fetch])

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const cardBg  = isDark ? '#161614' : '#ffffff'
  const hoverBg = isDark ? '#1c1c1a' : '#f8f7f4'
  const inputBg = isDark ? '#111110' : '#f5f4f0'
  const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'

  const today = todayStr()
  const week  = nextWeekStr()

  const dealOptions = useMemo(() =>
    deals
      .filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
      .map((d) => ({ id: d.id, title: d.title })),
    [deals],
  )

  const grouped = useMemo(() => {
    const pending   = tasks.filter((t) => !t.completed_at)
    const done      = tasks.filter((t) => !!t.completed_at)

    return {
      overdue: pending.filter((t) => t.due_date && t.due_date < today),
      today:   pending.filter((t) => t.due_date === today),
      week:    pending.filter((t) => t.due_date && t.due_date > today && t.due_date <= week),
      future:  pending.filter((t) => t.due_date && t.due_date > week),
      no_date: pending.filter((t) => !t.due_date),
      done:    done.slice(0, 20),
    }
  }, [tasks, today, week])

  const pendingCount = grouped.overdue.length + grouped.today.length + grouped.week.length + grouped.future.length + grouped.no_date.length
  const overdueCount = grouped.overdue.length

  const visibleGroups: Array<{ key: keyof typeof grouped; label: string; color: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }> =
    filter === 'done'
      ? [{ key: 'done', label: 'Concluídas', color: '#2d9e6b', icon: Check }]
      : [
          { key: 'overdue', label: 'Atrasadas',      color: '#dc2626',  icon: AlertTriangle },
          { key: 'today',   label: 'Hoje',           color: '#b45309',  icon: Clock         },
          { key: 'week',    label: 'Esta semana',    color: '#2c5545',  icon: Calendar      },
          { key: 'future',  label: 'Futuras',        color: muted,      icon: Calendar      },
          { key: 'no_date', label: 'Sem prazo',      color: muted,      icon: CheckSquare   },
        ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: pageBg }}>

      {/* Header */}
      <div style={{
        height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
        backgroundColor: isDark ? '#0d0c0a' : '#f5f4f0',
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Tarefas</p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
            {overdueCount > 0
              ? `${overdueCount} atrasada${overdueCount > 1 ? 's' : ''} · ${pendingCount} total`
              : `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: '7px', overflow: 'hidden', backgroundColor: cardBg }}>
            {([
              { key: 'pending' as TaskFilter, label: 'Pendentes' },
              { key: 'done'    as TaskFilter, label: 'Concluídas' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                style={{
                  height: '30px', padding: '0 12px', fontSize: '11px', fontWeight: 600,
                  backgroundColor: filter === key ? '#2c5545' : 'transparent',
                  color: filter === key ? '#fff' : muted,
                  border: 'none', cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            style={{
              height: '30px', padding: '0 12px', borderRadius: '7px',
              backgroundColor: showForm ? 'transparent' : '#2c5545',
              color: showForm ? muted : '#fff',
              border: `1px solid ${showForm ? border : '#2c5545'}`,
              fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            {showForm ? <><X style={{ width: '10px', height: '10px' }} />Cancelar</> : <><Plus style={{ width: '11px', height: '11px' }} />Nova tarefa</>}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Add form */}
          {showForm && (
            <AddTaskForm
              deals={dealOptions}
              isDark={isDark}
              border={border}
              text={text}
              muted={muted}
              inputBg={inputBg}
              onAdd={async (t) => { await create(t); }}
              onClose={() => setShowForm(false)}
            />
          )}

          {loading && tasks.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
              <p style={{ fontSize: '12px', color: muted }}>A carregar tarefas...</p>
            </div>
          ) : pendingCount === 0 && filter === 'pending' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px' }}>
              <CheckSquare style={{ width: '28px', height: '28px', color: border }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: muted }}>Nenhuma tarefa pendente</p>
              <p style={{ fontSize: '12px', color: isDark ? '#3a3834' : '#c4bfb8' }}>Clica em "Nova tarefa" para começar</p>
            </div>
          ) : (
            <div style={{ backgroundColor: cardBg, borderRadius: '8px', margin: '16px', overflow: 'hidden', border: `1px solid ${border}` }}>
              {visibleGroups.map(({ key, label, color, icon }) => {
                const items = grouped[key] as Task[]
                if (items.length === 0) return null
                return (
                  <div key={key}>
                    <GroupHeader label={label} count={items.length} icon={icon} color={color} border={border} />
                    {items.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isDark={isDark}
                        border={border}
                        text={text}
                        muted={muted}
                        cardBg={cardBg}
                        hoverBg={hoverBg}
                        onComplete={() => complete(task.id)}
                        onUncomplete={() => uncomplete(task.id)}
                        onRemove={() => remove(task.id)}
                        onNavigate={task.deal_id ? () => navigate(`/deal/${task.deal_id}`) : undefined}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
