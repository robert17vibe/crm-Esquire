import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft, Mail, Phone, Linkedin, Globe,
  Building2, Users, MapPin,
  Zap, Clock, Video, CheckSquare, FileText,
  Mic, ChevronDown, Plus, X, Pencil,
} from 'lucide-react'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useTaskStore } from '@/store/useTaskStore'
import { STAGES } from '@/constants/pipeline'
import { supabase } from '@/lib/supabase'
import { fetchDealEvents } from '@/services/deal-events.service'
import { useTeamStore } from '@/store/useTeamStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { Deal, DealActivity, DealMeeting, NextActivity, Stakeholder, CompanySize, ArrRange, DealEvent } from '@/types/deal.types'
import { UserAvatarRow, getInitials, getAvatarColor } from '@/components/ui/UserAvatar'
import { RelatedDeals } from '@/components/deal/RelatedDeals'
import { StakeholderMap } from '@/components/deal/StakeholderMap'

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

const NEXT_ACT_TYPES: { value: NextActivity['type']; label: string }[] = [
  { value: 'call', label: 'Ligação' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'task', label: 'Tarefa' },
  { value: 'email', label: 'Email' },
]

const FIELD_LABELS: Record<string, string> = {
  stage_id: 'Etapa', value: 'Valor', probability: 'Probabilidade',
  expected_close: 'Previsão', company_sector: 'Setor', company_size: 'Tamanho',
  company_arr_range: 'ARR', owner_id: 'Responsável', stakeholders: 'Stakeholders',
  next_activity: 'Próx. atividade', team_id: 'Time',
}

const SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: '1-50', label: '1–50 func.' },
  { value: '51-200', label: '51–200 func.' },
  { value: '201-1000', label: '201–1k func.' },
  { value: '1000+', label: '1k+ func.' },
]

const ARR_OPTIONS: { value: ArrRange; label: string }[] = [
  { value: '<100k', label: '< R$ 100k' },
  { value: '100k-500k', label: 'R$ 100k–500k' },
  { value: '500k-1M', label: 'R$ 500k–1M' },
  { value: '>1M', label: '> R$ 1M' },
]

// ─── Building blocks ──────────────────────────────────────────────────────────

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

// ─── Timeline helpers ─────────────────────────────────────────────────────────

type TimelineEntry =
  | { kind: 'activity'; date: string; activity: DealActivity; meeting?: DealMeeting }
  | { kind: 'meeting';  date: string; meeting: DealMeeting }

function getGroupLabel(dateStr: string): string {
  const d    = new Date(dateStr + 'T00:00:00')
  const now  = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff <= 7)  return 'Esta semana'
  if (diff <= 30) return 'Este mês'
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
}

function buildTimeline(activities: DealActivity[], meetings: DealMeeting[]): TimelineEntry[] {
  const actEntries: TimelineEntry[] = activities.map((a) => ({
    kind: 'activity',
    date: a.created_at.slice(0, 10),
    activity: a,
    meeting: meetings.find((m) => m.id === a.meeting_id),
  }))

  const linkedMeetingIds = new Set(activities.map((a) => a.meeting_id).filter(Boolean))
  const meetingEntries: TimelineEntry[] = meetings
    .filter((m) => !linkedMeetingIds.has(m.id))
    .map((m) => ({ kind: 'meeting', date: m.scheduled_at.slice(0, 10), meeting: m }))

  return [...actEntries, ...meetingEntries].sort((a, b) => b.date.localeCompare(a.date))
}

// ─── Standalone meeting entry ─────────────────────────────────────────────────

