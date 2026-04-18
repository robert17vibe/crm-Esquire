import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft, Mail, Phone, Linkedin, Globe,
  Building2, Users, Target, CalendarClock, MapPin,
  Zap, Clock, Video, CheckSquare, FileText,
  Mic, ChevronDown, Plus, X,
} from 'lucide-react'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useAppStore } from '@/store/useAppStore'
import { STAGES, getStageColor } from '@/constants/pipeline'
import type { Deal, DealActivity, DealMeeting } from '@/types/deal.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${((Math.abs(h) % 360) + 360) % 360}, 52%, 46%)`
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function relativeDate(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30)  return `${days}d atrás`
  return formatDate(iso)
}

const SIZE_LABELS: Record<string, string> = {
  '1-50': '1–50 func.', '51-200': '51–200 func.',
  '201-1000': '201–1k func.', '1000+': '1k+ func.',
}
const ARR_LABELS: Record<string, string> = {
  '<100k': '< R$ 100k', '100k-500k': 'R$ 100k–500k',
  '500k-1M': 'R$ 500k–1M', '>1M': '> R$ 1M',
}

const ACT_COLORS: Record<string, string> = {
  call: '#4a90d9', email: '#78909c', meeting: '#2c5545', task: '#2d9e6b', note: '#b45309',
}
const ACT_ICONS: Record<string, LucideIcon> = {
  call: Phone, email: Mail, meeting: Video, task: CheckSquare, note: FileText,
}
const ACT_LABELS: Record<string, string> = {
  call: 'Ligação', email: 'Email', meeting: 'Reunião', task: 'Tarefa', note: 'Nota',
}

// ─── Building blocks ──────────────────────────────────────────────────────────

function Field({ label, icon: Icon, children, muted, text }: {
  label: string; icon?: LucideIcon; children: React.ReactNode; muted: string; text: string
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Icon && <Icon style={{ width: '13px', height: '13px', color: muted, flexShrink: 0 }} />}
        <span style={{ fontSize: '13px', fontWeight: 500, color: text }}>{children}</span>
      </div>
    </div>
  )
}

