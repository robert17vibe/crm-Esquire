import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare, Plus, X, Clock, AlertTriangle, Calendar,
  ArrowRight, Check, Trash2, Phone, Mail, Video, Users, MoreHorizontal, Pencil, TrendingUp,
} from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import type { Task, TaskPriority, TaskType } from '@/types/task.types'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr()    { return new Date().toISOString().slice(0, 10) }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }
function nextWeekStr() { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) }

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso + 'T12:00:00'))
}

const PRIORITY_CFG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  high:   { label: 'Alta',   color: '#b83535', bg: '#b8353512' },
  medium: { label: 'Média',  color: '#a88030', bg: '#a8803012' },
  low:    { label: 'Baixa',  color: '#4d7aa8', bg: '#4d7aa812' },
}

const TYPE_ICONS: Record<TaskType, React.ComponentType<{ style?: React.CSSProperties }>> = {
  call:      Phone,
  email:     Mail,
  meeting:   Video,
  follow_up: Users,
  other:     MoreHorizontal,
}


type TaskFilter = 'all' | 'pending' | 'done'
type PriorityFilter = 'all' | TaskPriority
type TypeFilter = 'all' | TaskType

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task, isDark, border, text, muted,
  onComplete, onUncomplete, onRemove, onNavigate, onEdit,
}: {
  task: Task
  isDark: boolean; border: string; text: string; muted: string
  onComplete: () => void
  onUncomplete: () => void
  onRemove: () => void
  onNavigate?: () => void
  onEdit: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isDone   = !!task.completed_at
  const pCfg     = PRIORITY_CFG[task.priority]
  const TypeIcon = TYPE_ICONS[task.task_type]

  const isOverdue = !isDone && task.due_date && task.due_date < todayStr()
  const isToday   = !isDone && task.due_date === todayStr()

  const cardBg = isDark
    ? (isDone ? '#111110' : '#1a1a18')
    : (isDone ? '#f0eeea' : '#faf8f4')

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        backgroundColor: hovered ? (isDark ? '#1e1e1c' : '#f7f5f0') : cardBg,
        border: `1px solid ${hovered ? (isDark ? '#3a3a38' : '#d0ccc6') : border}`,
        transition: 'background-color 0.1s ease, border-color 0.1s ease',
        opacity: isDone ? 0.6 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={isDone ? onUncomplete : onComplete}
        style={{
          width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, marginTop: '1px',
          border: `2px solid ${isDone ? '#6b1212' : (isOverdue ? '#b83535' : border)}`,
          backgroundColor: isDone ? '#6b1212' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.15s ease',
        }}
      >
        {isDone && <Check style={{ width: '10px', height: '10px', color: '#fff' }} />}
      </button>

      {/* Type icon */}
      <div style={{
        width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
        backgroundColor: isDark ? '#252523' : '#f0eeea',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TypeIcon style={{ width: '13px', height: '13px', color: isOverdue ? '#b83535' : muted }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '13px', fontWeight: isDone ? 400 : 600, color: isDone ? muted : text,
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {task.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          {/* Priority badge */}
          <span style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
            color: pCfg.color,
            backgroundColor: isDark ? `${pCfg.color}20` : pCfg.bg,
            border: `1px solid ${pCfg.color}30`,
            borderRadius: '5px', padding: '2px 7px',
            textTransform: 'uppercase', flexShrink: 0,
          }}>
            {pCfg.label}
          </span>

          {/* Due date */}
          {task.due_date && (
            <span style={{
              fontSize: '10px', flexShrink: 0,
              color: isOverdue ? '#b83535' : isToday ? '#a88030' : muted,
              fontWeight: isOverdue || isToday ? 600 : 400,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {isOverdue ? `Atrasado · ${fmtDate(task.due_date)}` : fmtDate(task.due_date)}
            </span>
          )}

          {/* Deal link */}
          {task.deal_title && (
            <button
              type="button"
              onClick={onNavigate}
              style={{
                fontSize: '10px', color: muted, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px',
              }}
            >
              {task.deal_title}
              <ArrowRight style={{ width: '9px', height: '9px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Actions (on hover) */}
      {hovered && (
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: muted, borderRadius: '5px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#6b1212'; e.currentTarget.style.backgroundColor = isDark ? '#2a1a1a' : '#fdf2f2' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = muted; e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Pencil style={{ width: '12px', height: '12px' }} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: muted, borderRadius: '5px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#b83535'; e.currentTarget.style.backgroundColor = isDark ? '#2a1a1a' : '#fdf2f2' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = muted; e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Trash2 style={{ width: '12px', height: '12px' }} />
          </button>
        </div>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '2px' }}>
      <Icon style={{ width: '11px', height: '11px', color }} />
      <span style={{ fontSize: '10px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontSize: '10px', fontWeight: 500, color: border, backgroundColor: `${color}14`, borderRadius: '4px', padding: '0px 6px' }}>{count}</span>
      <div style={{ flex: 1, height: '1px', backgroundColor: border }} />
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
              backgroundColor: dueDate === value ? '#6b1212' : 'transparent',
              color: dueDate === value ? '#fff' : muted,
              border: `1px solid ${dueDate === value ? '#6b1212' : border}`,
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
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
        <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} style={selectStyle}>
          <option value="call">Ligação</option>
          <option value="email">Email</option>
          <option value="meeting">Reunião</option>
          <option value="follow_up">Follow-up</option>
          <option value="other">Outro</option>
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
            backgroundColor: '#6b1212', color: '#fff', border: 'none',
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

// ─── Edit task drawer ─────────────────────────────────────────────────────────

function EditTaskDrawer({ task, deals, owners, isDark, border, text, muted, inputBg, onSave, onClose }: {
  task: Task
  deals: { id: string; title: string }[]
  owners: { id: string; name: string }[]
  isDark: boolean; border: string; text: string; muted: string; inputBg: string
  onSave: (patch: Partial<Pick<Task, 'title' | 'due_date' | 'priority' | 'task_type' | 'assigned_to' | 'deal_id'>>) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle]       = useState(task.title)
  const [dueDate, setDueDate]   = useState(task.due_date ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [taskType, setTaskType] = useState<TaskType>(task.task_type)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [dealId, setDealId]     = useState(task.deal_id ?? '')
  const [saving, setSaving]     = useState(false)

  const selectStyle: React.CSSProperties = {
    height: '32px', padding: '0 8px', fontSize: '12px',
    backgroundColor: inputBg, border: `1px solid ${border}`,
    borderRadius: '6px', color: text, outline: 'none', cursor: 'pointer', width: '100%',
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), due_date: dueDate || null, priority, task_type: taskType, assigned_to: assignedTo || null, deal_id: dealId || null })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '360px', zIndex: 101,
        backgroundColor: isDark ? '#111110' : '#ffffff',
        borderLeft: `1px solid ${border}`,
        display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: text }}>Editar Tarefa</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, display: 'block', marginBottom: '6px' }}>Título</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...selectStyle, height: '36px', padding: '0 10px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, display: 'block', marginBottom: '6px' }}>Prazo</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={selectStyle} />
          </div>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, display: 'block', marginBottom: '6px' }}>Prioridade</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} style={selectStyle}>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, display: 'block', marginBottom: '6px' }}>Tipo</label>
            <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} style={selectStyle}>
              <option value="call">Ligação</option>
              <option value="email">Email</option>
              <option value="meeting">Reunião</option>
              <option value="follow_up">Follow-up</option>
              <option value="other">Outro</option>
            </select>
          </div>
          {owners.length > 0 && (
            <div>
              <label style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, display: 'block', marginBottom: '6px' }}>Atribuído a</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={selectStyle}>
                <option value="">— Sem atribuição</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, display: 'block', marginBottom: '6px' }}>Lead associado</label>
            <select value={dealId} onChange={(e) => setDealId(e.target.value)} style={selectStyle}>
              <option value="">— Sem lead</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
            {dealId && dealId !== (task.deal_id ?? '') && (
              <p style={{ fontSize: '9px', color: '#d97706', marginTop: '4px' }}>
                ⚠ Guardar irá registar a mudança no histórico do cliente
              </p>
            )}
          </div>
        </div>
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${border}`, display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || saving}
            style={{
              flex: 1, height: '36px', borderRadius: '6px', border: 'none',
              backgroundColor: '#6b1212', color: '#fff', fontSize: '12px', fontWeight: 700,
              cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
              opacity: title.trim() && !saving ? 1 : 0.5,
            }}
          >
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
          <button type="button" onClick={onClose}
            style={{ height: '36px', padding: '0 16px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '12px', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TasksPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const allTasks     = useTaskStore((s) => s.tasks)
  const loading      = useTaskStore((s) => s.loading)
  const impersonatedId = useImpersonationStore((s) => s.impersonatedId)
  const visibleDeals = useVisibleDeals()
  const visibleDealIds = useMemo(() => new Set(visibleDeals.map((d) => d.id)), [visibleDeals])
  const tasks = impersonatedId
    ? allTasks.filter((t) => t.deal_id ? visibleDealIds.has(t.deal_id) : false)
    : allTasks
  const fetch      = useTaskStore((s) => s.fetch)
  const create     = useTaskStore((s) => s.create)
  const update     = useTaskStore((s) => s.update)
  const complete   = useTaskStore((s) => s.complete)
  const uncomplete = useTaskStore((s) => s.uncomplete)
  const remove     = useTaskStore((s) => s.remove)
  const owners     = useOwnerStore((s) => s.owners)
  const deals      = visibleDeals
  const navigate   = useNavigate()

  const [showForm, setShowForm]         = useState(false)
  const [editTask, setEditTask]         = useState<Task | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filter, setFilter]             = useState<TaskFilter>('pending')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('all')

  useEffect(() => { fetch() }, [fetch])

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
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

  const applySubFilters = (list: Task[]) => list
    .filter((t) => priorityFilter === 'all' || t.priority === priorityFilter)
    .filter((t) => typeFilter === 'all' || t.task_type === typeFilter)

  const grouped = useMemo(() => {
    const pending = applySubFilters(tasks.filter((t) => !t.completed_at))
    const done    = applySubFilters(tasks.filter((t) => !!t.completed_at))

    return {
      overdue: pending.filter((t) => t.due_date && t.due_date < today),
      today:   pending.filter((t) => t.due_date === today),
      week:    pending.filter((t) => t.due_date && t.due_date > today && t.due_date <= week),
      future:  pending.filter((t) => t.due_date && t.due_date > week),
      no_date: pending.filter((t) => !t.due_date),
      done:    done,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, today, week, priorityFilter, typeFilter])

  const pendingCount = grouped.overdue.length + grouped.today.length + grouped.week.length + grouped.future.length + grouped.no_date.length
  const overdueCount = grouped.overdue.length

  const visibleGroups: Array<{ key: keyof typeof grouped; label: string; color: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }> =
    filter === 'done'
      ? [{ key: 'done', label: 'Concluídas', color: muted, icon: Check }]
      : filter === 'all'
        ? [
            { key: 'overdue', label: 'Atrasadas',      color: '#b83535',  icon: AlertTriangle },
            { key: 'today',   label: 'Hoje',           color: '#a88030',  icon: Clock         },
            { key: 'week',    label: 'Esta semana',    color: '#6b1212',  icon: Calendar      },
            { key: 'future',  label: 'Futuras',        color: muted,      icon: Calendar      },
            { key: 'no_date', label: 'Sem prazo',      color: muted,      icon: CheckSquare   },
            { key: 'done',    label: 'Concluídas',     color: muted,      icon: Check         },
          ]
        : [
            { key: 'overdue', label: 'Atrasadas',      color: '#b83535',  icon: AlertTriangle },
            { key: 'today',   label: 'Hoje',           color: '#a88030',  icon: Clock         },
            { key: 'week',    label: 'Esta semana',    color: '#6b1212',  icon: Calendar      },
            { key: 'future',  label: 'Futuras',        color: muted,      icon: Calendar      },
            { key: 'no_date', label: 'Sem prazo',      color: muted,      icon: CheckSquare   },
          ]

  const TYPE_PILL: { value: TypeFilter; label: string; Icon: React.ComponentType<{ style?: React.CSSProperties }> }[] = [
    { value: 'call',      label: 'Ligação',   Icon: Phone    },
    { value: 'email',     label: 'Email',     Icon: Mail     },
    { value: 'meeting',   label: 'Reunião',   Icon: Video    },
    { value: 'follow_up', label: 'Follow-up', Icon: Users    },
    { value: 'other',     label: 'Outro',     Icon: MoreHorizontal },
  ]

  const PRIORITY_PILL: { value: PriorityFilter; label: string; color: string }[] = [
    { value: 'high',   label: 'Alta',  color: '#b83535' },
    { value: 'medium', label: 'Média', color: '#a88030' },
    { value: 'low',    label: 'Baixa', color: '#4d7aa8' },
  ]

  function Pill({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
    const activeColor = color ?? '#6b1212'
    return (
      <button type="button" onClick={onClick} style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        height: '28px', padding: '0 10px', borderRadius: '999px',
        fontSize: '11px', fontWeight: 600, cursor: 'pointer',
        border: `1px solid ${active ? activeColor : border}`,
        backgroundColor: active ? `${activeColor}14` : 'transparent',
        color: active ? activeColor : muted,
        transition: 'all 0.12s ease',
      }}>{children}</button>
    )
  }

  return (
    <div style={{ backgroundColor: pageBg, minHeight: '100%', overflowY: 'auto' }}>
      {editTask && (
        <EditTaskDrawer
          task={editTask}
          deals={dealOptions}
          owners={owners.map((o) => ({ id: o.id, name: o.name }))}
          isDark={isDark} border={border} text={text} muted={muted} inputBg={inputBg}
          onSave={(patch) => update(editTask.id, patch)}
          onClose={() => setEditTask(null)}
        />
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <CheckSquare size={18} color={text} />
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>Tarefas</h1>
            </div>
            <p style={{ fontSize: '13px', color: muted, margin: 0 }}>
              {overdueCount > 0
                ? `${overdueCount} atrasada${overdueCount > 1 ? 's' : ''} · ${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`
                : `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''} no pipeline`}
            </p>
          </div>
          <button type="button" onClick={() => setShowForm((v) => !v)} style={{
            height: '36px', padding: '0 18px', borderRadius: '8px',
            backgroundColor: showForm ? 'transparent' : '#6b1212',
            color: showForm ? muted : '#fff',
            border: `1px solid ${showForm ? border : '#6b1212'}`,
            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {showForm ? <><X style={{ width: '11px', height: '11px' }} />Cancelar</> : <><Plus style={{ width: '12px', height: '12px' }} />Nova tarefa</>}
          </button>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Atrasadas', value: grouped.overdue.length, sub: 'requerem atenção',    color: '#b83535', Icon: AlertTriangle },
            { label: 'Hoje',      value: grouped.today.length,   sub: 'para hoje',           color: '#a88030', Icon: Clock         },
            { label: 'Pendentes', value: pendingCount,           sub: 'no total',            color: '#6b1212', Icon: CheckSquare   },
            { label: 'Concluídas',value: grouped.done.length,    sub: 'finalizadas',         color: '#15803d', Icon: TrendingUp    },
          ].map((s) => (
            <div key={s.label} style={{
              backgroundColor: isDark ? '#161614' : '#ffffff',
              border: `1px solid ${border}`,
              borderRadius: '10px', padding: '16px',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <s.Icon size={14} color={s.color} />
                <span style={{ fontSize: '11px', fontWeight: 500, color: muted }}>{s.label}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: s.value > 0 && s.label === 'Atrasadas' ? '#b83535' : text, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.04em' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          backgroundColor: isDark ? '#161614' : '#ffffff',
          border: `1px solid ${border}`, borderRadius: '10px',
          padding: '12px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
        }}>
          {/* Status */}
          {(['pending', 'done', 'all'] as TaskFilter[]).map((k) => {
            const labels: Record<TaskFilter, string> = { pending: 'Pendentes', done: 'Concluídas', all: 'Todos' }
            return <Pill key={k} active={filter === k} onClick={() => setFilter(k)}>{labels[k]}</Pill>
          })}

          <div style={{ width: '1px', height: '16px', backgroundColor: border }} />

          {/* Priority */}
          {PRIORITY_PILL.map(({ value, label, color }) => (
            <Pill key={value} active={priorityFilter === value} color={color} onClick={() => setPriorityFilter(priorityFilter === value ? 'all' : value)}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
              {label}
            </Pill>
          ))}

          <div style={{ width: '1px', height: '16px', backgroundColor: border }} />

          {/* Type */}
          {TYPE_PILL.map(({ value, label, Icon }) => (
            <Pill key={value} active={typeFilter === value} onClick={() => setTypeFilter(typeFilter === value ? 'all' : value)}>
              <Icon style={{ width: '11px', height: '11px' }} />
              {label}
            </Pill>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ marginBottom: '16px' }}>
            <AddTaskForm
              deals={dealOptions}
              isDark={isDark} border={border} text={text} muted={muted} inputBg={inputBg}
              onAdd={async (t) => { await create(t) }}
              onClose={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Task list */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {visibleGroups.map(({ key, label, color, icon }) => {
              const items = grouped[key] as Task[]
              if (items.length === 0) return null
              return (
                <div key={key}>
                  <GroupHeader label={label} count={items.length} icon={icon} color={color} border={border} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                    {items.map((task) => (
                      <TaskRow
                        key={task.id} task={task}
                        isDark={isDark} border={border} text={text} muted={muted}
                        onComplete={() => complete(task.id)}
                        onUncomplete={() => uncomplete(task.id)}
                        onRemove={() => setConfirmDelete(task.id)}
                        onNavigate={task.deal_id ? () => navigate(`/deal/${task.deal_id}`) : undefined}
                        onEdit={() => setEditTask(task)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