function StandaloneMeetingEntry({ meeting, isDark }: { meeting: DealMeeting; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const color  = '#2c5545'
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
          <Mic style={{ width: '12px', height: '12px', color }} />
        </div>
        <div style={{ width: '1px', flex: 1, backgroundColor: border, marginTop: '4px' }} />
      </div>
      <div style={{ flex: 1, paddingBottom: '16px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color, backgroundColor: `${color}14`, borderRadius: '3px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Reunião
              </span>
              {meeting.plaud_note_id && (
                <span style={{ fontSize: '9px', fontWeight: 700, color, backgroundColor: `${color}14`, borderRadius: '3px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.06em', border: `1px solid ${color}30` }}>
                  Plaud
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: text, marginTop: '4px' }}>{meeting.title}</p>
            <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>
              {meeting.duration_minutes}min · {meeting.attendees?.length ?? 0} participantes
            </p>
          </div>
          <span style={{ fontSize: '10px', color: muted, flexShrink: 0, marginTop: '2px' }}>
            {relativeDate(meeting.scheduled_at)}
          </span>
        </div>
        {(meeting.ai_summary || (meeting.key_points?.length ?? 0) > 0) && (
          <div style={{ marginTop: '8px' }}>
            <button type="button" onClick={() => setExpanded((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Mic style={{ width: '10px', height: '10px' }} />
              {expanded ? 'Ocultar insights' : 'Ver insights Plaud'}
              <ChevronDown style={{ width: '10px', height: '10px', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {expanded && meeting.ai_summary && (
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '6px', padding: '12px', marginTop: '8px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Resumo IA</p>
                <p style={{ fontSize: '12px', color: text, lineHeight: 1.6 }}>{meeting.ai_summary}</p>
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: meeting.owner.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '6px', fontWeight: 700 }}>
            {meeting.owner.initials}
          </div>
          <span style={{ fontSize: '10px', color: muted }}>{meeting.owner.name.split(' ')[0]}</span>
        </div>
      </div>
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

// ─── Proposal tab ────────────────────────────────────────────────────────────

function ProposalTab({ deal, isDark, border, text, muted, inputBg }: {
  deal: Deal; isDark: boolean; border: string; text: string; muted: string; inputBg: string
}) {
  const storageKey = `esq_proposal_${deal.id}`
  const [title, setTitle]     = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}').title ?? deal.title } catch { return deal.title } })
  const [validity, setValidity] = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}').validity ?? '' } catch { return '' } })
  const [scope, setScope]     = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}').scope ?? '' } catch { return '' } })
  const [saved, setSaved]     = useState(false)

  function handleSave() {
    localStorage.setItem(storageKey, JSON.stringify({ title, validity, scope }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleCopy() {
    const txt = `PROPOSTA COMERCIAL\n\nTítulo: ${title}\nEmpresa: ${deal.company_name ?? '—'}\nValor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}\nValidade: ${validity || '—'}\n\nEscopo:\n${scope || '—'}`
    navigator.clipboard.writeText(txt).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ backgroundColor: isDark ? '#1a1a18' : '#f8f7f4', border: `1px solid ${border}`, borderRadius: '8px', padding: '16px 18px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Rascunho de Proposta</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Título</p>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', fontWeight: 500, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Valor</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#2d9e6b', fontVariantNumeric: 'tabular-nums' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.value)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Validade</p>
              <input type="date" value={validity} onChange={(e) => setValidity(e.target.value)}
                style={{ width: '100%', height: '30px', padding: '0 8px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '5px', color: text, outline: 'none', colorScheme: isDark ? 'dark' : 'light', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Escopo / Observações</p>
            <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={6}
              placeholder="Descreva o escopo, entregáveis, condições especiais..."
              style={{ width: '100%', padding: '10px 12px', fontSize: '12px', lineHeight: 1.6, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" onClick={handleCopy}
            style={{ fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, cursor: 'pointer' }}>
            Copiar texto
          </button>
          <button type="button" onClick={handleSave}
            style={{ fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: isDark ? '#f0ede5' : '#1a1814', color: isDark ? '#0f0e0c' : '#f0ede5', cursor: 'pointer' }}>
            {saved ? '✓ Salvo' : 'Salvar rascunho'}
          </button>
        </div>
      </div>

      <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic', textAlign: 'center' }}>
        Rascunho salvo localmente neste dispositivo
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DealDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isDark   = useThemeStore((s) => s.isDark)
  const deal     = useDealStore((s) => s.deals.find((d) => d.id === id))

  const moveDeal        = useDealStore((s) => s.moveDeal)
  const fetchActivities = useActivityStore((s) => s.fetchForDeal)
  const byDeal          = useActivityStore((s) => s.byDeal)
  const activities      = (id ? byDeal[id] : undefined) ?? []
  const allMeetings     = useMeetingStore((s) => s.meetings)
  const meetings        = useMemo(
    () => allMeetings.filter((m) => m.deal_id === id),
    [allMeetings, id],
  )

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'notes' | 'proposal' | 'tasks'>('overview')
  const [_showStageMenu, _setShowStageMenu] = useState(false)
  const [pendingLossStage, setPendingLossStage] = useState(false)
  const [lossReasonDraft, setLossReasonDraft]   = useState('')

  const createTask  = useTaskStore((s) => s.create)
  const allTasks    = useTaskStore((s) => s.tasks)
  const dealTasks   = useMemo(() => allTasks.filter((t) => t.deal_id === id), [allTasks, id])
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [showQuickTask, setShowQuickTask] = useState(false)
  const [quickTaskTitle, setQuickTaskTitle] = useState('')
  const [quickTaskDate, setQuickTaskDate]   = useState('')
  const [savingQuickTask, setSavingQuickTask] = useState(false)
  const setNextActivity    = useDealStore((s) => s.setNextActivity)
  const patchDealFields    = useDealStore((s) => s.patchDealFields)
  const [editingNextAct, setEditingNextAct]   = useState(false)
  const [nextActType, setNextActType]         = useState<NextActivity['type']>('call')
  const [nextActLabel, setNextActLabel]       = useState('')
  const [nextActDate, setNextActDate]         = useState('')
  const [savingNextAct, setSavingNextAct]     = useState(false)

  // ── Inline field edit ────────────────────────────────────────────────────────
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editDraft, setEditDraft]       = useState('')
  const [savingField, setSavingField]   = useState(false)

  // ── Stakeholders ─────────────────────────────────────────────────────────────
  const [showAddStakeholder, setShowAddStakeholder] = useState(false)
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null; email: string; avatar_color: string }[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)

  // ── Teams ────────────────────────────────────────────────────────────────────
  const teams = useTeamStore((s) => s.teams)

  // ── Audit log ────────────────────────────────────────────────────────────────
  const [showHistory, setShowHistory]     = useState(false)
  const [dealEvents, setDealEvents]       = useState<DealEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const clearByDeal = useNotificationStore((s) => s.clearByDeal)

  useEffect(() => {
    if (id) fetchActivities(id)
  }, [id, fetchActivities])

  useEffect(() => {
    if (!id) return
    const t = setTimeout(() => clearByDeal(id), 2000)
    return () => clearTimeout(t)
  }, [id, clearByDeal])

  function startEdit(field: string, current: string) {
    setEditingField(field)
    setEditDraft(current)
  }

  async function saveField(patch: Partial<Deal>) {
    if (savingField || !deal) return
    setSavingField(true)
    try {
      await patchDealFields(deal.id, patch)
      setEditingField(null)
    } finally {
      setSavingField(false)
    }
  }

  function cancelEdit() {
    setEditingField(null)
    setEditDraft('')
  }

  async function loadProfiles(force = false) {
    if (!force && profiles.length > 0) return
    setLoadingProfiles(true)
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, email, avatar_color')
      setProfiles((data ?? []) as typeof profiles)
    } finally {
      setLoadingProfiles(false)
    }
  }

  async function addStakeholder(profile: { id: string; full_name: string | null; email: string; avatar_color: string }) {
    if (!deal) return
    const existing = deal.stakeholders ?? []
    const displayName = profile.full_name || profile.email.split('@')[0]
    const initials = getInitials(displayName)
    const color = profile.avatar_color || getAvatarColor(profile.id)
    const newS: Stakeholder = { initials, color, name: displayName }
    await patchDealFields(deal.id, { stakeholders: [...existing, newS] })
    setShowAddStakeholder(false)
  }

  async function removeStakeholder(index: number) {
    if (!deal) return
    const existing = deal.stakeholders ?? []
    await patchDealFields(deal.id, { stakeholders: existing.filter((_, i) => i !== index) })
  }

  async function loadEvents() {
    if (!deal || loadingEvents) return
    setLoadingEvents(true)
    try {
      const events = await fetchDealEvents(deal.id)
      setDealEvents(events)
    } catch {
      setDealEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }


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

  const contactName = deal.contact_name ?? deal.company_name ?? ''
  const initials    = contactName
    ? contactName.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
    : '?'
  const avatarColor = contactName ? hashColor(contactName) : '#6b6560'

  const owner = (deal.owner as (typeof deal.owner) | null) ?? {
    id: '', name: 'Desconhecido', initials: '?', avatar_color: '#6b6560',
  }

  const score = healthScore(deal)

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f8f7f4'

  const currentStage = STAGES.find((s) => s.id === deal.stage_id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--surface-base)' }}>

      {/* ── Page header ── */}
      <div style={{
        height: '52px', minHeight: '52px', display: 'flex', alignItems: 'center',
        padding: '0 20px', borderBottom: '1px solid var(--line)', flexShrink: 0, gap: '8px',
      }}>
        <button type="button" onClick={() => navigate('/pipeline')} style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '12px', color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
        }}>
          <ArrowLeft style={{ width: '13px', height: '13px' }} />
          Jornada
        </button>
        <span style={{ fontSize: '13px', color: 'var(--line)', flexShrink: 0 }}>/</span>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {deal.title}
        </p>
        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <a href={`mailto:${deal.contact_email ?? ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              height: '30px', padding: '0 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)', backgroundColor: 'transparent',
              fontSize: '12px', fontWeight: 500, color: 'var(--ink-muted)', textDecoration: 'none',
              cursor: deal.contact_email ? 'pointer' : 'default',
              opacity: deal.contact_email ? 1 : 0.4,
            }}>
            <Mail style={{ width: '12px', height: '12px' }} />
            Email
          </a>
          <button type="button"
            onClick={() => moveDeal(deal.id, 'closed_won')}
            disabled={deal.stage_id === 'closed_won'}
            style={{
              height: '30px', padding: '0 14px', borderRadius: 'var(--radius-sm)',
              border: 'none', backgroundColor: deal.stage_id === 'closed_won' ? '#2d9e6b22' : '#2d9e6b',
              fontSize: '12px', fontWeight: 600,
              color: deal.stage_id === 'closed_won' ? '#2d9e6b' : '#fff',
              cursor: deal.stage_id === 'closed_won' ? 'default' : 'pointer',
            }}>
            {deal.stage_id === 'closed_won' ? '✓ Ganho' : 'Marcar Ganho'}
          </button>
          <button type="button"
            onClick={() => { setPendingLossStage(true); setLossReasonDraft('') }}
            disabled={deal.stage_id === 'closed_lost'}
            style={{
              height: '30px', padding: '0 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)', backgroundColor: 'transparent',
              fontSize: '12px', fontWeight: 500, color: deal.stage_id === 'closed_lost' ? '#c53030' : 'var(--ink-muted)',
              cursor: deal.stage_id === 'closed_lost' ? 'default' : 'pointer',
            }}>
            {deal.stage_id === 'closed_lost' ? '✗ Perdido' : 'Marcar Perdido'}
          </button>
        </div>
      </div>

      {/* ── Stage selector strip ── */}
      <div style={{
        flexShrink: 0, padding: '8px 20px 0',
        display: 'flex', flexDirection: 'column', gap: '0',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflowX: 'auto', paddingBottom: '8px' }}>
          {STAGES.map((s, idx) => {
            const isActive = deal.stage_id === s.id
            const isPrev   = STAGES.findIndex((st) => st.id === deal.stage_id) > idx
            return (
              <button
                key={s.id} type="button"
                onClick={() => {
                  if (s.id === deal.stage_id) return
                  if (s.id === 'closed_lost') {
                    setPendingLossStage(true)
                    setLossReasonDraft('')
                  } else {
                    moveDeal(deal.id, s.id)
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  height: '28px', padding: '0 11px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
                  fontSize: '11px', fontWeight: isActive ? 700 : 500,
                  color: isActive ? s.color : isPrev ? 'var(--ink-faint)' : 'var(--ink-muted)',
                  backgroundColor: isActive ? `${s.color}18` : 'transparent',
                  border: isActive ? `1.5px solid ${s.color}50` : '1.5px solid transparent',
                  cursor: s.id === deal.stage_id ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--surface-raised)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                {isActive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />}
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Inline loss reason picker */}
        {pendingLossStage && (
          <div style={{
            backgroundColor: isDark ? '#1a1210' : '#fff5f5',
            border: `1px solid ${isDark ? '#4a2020' : '#fecaca'}`,
            borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '10px',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#c53030', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Motivo da perda
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['Preço', 'Concorrência', 'Timing', 'Sem budget', 'Sem fit', 'Sem resposta', 'Outro'].map((r) => (
                <button key={r} type="button" onClick={() => setLossReasonDraft(r)}
                  style={{
                    fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: `1px solid ${lossReasonDraft === r ? '#c53030' : (isDark ? '#3a2a2a' : '#fecaca')}`,
                    backgroundColor: lossReasonDraft === r ? '#c5303018' : 'transparent',
                    color: lossReasonDraft === r ? '#c53030' : (isDark ? '#9a7070' : '#b45309'),
                  }}>{r}</button>
              ))}
            </div>
            <input type="text" value={lossReasonDraft} onChange={(e) => setLossReasonDraft(e.target.value)}
              placeholder="Ou descreva o motivo..."
              style={{ height: '32px', padding: '0 10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${isDark ? '#4a2020' : '#fecaca'}`, borderRadius: 'var(--radius-sm)', color: text, outline: 'none' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setPendingLossStage(false)}
                style={{ fontSize: '12px', fontWeight: 600, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 10px' }}>
                Cancelar
              </button>
              <button type="button"
                disabled={!lossReasonDraft.trim()}
                onClick={() => {
                  moveDeal(deal.id, 'closed_lost')
                  setPendingLossStage(false)
                  setLossReasonDraft('')
                }}
                style={{
                  fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: lossReasonDraft.trim() ? 'pointer' : 'not-allowed',
                  backgroundColor: lossReasonDraft.trim() ? '#c53030' : 'var(--surface-raised)',
                  color: lossReasonDraft.trim() ? '#fff' : muted,
                }}>
                Confirmar perda
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2-column body ── */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex',
        padding: '16px', gap: '16px', overflow: 'hidden',
      }}>

        {/* ── Left panel: 300px fixed ── */}
        <aside style={{
          width: '300px', minWidth: '300px', flexShrink: 0,
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px',
        }}>

          {/* ── Identity card ── */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-full)', backgroundColor: avatarColor, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '15px', fontWeight: 700,
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: text, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {deal.title}
                </p>
                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brand)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {deal.company_name ?? contactName}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {currentStage && (
                <span style={{ fontSize: '10px', fontWeight: 700, color: currentStage.color, backgroundColor: `${currentStage.color}18`, borderRadius: 'var(--radius-full)', padding: '2px 8px', border: `1px solid ${currentStage.color}30` }}>
                  {currentStage.label}
                </span>
              )}
              <span style={{ fontSize: '13px', fontWeight: 700, color: text, fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(deal.value)}
              </span>
              <span style={{ fontSize: '12px', color: muted }}>·</span>
              <span style={{ fontSize: '12px', color: muted }}>{deal.probability}%</span>
            </div>
          </div>

          {/* ── Informações card ── */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <p className="section-header" style={{ marginBottom: '12px' }}>Informações</p>

            {/* Owner */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Responsável</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-full)', backgroundColor: owner.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{owner.initials}</div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>{owner.name}</span>
              </div>
            </div>

            {/* Expected close */}
            {deal.expected_close && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Previsão de fecho</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: text }}>{formatDate(deal.expected_close)}</p>
              </div>
            )}

            {/* Company info */}
            {deal.company_sector && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Building2 style={{ width: '12px', height: '12px', color: muted, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: text }}>{deal.company_sector}</span>
              </div>
            )}
            {deal.company_size && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Users style={{ width: '12px', height: '12px', color: muted, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: muted }}>{SIZE_LABELS[deal.company_size] ?? deal.company_size}</span>
              </div>
            )}
            {deal.lead_source && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <MapPin style={{ width: '12px', height: '12px', color: muted, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: muted }}>{deal.lead_source}</span>
              </div>
            )}
            {deal.last_activity_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Clock style={{ width: '12px', height: '12px', color: muted, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: muted }}>Última ativ. {relativeDate(deal.last_activity_at)}</span>
              </div>
            )}

            {/* Edit fields */}
            <div style={{ height: '1px', backgroundColor: 'var(--line)', margin: '10px 0' }} />
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Setor</p>
              {editingField === 'company_sector' ? (
                <input autoFocus type="text" value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => saveField({ company_sector: editDraft.trim() || undefined })}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveField({ company_sector: editDraft.trim() || undefined }); if (e.key === 'Escape') cancelEdit() }}
                  style={{ width: '100%', height: '28px', padding: '0 8px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid var(--line)`, borderRadius: 'var(--radius-sm)', color: text, outline: 'none', boxSizing: 'border-box' }} />
              ) : (
                <div style={{ cursor: 'pointer' }} onClick={() => startEdit('company_sector', deal.company_sector ?? '')} title="Clique para editar">
                  <span style={{ fontSize: '12px', fontWeight: 500, color: deal.company_sector ? text : muted, fontStyle: deal.company_sector ? 'normal' : 'italic', borderBottom: `1px dashed var(--line)` }}>
                    {deal.company_sector ?? 'Adicionar setor...'}
                  </span>
                </div>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Tamanho</p>
              <select value={deal.company_size ?? ''} onChange={(e) => saveField({ company_size: (e.target.value as CompanySize) || undefined })}
                style={{ fontSize: '12px', fontWeight: 500, color: deal.company_size ? text : muted, backgroundColor: inputBg, border: `1px solid var(--line)`, borderRadius: 'var(--radius-sm)', padding: '2px 6px', cursor: 'pointer', outline: 'none', width: '100%' }}>
                <option value="">Selecionar...</option>
                {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>ARR Estimado</p>
              <select value={deal.company_arr_range ?? ''} onChange={(e) => saveField({ company_arr_range: (e.target.value as ArrRange) || undefined })}
                style={{ fontSize: '12px', fontWeight: 500, color: deal.company_arr_range ? text : muted, backgroundColor: inputBg, border: `1px solid var(--line)`, borderRadius: 'var(--radius-sm)', padding: '2px 6px', cursor: 'pointer', outline: 'none', width: '100%' }}>
                <option value="">Selecionar...</option>
                {ARR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {teams.length > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Time</p>
                <select value={(deal as Deal & { team_id?: string }).team_id ?? ''} onChange={(e) => saveField({ team_id: e.target.value || undefined } as Partial<Deal>)}
                  style={{ fontSize: '12px', color: (deal as Deal & { team_id?: string }).team_id ? text : muted, backgroundColor: inputBg, border: `1px solid var(--line)`, borderRadius: 'var(--radius-sm)', padding: '2px 6px', cursor: 'pointer', outline: 'none', width: '100%' }}>
                  <option value="">Sem time</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* ── Próxima atividade card ── */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p className="section-header">Próxima Atividade</p>
              {!editingNextAct && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button type="button" title="Editar" onClick={() => {
                    setNextActType(deal.next_activity?.type ?? 'call')
                    setNextActLabel(deal.next_activity?.label ?? '')
                    setNextActDate(deal.next_activity?.due_date ?? '')
                    setEditingNextAct(true)
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 4px', borderRadius: '3px' }}>
                    <Pencil style={{ width: '10px', height: '10px' }} />
                  </button>
                  {deal.next_activity && (
                    <button type="button" title="Remover" onClick={() => setNextActivity(deal.id, null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 4px', borderRadius: '3px' }}>
                      <X style={{ width: '10px', height: '10px' }} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Próxima atividade (editable) ── */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Próx. atividade</p>
                {!editingNextAct && (
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => {
                        setNextActType(deal.next_activity?.type ?? 'call')
                        setNextActLabel(deal.next_activity?.label ?? '')
                        setNextActDate(deal.next_activity?.due_date ?? '')
                        setEditingNextAct(true)
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 4px', borderRadius: '3px', lineHeight: 1 }}
                    >
                      <Pencil style={{ width: '10px', height: '10px' }} />
                    </button>
                    {deal.next_activity && (
                      <button
                        type="button"
                        title="Remover"
                        onClick={() => setNextActivity(deal.id, null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 4px', borderRadius: '3px', lineHeight: 1 }}
                      >
                        <X style={{ width: '10px', height: '10px' }} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {editingNextAct ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {NEXT_ACT_TYPES.map((t) => (
                      <button key={t.value} type="button" onClick={() => setNextActType(t.value)} style={{
                        fontSize: '10px', fontWeight: 600, padding: '3px 7px', borderRadius: '4px',
                        border: `1px solid ${nextActType === t.value ? ACT_COLORS[t.value] : border}`,
                        backgroundColor: nextActType === t.value ? `${ACT_COLORS[t.value]}18` : 'transparent',
                        color: nextActType === t.value ? ACT_COLORS[t.value] : muted,
                        cursor: 'pointer',
                      }}>{t.label}</button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={nextActLabel}
                    onChange={(e) => setNextActLabel(e.target.value)}
                    placeholder="Descrição..."
                    style={{
                      height: '30px', padding: '0 8px', fontSize: '12px', fontWeight: 500,
                      backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '5px',
                      color: text, outline: 'none',
                    }}
                  />
                  <input
                    type="date"
                    value={nextActDate}
                    onChange={(e) => setNextActDate(e.target.value)}
                    style={{
                      height: '30px', padding: '0 8px', fontSize: '12px', fontWeight: 500,
                      backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '5px',
                      color: text, outline: 'none', colorScheme: isDark ? 'dark' : 'light',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setEditingNextAct(false)} style={{ fontSize: '11px', fontWeight: 600, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>Cancelar</button>
                    <button
                      type="button"
                      disabled={savingNextAct || !nextActLabel.trim() || !nextActDate}
                      onClick={async () => {
                        if (!nextActLabel.trim() || !nextActDate) return
                        setSavingNextAct(true)
                        try {
                          await setNextActivity(deal.id, { type: nextActType, label: nextActLabel.trim(), due_date: nextActDate })
                          setEditingNextAct(false)
                        } finally { setSavingNextAct(false) }
                      }}
                      style={{
                        fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '5px',
                        backgroundColor: nextActLabel.trim() && nextActDate ? (isDark ? '#f0ede5' : '#1a1814') : (isDark ? '#2a2a28' : '#e4e0da'),
                        color: nextActLabel.trim() && nextActDate ? (isDark ? '#0f0e0c' : '#f0ede5') : muted,
                        border: 'none', cursor: nextActLabel.trim() && nextActDate ? 'pointer' : 'not-allowed',
                      }}
                    >{savingNextAct ? 'Salvando...' : 'Salvar'}</button>
                  </div>
                </div>
              ) : deal.next_activity ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Zap style={{ width: '13px', height: '13px', color: muted, flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: text }}>{deal.next_activity.label}</p>
                    <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>{formatDate(deal.next_activity.due_date)}</p>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Nenhuma atividade agendada</p>
              )}
            </div>
          </div>

          {/* ── Contatos card ── */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p className="section-header">Contatos ({deal.stakeholders?.length ?? 0})</p>
              <button type="button" onClick={() => { setShowAddStakeholder((v) => !v); if (!showAddStakeholder) loadProfiles() }}
                style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 600, color: showAddStakeholder ? muted : 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                {showAddStakeholder ? <><X style={{ width: '10px', height: '10px' }} />Fechar</> : <><Plus style={{ width: '10px', height: '10px' }} />Adicionar</>}
              </button>
            </div>
            {showAddStakeholder && (
              <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                {loadingProfiles ? (
                  <p style={{ fontSize: '11px', color: muted, textAlign: 'center', padding: '4px 0' }}>Carregando...</p>
                ) : profiles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4px 0' }}>
                    <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic', marginBottom: '6px' }}>Nenhum perfil encontrado</p>
                    <button type="button" onClick={() => loadProfiles(true)} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>Tentar novamente</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                    {profiles
                      .map((p) => ({ ...p, displayName: p.full_name || p.email.split('@')[0] }))
                      .filter((p) => !(deal.stakeholders ?? []).some((s) => s.name === p.displayName))
                      .map((p) => (
                        <button key={p.id} type="button" onClick={() => addStakeholder(p)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 6px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-overlay)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          <UserAvatarRow name={p.displayName} initials={getInitials(p.displayName)} color={p.avatar_color || getAvatarColor(p.id)} size="xs" textColor={text} />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
            {(deal.stakeholders ?? []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {deal.stakeholders!.map((s, i) => (
                  <div key={`${s.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: 'var(--radius-full)', backgroundColor: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '7px', fontWeight: 700, flexShrink: 0 }}>{s.initials}</div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: text, flex: 1 }}>{s.name}</span>
                    <button type="button" title="Remover" onClick={() => removeStakeholder(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px', borderRadius: '3px', lineHeight: 1, flexShrink: 0 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#c53030')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = muted)}>
                      <X style={{ width: '11px', height: '11px' }} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic' }}>Nenhum contato mapeado</p>
            )}
          </div>

          {/* ── Saúde card ── */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <Zap style={{ width: '13px', height: '13px', color: 'var(--brand)' }} />
              <p className="section-header">Aurea AI · Saúde</p>
            </div>
            <HealthBar score={score} isDark={isDark} />
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'Probabilidade', value: `${deal.probability}%`, ok: deal.probability >= 50 },
                { label: 'Última atividade', value: deal.last_activity_at ? relativeDate(deal.last_activity_at) : '—', ok: deal.last_activity_at ? (Date.now() - new Date(deal.last_activity_at).getTime()) / 86_400_000 <= 14 : false },
                { label: 'Contatos', value: `${deal.stakeholders?.length ?? 0} mapeados`, ok: (deal.stakeholders?.length ?? 0) >= 2 },
                { label: 'Tempo na etapa', value: `${deal.days_in_stage}d`, ok: deal.days_in_stage <= 60 },
              ].map(({ label, value: v, ok }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: muted }}>{label}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: ok ? '#2d9e6b' : isDark ? '#fc8181' : '#c53030' }}>{v}</span>
                </div>
              ))}
            </div>
            {(deal.days_in_stage > 60 || !deal.next_activity) && (
              <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: isDark ? '#2d151522' : '#fff5f5', border: `1px solid ${isDark ? '#4a1f1f' : '#fecaca'}`, borderRadius: 'var(--radius-md)' }}>
                {deal.days_in_stage > 90 && <p style={{ fontSize: '11px', color: isDark ? '#fc8181' : '#c53030' }}>⚠ Estagnado há {deal.days_in_stage} dias</p>}
                {deal.days_in_stage > 60 && deal.days_in_stage <= 90 && <p style={{ fontSize: '11px', color: '#b45309' }}>⚠ {deal.days_in_stage} dias nesta etapa</p>}
                {!deal.next_activity && <p style={{ fontSize: '11px', color: isDark ? '#fc8181' : '#c53030' }}>⚠ Sem próxima atividade</p>}
              </div>
            )}
          </div>

          {/* ── Related deals & stakeholder map ── */}
          <StakeholderMap dealId={deal.id} isDark={isDark} />
          <RelatedDeals dealId={deal.id} isDark={isDark} />

        </aside>

        {/* ── Right panel: flex ── */}
        <div style={{ flex: 1, minWidth: 0, backgroundColor: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ padding: '0 20px', borderBottom: '1px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '2px', height: '48px' }}>
            {([
              { id: 'overview',  label: 'Visão geral' },
              { id: 'activity',  label: 'Histórico' },
              { id: 'notes',     label: 'Notas' },
              { id: 'proposal',  label: 'Propostas' },
              { id: 'tasks',     label: 'Tarefas' },
            ] as const).map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                style={{
                  height: '100%', padding: '0 14px', fontSize: '13px', fontWeight: activeTab === tab.id ? 600 : 500,
                  color: activeTab === tab.id ? text : muted,
                  backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? `2px solid ${text}` : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                  marginBottom: '-1px', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = text }}
                onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = muted }}>
                {tab.label}
              </button>
            ))}
            {activeTab === 'activity' && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => { setShowQuickTask((v) => !v); setShowAddActivity(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '11px', fontWeight: 600,
                    color: showQuickTask ? muted : '#2c5545',
                    backgroundColor: showQuickTask ? 'transparent' : (isDark ? '#1a2e22' : '#e6f2ee'),
                    border: `1px solid ${showQuickTask ? border : '#2c554530'}`, borderRadius: '6px',
                    padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  {showQuickTask ? <><X style={{ width: '10px', height: '10px' }} />Cancelar</> : <><Plus style={{ width: '10px', height: '10px' }} />Tarefa</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddActivity((v) => !v); setShowQuickTask(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '11px', fontWeight: 600,
                    color: showAddActivity ? muted : (isDark ? '#e8e4dc' : '#1a1814'),
                    backgroundColor: showAddActivity ? 'transparent' : (isDark ? '#1e1e1c' : '#f0eeea'),
                    border: `1px solid ${border}`, borderRadius: '6px',
                    padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  {showAddActivity ? <><X style={{ width: '10px', height: '10px' }} />Cancelar</> : <><Plus style={{ width: '10px', height: '10px' }} />Registrar</>}
                </button>
              </div>
            )}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* ── Visão geral tab ── */}
            {activeTab === 'overview' && (
              <div style={{ padding: '20px 24px' }}>
                {/* KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                  <div className="card" style={{ padding: '16px 18px' }}>
                    <p className="section-header" style={{ marginBottom: '6px' }}>Valor</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: '#2d9e6b', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{formatCurrency(deal.value)}</p>
                  </div>
                  <div className="card" style={{ padding: '16px 18px' }}>
                    <p className="section-header" style={{ marginBottom: '6px' }}>Previsão</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>{deal.expected_close ? formatDate(deal.expected_close) : '—'}</p>
                  </div>
                </div>

                {/* Contato links */}
                {(deal.contact_email || deal.contact_phone || deal.contact_linkedin || deal.company_website) && (
                  <div style={{ marginBottom: '24px' }}>
                    <p className="section-header" style={{ marginBottom: '12px' }}>Contacto</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deal.contact_email && <LinkField label="Email" icon={Mail} href={`mailto:${deal.contact_email}`} muted={muted}>{deal.contact_email}</LinkField>}
                      {deal.contact_phone && <LinkField label="Telefone" icon={Phone} href={`tel:${deal.contact_phone}`} muted={muted}>{deal.contact_phone}</LinkField>}
                      {deal.contact_linkedin && <LinkField label="LinkedIn" icon={Linkedin} href={deal.contact_linkedin} external muted={muted}>Ver perfil ↗</LinkField>}
                      {deal.company_website && <LinkField label="Site" icon={Globe} href={deal.company_website} external muted={muted}>{deal.company_website.replace(/^https?:\/\//, '')} ↗</LinkField>}
                    </div>
                  </div>
                )}

                {/* Recent activity feed */}
                <p className="section-header" style={{ marginBottom: '12px' }}>Atividade Recente</p>
                {(() => {
                  const timeline = buildTimeline(activities, meetings).slice(0, 5)
                  if (timeline.length === 0) return <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Nenhuma atividade ainda</p>
                  return (
                    <div>
                      {timeline.map((entry) => (
                        <div key={entry.kind === 'activity' ? entry.activity.id : entry.meeting.id}>
                          {entry.kind === 'activity'
                            ? <ActivityEntry activity={entry.activity} meeting={entry.meeting} isDark={isDark} />
                            : <StandaloneMeetingEntry meeting={entry.meeting} isDark={isDark} />
                          }
                        </div>
                      ))}
                      {buildTimeline(activities, meetings).length > 5 && (
                        <button type="button" onClick={() => setActiveTab('activity')} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                          Ver toda atividade →
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* Audit log */}
                <div style={{ marginTop: '24px' }}>
                  <button type="button" onClick={() => { setShowHistory((v) => !v); if (!showHistory && dealEvents.length === 0) loadEvents() }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px 0', width: '100%', textAlign: 'left' }}>
                    <p className="section-header">Histórico de alterações</p>
                    <ChevronDown style={{ width: '11px', height: '11px', color: muted, transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', marginLeft: 'auto' }} />
                  </button>
                  {showHistory && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {loadingEvents ? (
                        <p style={{ fontSize: '11px', color: muted }}>Carregando...</p>
                      ) : dealEvents.length === 0 ? (
                        <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic' }}>Nenhuma alteração registrada</p>
                      ) : dealEvents.map((ev) => {
                        const fieldLabel = ev.field_name ? (FIELD_LABELS[ev.field_name] ?? ev.field_name) : 'Campo'
                        const isStage = ev.event_type === 'stage_change'
                        function fmtVal(v: unknown, field?: string): string {
                          if (v == null) return '—'
                          if (field === 'stage_id') return STAGES.find((s) => s.id === String(v))?.label ?? String(v)
                          if (field === 'value') return formatCurrency(Number(v))
                          if (field === 'probability') return `${v}%`
                          if (field === 'expected_close') return formatDate(String(v))
                          if (field === 'company_size') return SIZE_LABELS[String(v)] ?? String(v)
                          if (field === 'company_arr_range') return ARR_LABELS[String(v)] ?? String(v)
                          if (field === 'stakeholders' || field === 'next_activity') {
                            if (Array.isArray(v)) return `${v.length} item${v.length !== 1 ? 's' : ''}`
                            if (typeof v === 'object') return 'actualizado'
                            return String(v)
                          }
                          return String(v)
                        }
                        const oldStr = fmtVal(ev.old_value, ev.field_name)
                        const newStr = fmtVal(ev.new_value, ev.field_name)
                        return (
                          <div key={ev.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '8px 10px', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: isStage ? 'var(--brand)' : muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isStage ? '↗ Etapa' : fieldLabel}</span>
                              <span style={{ fontSize: '9px', color: muted }}>{relativeDate(ev.created_at.slice(0, 10))}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: text, flexWrap: 'wrap' }}>
                              <span style={{ color: isDark ? '#fc8181' : '#c53030', textDecoration: 'line-through' }}>{oldStr}</span>
                              <span style={{ color: muted }}>→</span>
                              <span style={{ color: '#2d9e6b', fontWeight: 600 }}>{newStr}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Atividade tab ── */}
            {activeTab === 'activity' && (
              <div style={{ padding: '20px 24px' }}>
                {showQuickTask && (
                  <div style={{
                    marginBottom: '16px', padding: '12px', borderRadius: '8px',
                    border: `1px solid ${border}`, backgroundColor: isDark ? '#111110' : '#fafaf8',
                  }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nova Tarefa</p>
                    <input
                      autoFocus
                      type="text"
                      value={quickTaskTitle}
                      onChange={(e) => setQuickTaskTitle(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && quickTaskTitle.trim()) {
                          setSavingQuickTask(true)
                          await createTask({ title: quickTaskTitle.trim(), deal_id: deal.id, due_date: quickTaskDate || undefined, priority: 'medium', task_type: 'other' })
                          setSavingQuickTask(false)
                          setQuickTaskTitle(''); setQuickTaskDate(''); setShowQuickTask(false)
                        }
                        if (e.key === 'Escape') setShowQuickTask(false)
                      }}
                      placeholder="O que precisa ser feito?"
                      style={{ width: '100%', height: '32px', padding: '0 10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {[
                        { label: 'Hoje',    value: new Date().toISOString().slice(0, 10) },
                        { label: 'Amanhã',  value: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })() },
                        { label: 'Próx. semana', value: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })() },
                      ].map(({ label, value }) => (
                        <button key={value} type="button"
                          onClick={() => setQuickTaskDate(quickTaskDate === value ? '' : value)}
                          style={{ height: '24px', padding: '0 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 500, cursor: 'pointer', backgroundColor: quickTaskDate === value ? '#2c5545' : 'transparent', color: quickTaskDate === value ? '#fff' : muted, border: `1px solid ${quickTaskDate === value ? '#2c5545' : border}` }}
                        >{label}</button>
                      ))}
                      <button type="button"
                        disabled={!quickTaskTitle.trim() || savingQuickTask}
                        onClick={async () => {
                          if (!quickTaskTitle.trim()) return
                          setSavingQuickTask(true)
                          await createTask({ title: quickTaskTitle.trim(), deal_id: deal.id, due_date: quickTaskDate || undefined, priority: 'medium', task_type: 'other' })
                          setSavingQuickTask(false)
                          setQuickTaskTitle(''); setQuickTaskDate(''); setShowQuickTask(false)
                        }}
                        style={{ height: '24px', padding: '0 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#2c5545', color: '#fff', border: 'none', marginLeft: 'auto', opacity: quickTaskTitle.trim() ? 1 : 0.5 }}
                      >{savingQuickTask ? '...' : 'Criar tarefa'}</button>
                    </div>
                  </div>
                )}
                {showAddActivity && (
                  <AddActivityForm dealId={deal.id} owner={owner} onClose={() => setShowAddActivity(false)} isDark={isDark} />
                )}
                {(() => {
                  const timeline = buildTimeline(activities, meetings)
                  if (timeline.length === 0 && !showAddActivity) return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '120px', textAlign: 'center', gap: '8px' }}>
                      <Zap style={{ width: '24px', height: '24px', color: border }} />
                      <p style={{ fontSize: '13px', fontWeight: 600, color: muted }}>Nenhuma atividade registrada</p>
                      <p style={{ fontSize: '12px', color: isDark ? '#3a3834' : '#c4bfb8', maxWidth: '220px', lineHeight: 1.6 }}>Clique em "Registrar" para adicionar ligações, emails e reuniões</p>
                    </div>
                  )
                  let lastGroup = ''
                  return (
                    <div>
                      {timeline.map((entry, i) => {
                        const group = getGroupLabel(entry.date)
                        const showGroup = group !== lastGroup
                        lastGroup = group
                        return (
                          <div key={entry.kind === 'activity' ? entry.activity.id : entry.meeting.id}>
                            {showGroup && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', marginTop: i > 0 ? '4px' : 0 }}>
                                <span style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{group}</span>
                                <div style={{ flex: 1, height: '1px', backgroundColor: border }} />
                              </div>
                            )}
                            {entry.kind === 'activity'
                              ? <ActivityEntry activity={entry.activity} meeting={entry.meeting} isDark={isDark} />
                              : <StandaloneMeetingEntry meeting={entry.meeting} isDark={isDark} />
                            }
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ── Notas tab ── */}
            {activeTab === 'notes' && (
              <NotesSection dealId={deal.id} owner={owner} isDark={isDark} border={border} text={text} muted={muted} />
            )}

            {/* ── Propostas tab ── */}
            {activeTab === 'proposal' && (
              <ProposalTab deal={deal} isDark={isDark} border={border} text={text} muted={muted} inputBg={inputBg} />
            )}

            {/* ── Tarefas tab ── */}
            {activeTab === 'tasks' && (
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p className="section-header">Tarefas ({dealTasks.length})</p>
                  <button type="button" onClick={() => { setShowQuickTask(true); setShowAddActivity(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: 'var(--brand)', backgroundColor: 'var(--brand)14', border: '1px solid var(--brand)30', borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer' }}>
                    <Plus style={{ width: '10px', height: '10px' }} />Nova Tarefa
                  </button>
                </div>
                {showQuickTask && (
                  <div style={{ marginBottom: '16px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', backgroundColor: 'var(--surface-raised)' }}>
                    <input autoFocus type="text" value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && quickTaskTitle.trim()) {
                          setSavingQuickTask(true)
                          await createTask({ title: quickTaskTitle.trim(), deal_id: deal.id, due_date: quickTaskDate || undefined, priority: 'medium', task_type: 'other' })
                          setSavingQuickTask(false)
                          setQuickTaskTitle(''); setQuickTaskDate(''); setShowQuickTask(false)
                        }
                        if (e.key === 'Escape') setShowQuickTask(false)
                      }}
                      placeholder="O que precisa ser feito?"
                      style={{ width: '100%', height: '32px', padding: '0 10px', fontSize: '12px', backgroundColor: inputBg, border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', color: text, outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {[
                        { label: 'Hoje', value: new Date().toISOString().slice(0, 10) },
                        { label: 'Amanhã', value: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })() },
                        { label: 'Próx. semana', value: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })() },
                      ].map(({ label, value }) => (
                        <button key={value} type="button" onClick={() => setQuickTaskDate(quickTaskDate === value ? '' : value)}
                          style={{ height: '24px', padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: '10px', fontWeight: 500, cursor: 'pointer', backgroundColor: quickTaskDate === value ? 'var(--brand)' : 'transparent', color: quickTaskDate === value ? '#fff' : muted, border: `1px solid ${quickTaskDate === value ? 'var(--brand)' : 'var(--line)'}` }}>
                          {label}
                        </button>
                      ))}
                      <button type="button" disabled={!quickTaskTitle.trim() || savingQuickTask}
                        onClick={async () => {
                          if (!quickTaskTitle.trim()) return
                          setSavingQuickTask(true)
                          await createTask({ title: quickTaskTitle.trim(), deal_id: deal.id, due_date: quickTaskDate || undefined, priority: 'medium', task_type: 'other' })
                          setSavingQuickTask(false)
                          setQuickTaskTitle(''); setQuickTaskDate(''); setShowQuickTask(false)
                        }}
                        style={{ height: '24px', padding: '0 10px', borderRadius: 'var(--radius-sm)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', backgroundColor: 'var(--brand)', color: '#fff', border: 'none', marginLeft: 'auto', opacity: quickTaskTitle.trim() ? 1 : 0.5 }}>
                        {savingQuickTask ? '...' : 'Criar'}
                      </button>
                    </div>
                  </div>
                )}
                {dealTasks.length === 0 ? (
                  <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Nenhuma tarefa associada a este lead</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dealTasks.map((task) => (
                      <div key={task.id} className="card-sm" style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: task.completed_at ? '#2d9e6b' : (task.due_date && task.due_date < new Date().toISOString().slice(0, 10) ? '#c53030' : 'var(--ink-muted)'), flexShrink: 0, marginTop: '5px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: task.completed_at ? muted : text, textDecoration: task.completed_at ? 'line-through' : 'none' }}>{task.title}</p>
                          {task.due_date && <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{formatDate(task.due_date)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