function LinkField({ label, icon: Icon, href, external, children, muted }: {
  label: string; icon: LucideIcon; href: string; external?: boolean; children: React.ReactNode; muted: string
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
        {label}
      </p>
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#2c5545', textDecoration: 'none' }}
      >
        <Icon style={{ width: '13px', height: '13px', color: muted, flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
      </a>
    </div>
  )
}

function SectionHead({ title, border, muted }: { title: string; border: string; muted: string }) {
  return (
    <div style={{ paddingTop: '14px', marginBottom: '10px' }}>
      <div style={{ height: '1px', backgroundColor: border, marginBottom: '12px' }} />
      <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {title}
      </p>
    </div>
  )
}

// ─── Activity entry ───────────────────────────────────────────────────────────

function ActivityEntry({ activity, meeting, isDark }: {
  activity: DealActivity; meeting?: DealMeeting; isDark: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const color  = ACT_COLORS[activity.type] ?? '#8a857d'
  const Icon   = ACT_ICONS[activity.type] ?? FileText
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const cardBg = isDark ? '#1a1a18' : '#f8f7f4'
  const border = isDark ? '#242422' : '#e4e0da'

  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '6px',
          backgroundColor: `${color}14`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: '12px', height: '12px', color }} />
        </div>
        <div style={{ width: '1px', flex: 1, backgroundColor: border, marginTop: '4px' }} />
      </div>

      <div style={{ flex: 1, paddingBottom: '16px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '9px', fontWeight: 700, color,
                backgroundColor: `${color}14`, borderRadius: '3px',
                padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {ACT_LABELS[activity.type]}
              </span>
              {meeting?.plaud_note_id && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, color: '#2c5545',
                  backgroundColor: '#2c554514', borderRadius: '3px',
                  padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Plaud
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: text, marginTop: '4px' }}>
              {activity.subject}
            </p>
          </div>
          <span style={{ fontSize: '10px', color: muted, flexShrink: 0, marginTop: '2px' }}>
            {relativeDate(activity.created_at)}
          </span>
        </div>

        {activity.body && (
          <p style={{ fontSize: '12px', color: muted, marginTop: '5px', lineHeight: 1.6 }}>
            {activity.body}
          </p>
        )}

        {meeting && (meeting.ai_summary || meeting.key_points) && (
          <div style={{ marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 600, color: '#2c5545',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <Mic style={{ width: '10px', height: '10px' }} />
              {expanded ? 'Ocultar insights Plaud' : 'Ver insights da reunião'}
              <ChevronDown style={{ width: '10px', height: '10px', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>
            {expanded && (
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '6px', padding: '12px', marginTop: '8px' }}>
                {meeting.ai_summary && (
                  <div style={{ marginBottom: meeting.key_points?.length ? '10px' : 0 }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Resumo IA</p>
                    <p style={{ fontSize: '12px', color: text, lineHeight: 1.6 }}>{meeting.ai_summary}</p>
                  </div>
                )}
                {meeting.key_points && meeting.key_points.length > 0 && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Pontos-chave</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {meeting.key_points.map((pt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2c5545', flexShrink: 0, marginTop: '6px' }} />
                          <p style={{ fontSize: '12px', color: text, lineHeight: 1.5 }}>{pt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
          <div style={{
            width: '16px', height: '16px', borderRadius: '50%',
            backgroundColor: activity.owner.avatar_color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '6px', fontWeight: 700,
          }}>
            {activity.owner.initials}
          </div>
          <span style={{ fontSize: '10px', color: muted }}>{activity.owner.name.split(' ')[0]}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Health score ─────────────────────────────────────────────────────────────

function healthScore(deal: Deal): number {
  let score = 0
  score += Math.min(deal.probability, 40)
  if (deal.last_activity_at) {
    const days = Math.round((Date.now() - new Date(deal.last_activity_at).getTime()) / 86_400_000)
    if (days <= 7) score += 25; else if (days <= 14) score += 15; else if (days <= 30) score += 5
  }
  const sCount = deal.stakeholders?.length ?? 0
  if (sCount >= 3) score += 20; else if (sCount >= 2) score += 12; else if (sCount >= 1) score += 5
  if (deal.days_in_stage > 90) score -= 15; else if (deal.days_in_stage > 60) score -= 8
  return Math.min(Math.max(score, 0), 100)
}

function HealthBar({ score, isDark }: { score: number; isDark: boolean }) {
  const color = score >= 70 ? '#2d9e6b' : score >= 40 ? '#b45309' : '#c53030'
  const label = score >= 70 ? 'Saudável' : score >= 40 ? 'Atenção' : 'Risco'
  const trackBg = isDark ? '#1e1e1c' : '#eeece8'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{score}</span>
        <span style={{ fontSize: '11px', fontWeight: 600, color }}>{label}</span>
      </div>
      <div style={{ height: '5px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '99px', width: `${score}%`, backgroundColor: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

// ─── Add Activity Form ────────────────────────────────────────────────────────

function AddActivityForm({ dealId, owner, onClose, isDark }: {
  dealId: string; owner: Deal['owner']; onClose: () => void; isDark: boolean
}) {
  const addActivity = useActivityStore((s) => s.addActivity)
  const [type, setType]       = useState<DealActivity['type']>('call')
  const [subject, setSubject] = useState('')
  const [body, setBody]       = useState('')
  const [saving, setSaving]   = useState(false)

  const border  = isDark ? '#2a2a28' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const inputBg = isDark ? '#111110' : '#f8f7f4'

  const TYPES: { value: DealActivity['type']; label: string }[] = [
    { value: 'call', label: 'Ligação' }, { value: 'email', label: 'Email' },
    { value: 'meeting', label: 'Reunião' }, { value: 'task', label: 'Tarefa' },
    { value: 'note', label: 'Nota' },
  ]

  async function handleSave() {
    if (!subject.trim()) return
    setSaving(true)
    try {
      await addActivity(dealId, { type, subject: subject.trim(), body: body.trim() || undefined, owner })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div style={{
      backgroundColor: isDark ? '#1a1a18' : '#f0eeea',
      border: `1px solid ${border}`, borderRadius: '8px',
      padding: '14px', marginBottom: '16px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {TYPES.map((t) => (
          <button key={t.value} type="button" onClick={() => setType(t.value)} style={{
            fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '5px',
            border: `1px solid ${type === t.value ? ACT_COLORS[t.value] : border}`,
            backgroundColor: type === t.value ? `${ACT_COLORS[t.value]}18` : 'transparent',
            color: type === t.value ? ACT_COLORS[t.value] : isDark ? '#6b6560' : '#8a857d',
            cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>
      <input autoFocus type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto..."
        style={{ height: '34px', padding: '0 10px', fontSize: '13px', fontWeight: 500, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none' }} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notas (opcional)..." rows={3}
        style={{ padding: '8px 10px', fontSize: '12px', lineHeight: 1.6, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} style={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#6b6560' : '#8a857d', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px' }}>Cancelar</button>
        <button type="button" onClick={handleSave} disabled={saving || !subject.trim()} style={{
          fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '6px',
          backgroundColor: subject.trim() ? (isDark ? '#f0ede5' : '#1a1814') : (isDark ? '#2a2a28' : '#e4e0da'),
          color: subject.trim() ? (isDark ? '#0f0e0c' : '#f0ede5') : (isDark ? '#4a4a48' : '#a09890'),
          border: 'none', cursor: subject.trim() ? 'pointer' : 'not-allowed',
        }}>{saving ? 'Salvando...' : 'Registrar'}</button>
      </div>
    </div>
  )
}

// ─── Notes section ────────────────────────────────────────────────────────────

function NotesSection({ dealId, owner, isDark, border, text, muted }: {
  dealId: string; owner: Deal['owner']; isDark: boolean; border: string; text: string; muted: string
}) {
  const addActivity = useActivityStore((s) => s.addActivity)
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!note.trim()) return
    setSaving(true)
    try {
      await addActivity(dealId, { type: 'note', subject: note.trim(), owner })
      setNote('')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ borderTop: `1px solid ${border}`, padding: '20px 24px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
        Anotações
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Adicione uma nota sobre este deal..."
        style={{
          width: '100%', minHeight: '120px', resize: 'vertical',
          borderRadius: '8px', border: `1px solid rgb(var(--line-rgb))`,
          padding: '12px', fontSize: '13px', fontFamily: 'inherit',
          fontWeight: 400, lineHeight: 1.6,
          backgroundColor: isDark ? '#111110' : '#f8f7f4',
          color: text, outline: 'none', boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !note.trim()}
          style={{
            height: '32px', padding: '0 16px', fontSize: '12px', fontWeight: 500,
            borderRadius: '6px', border: 'none',
            backgroundColor: note.trim() ? (isDark ? '#e8e4dc' : '#1a1814') : (isDark ? '#2a2a28' : '#e4e0da'),
            color: note.trim() ? (isDark ? '#0f0e0c' : '#f0ede5') : muted,
            cursor: note.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar nota'}
        </button>
      </div>
    </div>
  )
}

// ─── Resize handle ────────────────────────────────────────────────────────────

function ResizeHandle({
  onMouseDown,
  isDark,
}: {
  onMouseDown: (e: React.MouseEvent) => void
  isDark: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '4px', flexShrink: 0, cursor: 'col-resize',
        backgroundColor: hovered
          ? (isDark ? 'rgba(58,56,52,0.3)' : 'rgba(196,191,184,0.3)')
          : 'transparent',
        transition: 'background-color 0.15s ease',
        zIndex: 1,
      }}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DealDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isDark   = useThemeStore((s) => s.isDark)
  const deal     = useDealStore((s) => s.deals.find((d) => d.id === id))

  const fetchActivities = useActivityStore((s) => s.fetchForDeal)
  const byDeal          = useActivityStore((s) => s.byDeal)
  const activities      = (id ? byDeal[id] : undefined) ?? []
  const allMeetings     = useMeetingStore((s) => s.meetings)
  const meetings        = useMemo(
    () => allMeetings.filter((m) => m.deal_id === id),
    [allMeetings, id],
  )

  const leftColWidth    = useAppStore((s) => s.leftColWidth)
  const rightColWidth   = useAppStore((s) => s.rightColWidth)
  const setLeftColWidth  = useAppStore((s) => s.setLeftColWidth)
  const setRightColWidth = useAppStore((s) => s.setRightColWidth)

  const [showAddActivity, setShowAddActivity] = useState(false)

  useEffect(() => {
    if (id) fetchActivities(id)
  }, [id, fetchActivities])

  const startResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = leftColWidth
    const onMove = (ev: MouseEvent) => setLeftColWidth(startW + (ev.clientX - startX))
    const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [leftColWidth, setLeftColWidth])

  const startResizeRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = rightColWidth
    const onMove = (ev: MouseEvent) => setRightColWidth(startW - (ev.clientX - startX))
    const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [rightColWidth, setRightColWidth])

  if (!deal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#8a857d' }}>
          {'Lead não encontrado'}
        </p>
        <button type="button" onClick={() => navigate('/pipeline')} style={{ fontSize: '13px', fontWeight: 600, color: '#2c5545', background: 'none', border: 'none', cursor: 'pointer' }}>
          Voltar ao Pipeline
        </button>
      </div>
    )
  }

  const stageColor  = getStageColor(deal.stage_id)
  const stage       = STAGES.find((s) => s.id === deal.stage_id)
  const tag         = (deal.tags as string[] | null)?.[0]

  const contactName = deal.contact_name ?? deal.company_name ?? ''
  const initials    = contactName
    ? contactName.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
    : '?'
  const avatarColor = contactName ? hashColor(contactName) : '#6b6560'

  const owner = (deal.owner as (typeof deal.owner) | null) ?? {
    id: '', name: 'Desconhecido', initials: '?', avatar_color: '#6b6560',
  }

  const score = healthScore(deal)

  const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'
  const cardBg  = isDark ? '#161614' : '#ffffff'
  const sideBg  = isDark ? '#111110' : '#faf9f6'
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: pageBg }}>

      {/* ── Page header ── */}
      <div style={{
        height: '52px', minHeight: '52px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${border}`, flexShrink: 0, gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <button type="button" onClick={() => navigate('/pipeline')} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '13px', color: muted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}>
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
            Pipeline
          </button>
          <span style={{ fontSize: '13px', color: border, flexShrink: 0 }}>/</span>
          <p style={{ fontSize: '14px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deal.title}
          </p>
          {stage && (
            <span style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 600, color: stageColor,
              backgroundColor: `${stageColor}14`, borderRadius: '99px', padding: '3px 10px',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: stageColor }} />
              {stage.label}
            </span>
          )}
        </div>
      </div>

      {/* ── 3-column body ── */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex',
        margin: '16px', gap: '0',
        border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden',
      }}>

        {/* ── Left: deal info ── */}
        <aside style={{
          width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, flexShrink: 0,
          backgroundColor: sideBg, overflowY: 'auto',
        }}>
          <div style={{ padding: '20px 18px' }}>

            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', backgroundColor: avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '16px', fontWeight: 700,
            }}>
              {initials}
            </div>

            <p style={{ fontSize: '16px', fontWeight: 700, color: text, marginTop: '10px', lineHeight: 1.25 }}>
              {contactName}
            </p>
            {deal.contact_title && (
              <p style={{ fontSize: '12px', color: muted, marginTop: '2px' }}>{deal.contact_title}</p>
            )}
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#2c5545', marginTop: '2px' }}>
              {deal.company_name}
            </p>
            {tag && (
              <span style={{
                display: 'inline-block', fontSize: '10px', fontWeight: 700,
                color: stageColor, backgroundColor: `${stageColor}12`,
                border: `1px solid ${stageColor}30`, borderRadius: '4px',
                padding: '2px 8px', marginTop: '8px',
              }}>
                {tag}
              </span>
            )}

            {/* Summary grid — 3 key numbers */}
            <div style={{
              backgroundColor: isDark ? '#1a1a18' : '#f0eeea',
              borderRadius: '8px', padding: '12px 14px', marginTop: '14px',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
            }}>
              {[
                { label: 'Valor', value: formatCurrency(deal.value) },
                { label: 'Probabilidade', value: `${deal.probability}%` },
                { label: 'Dias na etapa', value: `${deal.days_in_stage}d`, urgent: deal.days_in_stage > 90 },
                { label: 'Previsão', value: formatDate(deal.expected_close) },
              ].map(({ label, value: v, urgent }) => (
                <div key={label}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: urgent ? '#c53030' : text, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                    {v}
                  </p>
                </div>
              ))}
            </div>

            {/* Contato */}
            <SectionHead title="Contato" border={border} muted={muted} />
            {deal.contact_email && <LinkField label="Email" icon={Mail} href={`mailto:${deal.contact_email}`} muted={muted}>{deal.contact_email}</LinkField>}
            {deal.contact_phone && <LinkField label="Telefone" icon={Phone} href={`tel:${deal.contact_phone}`} muted={muted}>{deal.contact_phone}</LinkField>}
            {deal.contact_linkedin && <LinkField label="LinkedIn" icon={Linkedin} href={deal.contact_linkedin} external muted={muted}>Ver perfil ↗</LinkField>}
            {deal.company_website && <LinkField label="Site" icon={Globe} href={deal.company_website} external muted={muted}>{deal.company_website.replace(/^https?:\/\//, '')} ↗</LinkField>}

            {/* Empresa */}
            <SectionHead title="Empresa" border={border} muted={muted} />
            {deal.company_sector && <Field label="Setor" icon={Building2} muted={muted} text={text}>{deal.company_sector}</Field>}
            {deal.company_size && <Field label="Tamanho" icon={Users} muted={muted} text={text}>{SIZE_LABELS[deal.company_size] ?? deal.company_size}</Field>}
            {deal.company_arr_range && <Field label="ARR Estimado" icon={Target} muted={muted} text={text}>{ARR_LABELS[deal.company_arr_range] ?? deal.company_arr_range}</Field>}

            {/* Lead */}
            <SectionHead title="Lead" border={border} muted={muted} />
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Responsável</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: owner.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '7px', fontWeight: 700, flexShrink: 0 }}>
                  {owner.initials}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: text }}>{owner.name}</span>
              </div>
            </div>
            {deal.lead_source && <Field label="Origem" icon={MapPin} muted={muted} text={text}>{deal.lead_source}</Field>}
            {deal.next_activity && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Próx. atividade</p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Zap style={{ width: '13px', height: '13px', color: muted, flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: text }}>{deal.next_activity.label}</p>
                    <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>{formatDate(deal.next_activity.due_date)}</p>
                  </div>
                </div>
              </div>
            )}
            {deal.last_activity_at && <Field label="Última atividade" icon={Clock} muted={muted} text={text}>{relativeDate(deal.last_activity_at)}</Field>}
          </div>
        </aside>

        {/* ── Resize handle left ── */}
        <ResizeHandle onMouseDown={startResizeLeft} isDark={isDark} />

        {/* ── Center: activity timeline + notes ── */}
        <div style={{ flex: 1, minWidth: 0, backgroundColor: cardBg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Center header */}
          <div style={{ padding: '18px 24px 12px', borderBottom: `1px solid ${border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>Histórico & Atividades</p>
              <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>
                {activities.length} {activities.length === 1 ? 'registro' : 'registros'} · {meetings.filter((m) => m.plaud_note_id).length} com Plaud Note
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddActivity((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '12px', fontWeight: 600,
                color: showAddActivity ? muted : (isDark ? '#e8e4dc' : '#1a1814'),
                backgroundColor: showAddActivity ? 'transparent' : (isDark ? '#1e1e1c' : '#f0eeea'),
                border: `1px solid ${border}`, borderRadius: '6px',
                padding: '5px 10px', cursor: 'pointer',
              }}
            >
              {showAddActivity
                ? <><X style={{ width: '11px', height: '11px' }} />Cancelar</>
                : <><Plus style={{ width: '11px', height: '11px' }} />Registrar</>}
            </button>
          </div>

          {/* Activities */}
          <div style={{ padding: '20px 24px' }}>
            {showAddActivity && (
              <AddActivityForm dealId={deal.id} owner={owner} onClose={() => setShowAddActivity(false)} isDark={isDark} />
            )}
            {activities.length === 0 && !showAddActivity ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '120px', textAlign: 'center', gap: '8px' }}>
                <Zap style={{ width: '24px', height: '24px', color: border }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: muted }}>Nenhuma atividade registrada</p>
                <p style={{ fontSize: '12px', color: isDark ? '#3a3834' : '#c4bfb8', maxWidth: '220px', lineHeight: 1.6 }}>
                  Clique em "Registrar" para adicionar ligações, emails e reuniões
                </p>
              </div>
            ) : (
              <div>
                {activities.map((activity) => {
                  const relatedMeeting = activity.meeting_id
                    ? meetings.find((m) => m.id === activity.meeting_id)
                    : undefined
                  return (
                    <ActivityEntry key={activity.id} activity={activity} meeting={relatedMeeting} isDark={isDark} />
                  )
                })}
              </div>
            )}
          </div>

          {/* Notes section */}
          <NotesSection dealId={deal.id} owner={owner} isDark={isDark} border={border} text={text} muted={muted} />
        </div>

        {/* ── Resize handle right ── */}
        <ResizeHandle onMouseDown={startResizeRight} isDark={isDark} />

        {/* ── Right: insights ── */}
        <div style={{ width: `${rightColWidth}px`, minWidth: `${rightColWidth}px`, flexShrink: 0, backgroundColor: sideBg, overflowY: 'auto' }}>
          <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${border}` }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>Insights</p>
          </div>

          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Lead health */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Saúde do Lead
              </p>
              <HealthBar score={score} isDark={isDark} />
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {[
                  { label: 'Probabilidade', value: `${deal.probability}%`, ok: deal.probability >= 50 },
                  { label: 'Última atividade', value: deal.last_activity_at ? relativeDate(deal.last_activity_at) : '—', ok: deal.last_activity_at ? (Date.now() - new Date(deal.last_activity_at).getTime()) / 86_400_000 <= 14 : false },
                  { label: 'Stakeholders', value: `${deal.stakeholders?.length ?? 0} mapeados`, ok: (deal.stakeholders?.length ?? 0) >= 2 },
                  { label: 'Tempo na etapa', value: `${deal.days_in_stage}d`, ok: deal.days_in_stage <= 60 },
                ].map(({ label, value: v, ok }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: muted }}>{label}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: ok ? '#2d9e6b' : isDark ? '#fc8181' : '#c53030' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Plaud meeting summary */}
            {meetings.filter((m) => m.plaud_note_id).length > 0 && (() => {
              const last = meetings.filter((m) => m.plaud_note_id).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0]
              return (
                <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Mic style={{ width: '13px', height: '13px', color: '#2c5545' }} />
                    <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Última Reunião Plaud
                    </p>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '4px' }}>{last.title}</p>
                  <p style={{ fontSize: '10px', color: muted, marginBottom: '8px' }}>{formatDate(last.scheduled_at)} · {last.duration_minutes}min</p>
                  {last.action_items && last.action_items.length > 0 && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Ações pendentes</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {last.action_items.slice(0, 3).map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <span style={{ width: '14px', height: '14px', borderRadius: '3px', border: `1.5px solid ${border}`, flexShrink: 0, marginTop: '1px' }} />
                            <p style={{ fontSize: '11px', color: text, lineHeight: 1.5 }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Risk signals */}
            {(deal.days_in_stage > 60 || !deal.next_activity) && (
              <div style={{ backgroundColor: isDark ? '#2d1515' : '#fff5f5', border: `1px solid ${isDark ? '#4a1f1f' : '#fecaca'}`, borderRadius: '8px', padding: '12px 14px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#c53030', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Alertas de Risco</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {deal.days_in_stage > 90 && <p style={{ fontSize: '12px', color: isDark ? '#fc8181' : '#c53030' }}>⚠ Estagnado há {deal.days_in_stage} dias nesta etapa</p>}
                  {deal.days_in_stage > 60 && deal.days_in_stage <= 90 && <p style={{ fontSize: '12px', color: '#b45309' }}>⚠ {deal.days_in_stage} dias nesta etapa — acima da média</p>}
                  {!deal.next_activity && <p style={{ fontSize: '12px', color: isDark ? '#fc8181' : '#c53030' }}>⚠ Sem próxima atividade agendada</p>}
                </div>
              </div>
            )}

            {/* Stakeholders */}
            {deal.stakeholders && deal.stakeholders.length > 0 && (
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '14px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  Stakeholders ({deal.stakeholders.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {deal.stakeholders.map((s) => (
                    <div key={s.initials} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '7px', fontWeight: 700, flexShrink: 0 }}>
                        {s.initials}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: text }}>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
