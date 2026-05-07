import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft, Mail, Phone, Linkedin, Globe,
  Zap, Video, CheckSquare, FileText,
  Mic, ChevronDown, Plus, X, Pencil,
} from 'lucide-react'
import { useDealStore } from '@/store/useDealStore'
import { useProposalStore } from '@/store/useProposalStore'
import type { Proposal } from '@/services/proposal.service'
import { useThemeStore } from '@/store/useThemeStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useTaskStore } from '@/store/useTaskStore'
import { STAGES } from '@/constants/pipeline'
import { supabase } from '@/lib/supabase'
import { fetchDealEvents } from '@/services/deal-events.service'
import { useTeamStore } from '@/store/useTeamStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { Deal, DealActivity, DealMeeting, CompanySize, ArrRange, DealEvent } from '@/types/deal.types'
import { PageLoadingState } from '@/components/ui/PageState'
import { evaluateDealScore } from '@/lib/dealScore'
import { usePaymentStore } from '@/store/usePaymentStore'
import { useToastStore } from '@/store/useToastStore'

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
  call: '#4a90d9', email: '#78909c', meeting: '#b83535', task: '#2c5545', note: '#a88030',
}
const ACT_ICONS: Record<string, LucideIcon> = {
  call: Phone, email: Mail, meeting: Video, task: CheckSquare, note: FileText,
}
const ACT_LABELS: Record<string, string> = {
  call: 'Ligação', email: 'Email', meeting: 'Reunião', task: 'Tarefa', note: 'Nota',
}


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

// ─── Timeline helpers ─────────────────────────────────────────────────────────

type MeetingRecord = { id: string; meeting_date: string; completed_items: string[]; score: number; notes: string | null }

type TimelineEntry =
  | { kind: 'activity'; date: string; activity: DealActivity; meeting?: DealMeeting }
  | { kind: 'meeting';  date: string; meeting: DealMeeting }
  | { kind: 'record';   date: string; record: MeetingRecord }

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

function buildTimeline(activities: DealActivity[], meetings: DealMeeting[], records: MeetingRecord[] = []): TimelineEntry[] {
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

  const recordEntries: TimelineEntry[] = records.map((r) => ({
    kind: 'record',
    date: r.meeting_date.slice(0, 10),
    record: r,
  }))

  return [...actEntries, ...meetingEntries, ...recordEntries].sort((a, b) => b.date.localeCompare(a.date))
}

// ─── Standalone meeting entry ─────────────────────────────────────────────────

function StandaloneMeetingEntry({ meeting, isDark }: { meeting: DealMeeting; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const color  = '#b83535'
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

// ─── Meeting record entry ─────────────────────────────────────────────────────

const CHECKLIST_LABELS_TL: Record<string, string> = {
  apresentacao: 'Apresentação', dor: 'Identificou dor', decisor: 'Falou c/ decisor',
  orcamento: 'Validou orçamento', timeline: 'Timeline definida',
  concorrentes: 'Concorrentes', proximo_passo: 'Próximo passo',
}

function MeetingRecordEntry({ record, isDark }: { record: MeetingRecord; isDark: boolean }) {
  const scoreColor = record.score >= 7 ? '#2c5545' : record.score >= 4 ? '#a88030' : '#b83535'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const cardBg = isDark ? '#1a1a18' : '#f8f7f4'
  const border = isDark ? '#242422' : '#e4e0da'
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: `${scoreColor}14`, border: `1px solid ${scoreColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckSquare style={{ width: '12px', height: '12px', color: scoreColor }} />
        </div>
        <div style={{ width: '1px', flex: 1, backgroundColor: border, marginTop: '4px' }} />
      </div>
      <div style={{ flex: 1, paddingBottom: '16px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: scoreColor, backgroundColor: `${scoreColor}14`, borderRadius: '3px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Reunião
            </span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: scoreColor, backgroundColor: `${scoreColor}14`, borderRadius: '3px', padding: '1px 5px' }}>
              {record.score.toFixed(1)} / 10
            </span>
          </div>
          <span style={{ fontSize: '10px', color: muted, flexShrink: 0, marginTop: '2px' }}>{relativeDate(record.meeting_date)}</span>
        </div>
        {record.completed_items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
            {record.completed_items.map((item) => (
              <span key={item} style={{ fontSize: '10px', fontWeight: 500, color: '#2c5545', backgroundColor: '#2c554515', borderRadius: '3px', padding: '2px 6px' }}>
                ✓ {CHECKLIST_LABELS_TL[item] ?? item}
              </span>
            ))}
          </div>
        )}
        {record.notes && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '6px', padding: '10px', marginTop: '8px' }}>
            <p style={{ fontSize: '12px', color: text, lineHeight: 1.6 }}>{record.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Activity entry ───────────────────────────────────────────────────────────

function ActivityEntry({ activity, meeting, isDark }: {
  activity: DealActivity; meeting?: DealMeeting; isDark: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const accent = isDark ? '#e05050' : '#b83535'
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
                  fontSize: '9px', fontWeight: 700, color: accent,
                  backgroundColor: 'rgba(184,53,53,0.10)', borderRadius: '3px',
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
                fontSize: '11px', fontWeight: 600, color: accent,
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
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#6b1212', flexShrink: 0, marginTop: '6px' }} />
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

// ─── Add Activity Form ────────────────────────────────────────────────────────

function AddActivityForm({ dealId, owner, onClose, isDark }: {
  dealId: string; owner: Deal['owner']; onClose: () => void; isDark: boolean
}) {
  const addActivity = useActivityStore((s) => s.addActivity)
  const accent = isDark ? '#e05050' : '#b83535'
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
            border: `1px solid ${type === t.value ? accent : border}`,
            backgroundColor: type === t.value ? 'rgba(184,53,53,0.10)' : 'transparent',
            color: type === t.value ? accent : isDark ? '#6b6560' : '#8a857d',
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
          fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '4px',
          backgroundColor: subject.trim() ? '#6b1212' : (isDark ? '#2a2a28' : '#e4e0da'),
          color: subject.trim() ? '#fff' : (isDark ? '#4a4a48' : '#a09890'),
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
    } catch { /* note preserved on error */ } finally { setSaving(false) }
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
          borderRadius: '8px', border: `1px solid ${border}`,
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
            backgroundColor: note.trim() ? '#6b1212' : (isDark ? '#2a2a28' : '#e4e0da'),
            color: note.trim() ? '#fff' : muted,
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

interface ProposalLine {
  id: string
  description: string
  qty: number
  unit_price: number
}

interface SavedProposal {
  id: string
  createdAt: string
  title: string
  intro: string
  validity: string
  payment: string
  terms: string
  scope: string
  lines: ProposalLine[]
  discountPct: number
  installments: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
}

function buildPaymentTemplate(installments: number, total: number, fmtFn: (v: number) => string): string {
  const f = fmtFn
  if (installments === 1) {
    return (
      `Pagamento à vista: ${f(total)} no ato da assinatura do contrato de veiculação.\n\n` +
      `Formas de pagamento aceitas: PIX, transferência bancária (TED/DOC) ou boleto bancário com vencimento em 3 dias úteis.\n\n` +
      `A nota fiscal será emitida em até 2 dias úteis após a confirmação do pagamento. ` +
      `Pagamentos à vista contam com desconto especial já aplicado nesta proposta.`
    )
  }
  if (installments === 2) {
    return (
      `Pagamento em 2 etapas:\n` +
      `• 1ª parcela — ${f(total * 0.5)} (50%) na assinatura do contrato\n` +
      `• 2ª parcela — ${f(total * 0.5)} (50%) na data de publicação do primeiro conteúdo\n\n` +
      `Formas de pagamento aceitas: PIX, transferência bancária (TED/DOC) ou boleto bancário.\n\n` +
      `Nota fiscal emitida em cada etapa, em até 2 dias úteis após confirmação do pagamento.`
    )
  }
  if (installments === 3) {
    return (
      `Pagamento em 3 etapas:\n` +
      `• 1ª parcela — ${f(total * 0.4)} (40%) na assinatura do contrato\n` +
      `• 2ª parcela — ${f(total * 0.3)} (30%) no início da produção dos conteúdos\n` +
      `• 3ª parcela — ${f(total * 0.3)} (30%) na data de publicação final\n\n` +
      `Formas de pagamento aceitas: PIX, transferência bancária (TED/DOC) ou boleto bancário.\n\n` +
      `Nota fiscal emitida em cada etapa, em até 2 dias úteis após confirmação do pagamento.`
    )
  }
  if (installments === 4) {
    return (
      `Pagamento em 4 parcelas:\n` +
      `• 1ª parcela — ${f(total * 0.4)} (40%) na assinatura do contrato\n` +
      `• 2ª, 3ª e 4ª parcelas — ${f((total * 0.6) / 3)} cada, nas datas de publicação mensais\n\n` +
      `Formas de pagamento aceitas: PIX, transferência bancária (TED/DOC) ou boleto bancário.\n\n` +
      `Nota fiscal emitida em cada etapa, em até 2 dias úteis antes do vencimento.`
    )
  }
  const inst = f(total / installments)
  return (
    `Pagamento parcelado em ${installments}x de ${inst}:\n\n` +
    `• Entrada de 40% (${f(total * 0.4)}) na assinatura do contrato\n` +
    `• ${installments - 1} parcelas mensais de ${f((total * 0.6) / (installments - 1))} nas datas acordadas\n\n` +
    `Formas de pagamento aceitas: PIX, transferência bancária (TED/DOC) ou boleto bancário.\n\n` +
    `Nota fiscal emitida mensalmente, em até 2 dias úteis antes do vencimento de cada parcela.\n` +
    `Em caso de atraso: multa de 2% + juros de 1% a.m. + correção pelo IPCA.`
  )
}

const TERMS_TEMPLATE =
  `1. VIGÊNCIA\n` +
  `Este contrato entra em vigor na data de assinatura e permanece válido durante todo o período de veiculação acordado.\n\n` +
  `2. APROVAÇÃO DE CONTEÚDO\n` +
  `Todo material produzido será submetido à aprovação prévia do cliente. O prazo para retorno é de 2 dias úteis. ` +
  `A ausência de manifestação nesse prazo será considerada aprovação tácita. ` +
  `Esta proposta inclui até 2 rodadas de revisão; ajustes adicionais estão sujeitos a orçamento complementar.\n\n` +
  `3. PROPRIEDADE INTELECTUAL\n` +
  `Os conteúdos produzidos são de propriedade da Esquire Brasil, sendo concedida ao cliente licença de uso pelo período contratado. ` +
  `A republicação em outros veículos ou canais deve ser negociada previamente e por escrito.\n\n` +
  `4. LINHA EDITORIAL E DIREITO DE RECUSA\n` +
  `A Esquire Brasil reserva-se o direito de recusar ou adaptar conteúdos que conflitem com sua linha editorial, ` +
  `seus valores institucionais ou as normas do CONAR (Conselho Nacional de Autorregulamentação Publicitária).\n\n` +
  `5. CANCELAMENTO\n` +
  `O cancelamento após o início da produção implica cobrança de 50% do valor total contratado, a título de ressarcimento pelos custos incorridos. ` +
  `O cancelamento antes do início da produção está sujeito à devolução de 80% do valor já pago.\n\n` +
  `6. CONFIDENCIALIDADE\n` +
  `As partes comprometem-se a manter sigilo sobre os termos comerciais desta proposta durante a vigência e por 2 anos após o encerramento.\n\n` +
  `7. LGPD\n` +
  `O tratamento de dados pessoais eventualmente envolvido nesta parceria observará integralmente a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).\n\n` +
  `8. FORO\n` +
  `Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias decorrentes deste contrato.`

const SCOPE_TEMPLATE =
  `• Produção de [X] conteúdos editoriais patrocinados integrados à linha editorial da Esquire Brasil\n` +
  `• Publicação no portal esquirebrasil.com.br com [X] dias de destaque na homepage e na editoria [nome da editoria]\n` +
  `• Distribuição nas redes sociais oficiais da Esquire Brasil: [X] posts no Instagram + [X] stories + [X] publicação no LinkedIn\n` +
  `• Inclusão em [X] edição(ões) da newsletter semanal da Esquire Brasil\n` +
  `• Relatório de performance ao encerramento: impressões, cliques, CTR, alcance e tempo médio de leitura\n` +
  `• Prazo de produção: 15 dias úteis após aprovação do briefing e recebimento dos materiais do cliente\n` +
  `• Inclui: 2 rodadas de revisão editorial e alinhamento de pauta com a equipe Esquire\n` +
  `• Não inclui: produção fotográfica de terceiros, compra de mídia paga adicional, direitos de imagem externos`

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function TemplatePicker({ isDark, border, text, muted, onPick }: {
  isDark: boolean; border: string; text: string; muted: string;
  onPick: (key: 'scope' | 'payment' | 'terms') => void
}) {
  const accent = isDark ? '#e05050' : '#b83535'
  const templates = [
    { key: 'scope'   as const, label: 'Escopo',    desc: 'Conteúdo editorial, entregas, prazos, revisões' },
    { key: 'payment' as const, label: 'Pagamento', desc: 'Condições geradas pelo número de parcelas selecionado' },
    { key: 'terms'   as const, label: 'Termos',    desc: '8 cláusulas padrão CONAR/LGPD/PI prontas para uso' },
  ]
  const [activeIdx, setActiveIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % 3), 3000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{
      backgroundColor: isDark ? '#0f0e0d' : '#fafaf9',
      border: `1px solid ${border}`,
      borderLeft: '3px solid #b83535',
      borderRadius: '10px', padding: '14px 18px',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
        Modelos prontos — clique para preencher
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        {templates.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setActiveIdx(i); onPick(t.key) }}
            style={{
              flex: 1, textAlign: 'left', cursor: 'pointer',
              backgroundColor: i === activeIdx ? (isDark ? 'rgba(107,18,18,0.15)' : 'rgba(107,18,18,0.07)') : (isDark ? '#161614' : '#f5f4f1'),
              border: `1px solid ${i === activeIdx ? '#b83535' : (isDark ? '#1e1e1c' : '#e4e1db')}`,
              borderRadius: '8px', padding: '10px 14px',
              transition: 'all 0.3s ease',
              outline: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: i === activeIdx ? '#b83535' : (isDark ? '#2a2a28' : '#d1ccc6'),
                transition: 'background-color 0.3s ease',
                boxShadow: i === activeIdx ? '0 0 0 2px rgba(184,53,53,0.25)' : 'none',
                display: 'inline-block',
              }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: i === activeIdx ? '#b83535' : text, transition: 'color 0.3s ease' }}>
                {t.label}
              </span>
            </div>
            <p style={{ fontSize: '10px', color: muted, lineHeight: 1.4, margin: 0 }}>{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// 'declined-latest' = contrato pausado, esta é a proposta mais recente (será usada no reactivar)
// 'declined-old'    = contrato pausado, proposta antiga
// 'paid'            = contrato concluído (todas as parcelas pagas → renovação)
type ProposalRole = 'declined-latest' | 'declined-old' | 'paid' | null

function ProposalList({ history, role, isDark, border, text, muted, accent, onOpen, onDelete }: {
  history: SavedProposal[]
  role: ProposalRole         // papel do deal: null = normal, 'paid', 'declined-*' calculado por proposta
  isDark: boolean; border: string; text: string; muted: string; accent: string
  onOpen: (p: SavedProposal) => void
  onDelete: (id: string) => void
}) {
  const isDeclined = role === 'declined-latest' || role === 'declined-old'
  const isPaid     = role === 'paid'
  const latestTs   = isDeclined && history.length > 0
    ? Math.max(...history.map(p => new Date(p.createdAt).getTime()))
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {history.map((p, i) => {
        const sub = p.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
        const tot = sub - sub * (p.discountPct / 100)
        const ts       = new Date(p.createdAt).getTime()
        const isLatest = isDeclined && ts === latestTs
        const isOld    = isDeclined && !isLatest

        // cores por estado
        const cardBorder  = isPaid    ? 'rgba(44,85,69,0.35)'   : isLatest ? 'rgba(44,85,69,0.40)'   : isOld ? 'rgba(107,18,18,0.25)' : border
        const hoverBorder = isPaid    ? 'rgba(44,85,69,0.60)'   : isLatest ? 'rgba(44,85,69,0.65)'   : isOld ? 'rgba(107,18,18,0.45)' : (isDark ? '#3a3a38' : '#c4bfb8')
        const numColor    = isPaid    ? '#2c5545'                : isLatest ? '#2c5545'                : isOld ? '#6b1212'              : accent
        const numBg       = isPaid    ? 'rgba(44,85,69,0.10)'   : isLatest ? 'rgba(44,85,69,0.10)'   : isOld ? 'rgba(107,18,18,0.08)' : 'rgba(184,53,53,0.09)'
        const numBorder2  = isPaid    ? 'rgba(44,85,69,0.30)'   : isLatest ? 'rgba(44,85,69,0.30)'   : isOld ? 'rgba(107,18,18,0.22)' : 'rgba(184,53,53,0.22)'
        const valColor    = isPaid    ? '#2c5545'                : isLatest ? '#2c5545'                : isOld ? '#6b1212'              : (tot > 0 ? (isDark ? '#6ee7b7' : '#2a7a4a') : muted)

        return (
          <div key={p.id}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 18px', borderRadius: '10px', backgroundColor: isDark ? '#111110' : '#ffffff', border: `1px solid ${cardBorder}`, transition: 'border-color 0.12s ease', cursor: 'default' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = hoverBorder }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = cardBorder }}>

            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: numBg, border: `1px solid ${numBorder2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: numColor, fontFamily: "'Geist Mono', monospace" }}>#{history.length - i}</span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{p.title}</p>
                {isPaid && (
                  <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 700, color: '#2c5545', backgroundColor: 'rgba(44,85,69,0.10)', border: '1px solid rgba(44,85,69,0.30)', borderRadius: '999px', padding: '1px 7px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    ✓ Paga
                  </span>
                )}
                {isLatest && !isPaid && (
                  <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 700, color: '#2c5545', backgroundColor: 'rgba(44,85,69,0.10)', border: '1px solid rgba(44,85,69,0.30)', borderRadius: '999px', padding: '1px 7px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    ✓ Será usada
                  </span>
                )}
                {isOld && (
                  <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 700, color: '#6b1212', backgroundColor: 'rgba(107,18,18,0.08)', border: '1px solid rgba(107,18,18,0.22)', borderRadius: '999px', padding: '1px 7px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Declinada
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <p style={{ fontSize: '11px', color: muted }}>
                  {new Date(p.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                {p.lines.length > 0 && (
                  <span style={{ fontSize: '10px', color: muted }}>· {p.lines.length} item{p.lines.length !== 1 ? 's' : ''}</span>
                )}
                {p.validity && (
                  <span style={{ fontSize: '10px', color: muted }}>
                    · válida até {new Date(p.validity + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
            </div>

            <p style={{ fontSize: '16px', fontWeight: 700, color: valColor, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.02em', flexShrink: 0 }}>
              {tot > 0 ? formatCurrency(tot) : '—'}
            </p>

            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button type="button" onClick={() => onOpen(p)}
                style={{ fontSize: '11px', fontWeight: 600, color: accent, backgroundColor: 'rgba(184,53,53,0.08)', border: '1px solid rgba(184,53,53,0.22)', borderRadius: '6px', padding: '5px 14px', cursor: 'pointer' }}>
                Abrir
              </button>
              <button type="button" onClick={() => onDelete(p.id)}
                style={{ fontSize: '13px', fontWeight: 400, color: muted, backgroundColor: 'transparent', border: `1px solid ${border}`, borderRadius: '6px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProposalTab({ deal, isDark, border, text, muted, inputBg, initialProposalId }: {
  deal: Deal; isDark: boolean; border: string; text: string; muted: string; inputBg: string; initialProposalId?: string
}) {
  const navigate   = useNavigate()
  const accent     = isDark ? '#e05050' : '#b83535'
  const draftKey   = `esq_proposal_draft_v4_${deal.id}`

  // Propostas vêm do store (DB) — draft continua em localStorage (é efémero)
  const proposalStore  = useProposalStore()
  const dbProposals    = useProposalStore((s) => s.byDeal[deal.id]) ?? []

  // Converter DB Proposal → SavedProposal (UI usa camelCase herdado)
  function dbToSaved(p: Proposal): SavedProposal {
    return {
      id: p.id,
      createdAt: p.created_at,
      title: p.title,
      intro: p.intro,
      scope: p.scope,
      validity: p.validity,
      payment: p.payment,
      terms: p.terms,
      lines: p.lines as ProposalLine[],
      discountPct: p.discount_pct,
      installments: p.installments,
      status: p.status,
    }
  }

  const history = dbProposals.map(dbToSaved)

  function loadDraft<T>(key: string, fallback: T): T {
    try { const d = JSON.parse(localStorage.getItem(draftKey) ?? '{}'); return d[key] ?? fallback } catch { return fallback }
  }

  const [propTitle,    setPropTitle]    = useState(() => loadDraft('title', ''))
  const [intro,        setIntro]        = useState(() => loadDraft('intro', ''))
  const [scope,        setScope]        = useState(() => loadDraft('scope', ''))
  const [validity,     setValidity]     = useState(() => loadDraft('validity', ''))
  const [payment,      setPayment]      = useState(() => loadDraft('payment', ''))
  const [terms,        setTerms]        = useState(() => loadDraft('terms', ''))
  const [lines,        setLines]        = useState<ProposalLine[]>(() => loadDraft('lines', []))
  const [discountPct,  setDiscountPct]  = useState<number>(() => loadDraft('discountPct', 0))
  const [installments, setInstallments] = useState<number>(() => loadDraft('installments', 1))
  const [saved,        setSaved]        = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [preview,      setPreview]      = useState<SavedProposal | null>(null)
  const [showForm,     setShowForm]     = useState(false)

  // Carregar propostas do DB se ainda não estiverem no store
  useEffect(() => { proposalStore.loadForDeal(deal.id) }, [deal.id])

  // Calcular role directamente do store — independente de timing do pai
  const dealContracts  = usePaymentStore((s) => s.contracts)
  const dealRole = useMemo((): ProposalRole => {
    const priority = (s: string) => s === 'active' ? 0 : s === 'completed' ? 1 : 2
    const cs = dealContracts.filter(c => c.deal_id === deal.id)
    if (!cs.length) return null
    const primary = cs.reduce((best, c) =>
      priority(c.status) < priority(best.status)
      || (c.status === best.status && new Date(c.created_at) > new Date(best.created_at))
        ? c : best
    )
    if (primary.status === 'completed') return 'paid'
    if (primary.status === 'paused')    return 'declined-latest' // role final resolvido em ProposalList
    return null
  }, [dealContracts, deal.id])

  // Abrir proposta específica se vier do Arquivo Comercial
  useEffect(() => {
    if (!initialProposalId || !dbProposals.length) return
    const target = dbProposals.find((p) => p.id === initialProposalId)
    if (target) setPreview(dbToSaved(target))
  }, [initialProposalId, dbProposals])

  const subtotal   = lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
  const discount   = subtotal * (discountPct / 100)
  const total      = subtotal - discount
  function saveDraft() {
    localStorage.setItem(draftKey, JSON.stringify({ title: propTitle, intro, scope, validity, payment, terms, lines, discountPct, installments }))
  }
  function addLine() { setLines((prev) => [...prev, { id: `l-${Date.now()}`, description: '', qty: 1, unit_price: 0 }]) }
  function updateLine(id: string, patch: Partial<ProposalLine>) { setLines((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l)) }
  function removeLine(id: string) { setLines((prev) => prev.filter((l) => l.id !== id)) }

  async function handleSave() {
    if (deal.id.startsWith('opt-')) {
      useToastStore.getState().addToast('Este deal foi criado offline — recarrega a página antes de guardar propostas', 'error')
      return
    }
    setSaving(true)
    try {
      await proposalStore.saveProposal({
        deal_id: deal.id,
        title: propTitle.trim() || `Proposta Comercial — ${deal.company_name ?? deal.title}`,
        intro, scope, validity, payment, terms,
        lines: lines as Proposal['lines'],
        discount_pct: discountPct,
        installments,
        status: 'sent',
      })
      localStorage.removeItem(draftKey)
      setPropTitle(''); setIntro(''); setScope(''); setValidity(''); setPayment(''); setTerms('')
      setLines([]); setDiscountPct(0); setInstallments(1)
      setSaved(true); setShowForm(false)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // erro já mostrado pelo store via toast
    } finally {
      setSaving(false)
    }
  }
  async function deleteProposal(id: string) {
    await proposalStore.removeProposal(id, deal.id)
    if (preview?.id === id) setPreview(null)
  }

  const inp: React.CSSProperties = { backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '7px', color: text, outline: 'none', fontSize: '13px', fontFamily: 'inherit', padding: '0 12px', height: '36px', boxSizing: 'border-box', width: '100%' }
  const ta: React.CSSProperties  = { ...inp, height: 'auto', padding: '10px 12px', lineHeight: 1.65, resize: 'vertical' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: text, display: 'block', marginBottom: '6px' }
  const sec: React.CSSProperties = { backgroundColor: isDark ? '#111110' : '#ffffff', border: `1px solid ${border}`, borderRadius: '10px', padding: '20px 22px' }

  function ModelBtn({ onClick }: { onClick: () => void }) {
    return (
      <button type="button" onClick={onClick}
        style={{ fontSize: '10px', fontWeight: 600, color: accent, backgroundColor: 'rgba(184,53,53,0.08)', border: '1px solid rgba(184,53,53,0.22)', borderRadius: '5px', padding: '3px 9px', cursor: 'pointer', flexShrink: 0 }}>
        Usar modelo
      </button>
    )
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  if (preview) {
    const p   = preview
    const sub = p.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
    const disc = sub * (p.discountPct / 100)
    const tot = sub - disc
    const inst = p.installments > 1 ? tot / p.installments : null
    return (
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <button type="button" onClick={() => setPreview(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: muted, background: 'none', border: `1px solid ${border}`, borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
            ← Voltar
          </button>
          <span style={{ fontSize: '13px', fontWeight: 600, color: text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
          <button type="button" onClick={() => window.print()}
            style={{ fontSize: '11px', fontWeight: 700, padding: '6px 16px', borderRadius: '7px', border: 'none', backgroundColor: '#6b1212', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            Exportar PDF
          </button>
        </div>

        {/* Document */}
        <div id="proposal-print" style={{ backgroundColor: '#ffffff', border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', maxWidth: '780px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ backgroundColor: '#0c0c0a', padding: '32px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '3px', height: '34px', backgroundColor: '#6b1212', borderRadius: '2px' }} />
                  <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: '28px', color: '#fff', lineHeight: 1 }}>Esquire</p>
                </div>
                <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#555', marginLeft: '13px' }}>Brasil</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>Proposta Comercial</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{p.title}</p>
                <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                  {new Date(p.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #6b1212 0%, #c0392b 50%, #6b1212 100%)' }} />

          <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Recipient + meta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ padding: '18px 20px', borderRadius: '8px', backgroundColor: '#f8f7f4', border: '1px solid #e8e5e0' }}>
                <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '12px' }}>Destinatário</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#0c0c0a', letterSpacing: '-0.02em', marginBottom: '4px' }}>{deal.company_name ?? deal.title}</p>
                {deal.contact_name && <p style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>{deal.contact_name}{deal.contact_title ? `, ${deal.contact_title}` : ''}</p>}
                {deal.contact_email && <p style={{ fontSize: '11px', color: '#888' }}>{deal.contact_email}</p>}
                {deal.company_sector && <p style={{ fontSize: '10px', color: '#aaa', marginTop: '8px' }}>{deal.company_sector}{deal.company_size ? ` · ${deal.company_size} colaboradores` : ''}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
                {p.validity && (
                  <div>
                    <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', marginBottom: '3px' }}>Validade da proposta</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c0c0a' }}>
                      {new Date(p.validity + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', marginBottom: '3px' }}>Emitido em</p>
                  <p style={{ fontSize: '13px', color: '#555' }}>{new Date(p.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Intro / Apresentação */}
            {p.intro && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Apresentação <span style={{ flex: 1, height: '1px', backgroundColor: '#e8e5e0', display: 'inline-block' }} />
                </p>
                <p style={{ fontSize: '13px', color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{p.intro}</p>
              </div>
            )}

            {/* Scope */}
            {p.scope && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Escopo do Projeto <span style={{ flex: 1, height: '1px', backgroundColor: '#e8e5e0', display: 'inline-block' }} />
                </p>
                <p style={{ fontSize: '13px', color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{p.scope}</p>
              </div>
            )}

            {/* Services table */}
            {p.lines.length > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Itens e Valores <span style={{ flex: 1, height: '1px', backgroundColor: '#e8e5e0', display: 'inline-block' }} />
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f1ec' }}>
                      {['Descrição', 'Qtd', 'Valor Unit.', 'Total'].map((h, i) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: i === 0 ? 'left' : 'right', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', borderBottom: '2px solid #0c0c0a' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {p.lines.map((l, i) => (
                      <tr key={l.id} style={{ borderBottom: `1px solid ${i === p.lines.length - 1 ? '#0c0c0a' : '#eee'}` }}>
                        <td style={{ padding: '12px 14px', color: '#0c0c0a', fontWeight: 500 }}>{l.description || '—'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#888' }}>{l.qty}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#444' }}>{fmtBRL(l.unit_price)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0c0c0a' }}>{fmtBRL(l.qty * l.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #0c0c0a' }}>
                  {p.discountPct > 0 && (
                    <>
                      <div style={{ display: 'flex', gap: '24px' }}>
                        <p style={{ fontSize: '12px', color: '#888' }}>Subtotal</p>
                        <p style={{ fontSize: '12px', color: '#444' }}>{fmtBRL(sub)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '24px' }}>
                        <p style={{ fontSize: '12px', color: '#c0392b' }}>Desconto ({p.discountPct}%)</p>
                        <p style={{ fontSize: '12px', color: '#c0392b' }}>−{fmtBRL(disc)}</p>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline', marginTop: '6px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888' }}>Total</p>
                    <p style={{ fontSize: '30px', fontWeight: 700, color: '#0c0c0a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(tot)}</p>
                  </div>
                  {inst && <p style={{ fontSize: '12px', color: '#888' }}>{p.installments}× de <strong style={{ color: '#0c0c0a' }}>{fmtBRL(inst)}</strong></p>}
                </div>
              </div>
            )}

            {/* Payment + Terms */}
            {(p.payment || p.terms) && (
              <div style={{ display: 'grid', gridTemplateColumns: p.payment && p.terms ? '1fr 1fr' : '1fr', gap: '24px', paddingTop: '20px', borderTop: '1px solid #e8e5e0' }}>
                {p.payment && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', marginBottom: '10px' }}>Condições de Pagamento</p>
                    <p style={{ fontSize: '12px', color: '#333', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{p.payment}</p>
                  </div>
                )}
                {p.terms && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', marginBottom: '10px' }}>Termos e Condições</p>
                    <p style={{ fontSize: '12px', color: '#333', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{p.terms}</p>
                  </div>
                )}
              </div>
            )}

            {/* Signatures */}
            <div style={{ borderTop: '1px solid #e8e5e0', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: '10px', color: '#bbb' }}>Documento gerado pelo Esquire CRM</p>
                <p style={{ fontSize: '10px', color: '#ccc', marginTop: '2px' }}>{new Date(p.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              <div style={{ display: 'flex', gap: '48px' }}>
                {['Emitente', 'Cliente'].map((party) => (
                  <div key={party} style={{ textAlign: 'center' }}>
                    <div style={{ width: '140px', borderTop: '1px solid #0c0c0a', paddingTop: '8px' }}>
                      <p style={{ fontSize: '10px', color: '#888' }}>{party}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  if (showForm) return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button type="button" onClick={() => setShowForm(false)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: muted, background: 'none', border: `1px solid ${border}`, borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
          ← Voltar
        </button>
        <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>Nova Proposta Comercial</span>
        <span style={{ fontSize: '12px', color: muted }}>· {deal.company_name ?? deal.title}</span>
      </div>

      {/* 1. Identificação */}
      <div style={sec}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', borderLeft: '3px solid #b83535', paddingLeft: '8px' }}>Identificação</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px' }}>
          <div>
            <label style={lbl}>Título da proposta</label>
            <input value={propTitle} onChange={(e) => { setPropTitle(e.target.value); saveDraft() }}
              placeholder={`Proposta Comercial — ${deal.company_name ?? deal.title}`}
              style={inp} />
          </div>
          <div>
            <label style={lbl}>Válida até</label>
            <input type="date" value={validity} onChange={(e) => { setValidity(e.target.value); saveDraft() }}
              style={{ ...inp, colorScheme: isDark ? 'dark' : 'light' }} />
          </div>
        </div>
      </div>

      {/* 2. Apresentação */}
      <div style={sec}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', borderLeft: '3px solid #b83535', paddingLeft: '8px' }}>Apresentação</p>
        <label style={lbl}>Texto introdutório</label>
        <textarea value={intro} onChange={(e) => { setIntro(e.target.value); saveDraft() }} rows={3}
          placeholder="Contexto da proposta, relação com o cliente, objetivo da parceria..."
          style={ta} />
      </div>

      {/* Modelos rápidos — carousel */}
      <TemplatePicker
        isDark={isDark}
        border={border}
        text={text}
        muted={muted}
        onPick={(key) => {
          if (key === 'scope')   { setScope(SCOPE_TEMPLATE); saveDraft() }
          if (key === 'payment') { setPayment(buildPaymentTemplate(installments, total, fmtBRL)); saveDraft() }
          if (key === 'terms')   { setTerms(TERMS_TEMPLATE); saveDraft() }
        }}
      />

      {/* 3. Escopo */}
      <div style={sec}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', borderLeft: '3px solid #b83535', paddingLeft: '8px' }}>Escopo do Projeto</p>
          <ModelBtn onClick={() => { setScope(SCOPE_TEMPLATE); saveDraft() }} />
        </div>
        <textarea value={scope} onChange={(e) => { setScope(e.target.value); saveDraft() }} rows={5}
          placeholder="Descreva o que está incluído, prazos, número de revisões, exclusões de escopo..."
          style={ta} />
      </div>

      {/* 4. Itens */}
      <div style={sec}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', borderLeft: '3px solid #b83535', paddingLeft: '8px' }}>Itens e Valores</p>
          <button type="button" onClick={addLine}
            style={{ fontSize: '11px', fontWeight: 700, color: accent, backgroundColor: 'rgba(184,53,53,0.08)', border: '1px solid rgba(184,53,53,0.22)', borderRadius: '5px', padding: '4px 12px', cursor: 'pointer' }}>
            + Adicionar item
          </button>
        </div>
        {lines.length === 0 ? (
          <button type="button" onClick={addLine}
            style={{ width: '100%', padding: '18px', borderRadius: '8px', border: `2px dashed ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '12px', cursor: 'pointer' }}>
            Clique para adicionar o primeiro item →
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 70px 120px 110px 28px', gap: '8px', paddingBottom: '6px', borderBottom: `1px solid ${border}` }}>
              {['Descrição', 'Qtd', 'Valor unit.', 'Total', ''].map((h) => (
                <p key={h} style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
              ))}
            </div>
            {lines.map((l) => (
              <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '3fr 70px 120px 110px 28px', gap: '8px', alignItems: 'center' }}>
                <input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} placeholder="Descrição do serviço" style={inp} />
                <input type="number" min={1} value={l.qty} onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })} style={{ ...inp, textAlign: 'right' }} />
                <input type="number" min={0} value={l.unit_price || ''} onChange={(e) => updateLine(l.id, { unit_price: Number(e.target.value) })} placeholder="0,00" style={{ ...inp, textAlign: 'right' }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#2c5545', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(l.qty * l.unit_price)}</p>
                <button type="button" onClick={() => removeLine(l.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
            {/* Totals */}
            <div style={{ marginTop: '6px', paddingTop: '12px', borderTop: `1px solid ${border}`, display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '11px', color: muted }}>Desconto</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" min={0} max={100} value={discountPct || ''} onChange={(e) => { setDiscountPct(Number(e.target.value)); saveDraft() }}
                    placeholder="0" style={{ ...inp, width: '72px', paddingRight: '22px', textAlign: 'right' }} />
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: muted, pointerEvents: 'none' }}>%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '11px', color: muted }}>Parcelas</label>
                <select value={installments} onChange={(e) => { setInstallments(Number(e.target.value)); saveDraft() }}
                  style={{ ...inp, width: '160px', cursor: 'pointer' }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}× de ${total > 0 ? fmtBRL(total / n) : '—'}`}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', paddingLeft: '12px', borderLeft: `1px solid ${border}` }}>
                {discountPct > 0 && <p style={{ fontSize: '12px', color: '#b83535' }}>−{fmtBRL(discount)}</p>}
                <p style={{ fontSize: '11px', color: muted }}>Total</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#2c5545', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(total)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Condições de Pagamento */}
      <div style={sec}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', borderLeft: '3px solid #b83535', paddingLeft: '8px' }}>Condições de Pagamento</p>
          <ModelBtn onClick={() => { setPayment(buildPaymentTemplate(installments, total, fmtBRL)); saveDraft() }} />
        </div>
        <textarea value={payment} onChange={(e) => { setPayment(e.target.value); saveDraft() }} rows={4}
          placeholder="Descreva as condições de pagamento, formas aceitas e prazos..."
          style={ta} />
      </div>

      {/* 6. Termos */}
      <div style={sec}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', borderLeft: '3px solid #b83535', paddingLeft: '8px' }}>Termos e Condições</p>
          <ModelBtn onClick={() => { setTerms(TERMS_TEMPLATE); saveDraft() }} />
        </div>
        <textarea value={terms} onChange={(e) => { setTerms(e.target.value); saveDraft() }} rows={5}
          placeholder="Validade, propriedade intelectual, prazo de entrega, garantias..."
          style={ta} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '8px' }}>
        <button type="button" onClick={() => setShowForm(false)}
          style={{ fontSize: '13px', fontWeight: 600, padding: '9px 18px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ fontSize: '13px', fontWeight: 700, padding: '9px 24px', borderRadius: '7px', border: 'none', backgroundColor: saved ? '#2c5545' : '#6b1212', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background-color 0.2s ease' }}>
          {saving ? 'A guardar…' : saved ? '✓ Proposta guardada!' : 'Guardar Proposta'}
        </button>
      </div>
    </div>
  )

  // ── List (default) ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button type="button" onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 18px', backgroundColor: '#6b1212', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
          <Plus style={{ width: '13px', height: '13px' }} />
          Nova Proposta
        </button>
        <button type="button" onClick={() => navigate('/propostas')}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '36px', padding: '0 14px', backgroundColor: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: '8px', fontSize: '12px', cursor: 'pointer', marginLeft: 'auto' }}>
          <FileText style={{ width: '11px', height: '11px' }} />
          Todas as propostas
        </button>
      </div>

      {history.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: '12px', backgroundColor: isDark ? '#111110' : '#fafaf8', border: `2px dashed ${border}`, borderRadius: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: isDark ? '#1a1a18' : '#f3f1ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText style={{ width: '22px', height: '22px', color: isDark ? '#3a3834' : '#c4bfb8' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: text, marginBottom: '4px' }}>Nenhuma proposta criada</p>
            <p style={{ fontSize: '12px', color: muted }}>Crie a primeira proposta comercial para este lead</p>
          </div>
          <button type="button" onClick={() => setShowForm(true)}
            style={{ marginTop: '4px', fontSize: '12px', fontWeight: 700, color: '#fff', backgroundColor: '#6b1212', border: 'none', borderRadius: '7px', padding: '8px 20px', cursor: 'pointer' }}>
            Criar proposta
          </button>
        </div>
      ) : (
        <ProposalList
          history={history}
          role={dealRole}
          isDark={isDark}
          border={border}
          text={text}
          muted={muted}
          accent={accent}
          onOpen={setPreview}
          onDelete={deleteProposal}
        />
      )}
    </div>
  )
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export function DealDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { tab?: string; proposalId?: string } | null
  const isDark   = useThemeStore((s) => s.isDark)
  const storeDeal    = useDealStore((s) => s.deals.find((d) => d.id === id))
  const dealsLoading = useDealStore((s) => s.isLoading)
  const dealsInitialized = useDealStore((s) => s.initialized)

  // Fallback: deal not in paginated store — fetch directly (e.g. closed_won on page 2+)
  const [fetchedDeal, setFetchedDeal] = useState<Deal | null>(null)
  const [fetchingDeal, setFetchingDeal] = useState(false)
  useEffect(() => {
    if (!id || !dealsInitialized || storeDeal) return
    setFetchingDeal(true)
    supabase.from('deals').select('*').eq('id', id).single()
      .then(({ data }) => { setFetchedDeal(data as Deal | null); setFetchingDeal(false) }, () => setFetchingDeal(false))
  }, [id, dealsInitialized, storeDeal])

  const deal = storeDeal ?? fetchedDeal

  const moveDeal        = useDealStore((s) => s.moveDeal)
  const fetchActivities = useActivityStore((s) => s.fetchForDeal)
  const byDeal          = useActivityStore((s) => s.byDeal)
  const addActivity     = useActivityStore((s) => s.addActivity)
  const activities      = (id ? byDeal[id] : undefined) ?? []
  const allMeetings     = useMeetingStore((s) => s.meetings)
  const initMeetings    = useMeetingStore((s) => s.initialize)
  const meetings        = useMemo(
    () => allMeetings.filter((m) => m.deal_id === id),
    [allMeetings, id],
  )

  const allContracts   = usePaymentStore((s) => s.contracts)
  const allPayments    = usePaymentStore((s) => s.payments)
  const initPayments   = usePaymentStore((s) => s.initialize)
  const payInstallment = usePaymentStore((s) => s.payInstallment)
  const contract       = useMemo(() => allContracts.find((c) => c.deal_id === id), [allContracts, id])
  const dealPayments   = useMemo(() => allPayments.filter((p) => p.deal_id === id), [allPayments, id])

  const dbProposals    = useProposalStore((s) => s.byDeal[id ?? '']) ?? []
  const loadProposals  = useProposalStore((s) => s.loadForDeal)

  useEffect(() => { initMeetings() }, [initMeetings])
  useEffect(() => { initPayments() }, [initPayments])
  useEffect(() => { if (id) loadProposals(id) }, [id, loadProposals])

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'proposal' | 'tasks'>(
    locationState?.tab === 'proposal' ? 'proposal' : 'overview'
  )
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
  const patchDealFields    = useDealStore((s) => s.patchDealFields)

  // ── Inline field edit ────────────────────────────────────────────────────────
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editDraft, setEditDraft]       = useState('')
  const [savingField, setSavingField]   = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)


  // ── Teams ────────────────────────────────────────────────────────────────────
  const teams = useTeamStore((s) => s.teams)

  // ── Audit log ────────────────────────────────────────────────────────────────
  const [dealEvents, setDealEvents]       = useState<DealEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  // ── Stage history ─────────────────────────────────────────────────────────────
  type StageHistoryEntry = { id: string; from_stage: string | null; to_stage: string; changed_at: string; days_in_previous_stage: number }
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>([])

  useEffect(() => {
    if (!id) return
    supabase
      .from('deal_stage_history')
      .select('id, from_stage, to_stage, changed_at, days_in_previous_stage')
      .eq('deal_id', id)
      .order('changed_at', { ascending: false })
      .then(({ data }) => setStageHistory((data ?? []) as StageHistoryEntry[]))
  }, [id])

  // ── Meeting records ───────────────────────────────────────────────────────────
  const [meetingRecords, setMeetingRecords] = useState<MeetingRecord[]>([])

  function loadMeetingRecords() {
    if (!id) return
    supabase
      .from('meeting_records')
      .select('id, meeting_date, completed_items, score, notes')
      .eq('deal_id', id)
      .order('meeting_date', { ascending: false })
      .then(({ data }) => setMeetingRecords((data ?? []) as MeetingRecord[]))
  }

  useEffect(() => { loadMeetingRecords() }, [id])

  const clearByDeal = useNotificationStore((s) => s.clearByDeal)
  const subscribeActivities = useActivityStore((s) => s.subscribeRealtime)

  useEffect(() => {
    if (id) fetchActivities(id)
  }, [id, fetchActivities])

  useEffect(() => {
    const unsubscribe = subscribeActivities()
    return unsubscribe
  }, [subscribeActivities])

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

  useEffect(() => {
    if (!deal) return
    setLoadingEvents(true)
    fetchDealEvents(deal.id)
      .then(setDealEvents)
      .catch(() => setDealEvents([]))
      .finally(() => setLoadingEvents(false))
  }, [deal?.id])


  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f8f7f4'
  const accent  = isDark ? '#e05050' : '#b83535'

  if (dealsLoading || !dealsInitialized || fetchingDeal) {
    return (
      <PageLoadingState
        title="Carregando lead"
        description="Estamos preparando os dados do lead e o histórico recente."
      />
    )
  }

  if (!deal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#8a857d' }}>
          {'Lead não encontrado'}
        </p>
        <button type="button" onClick={() => navigate('/pipeline')} style={{ fontSize: '13px', fontWeight: 600, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>
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

  const proposalCtx = {
    proposalCount: dbProposals.length,
    hasAcceptedProposal: dbProposals.some((p) => p.status === 'accepted'),
  }
  const completedTaskCount = dealTasks.filter((t) => !!t.completed_at).length
  const pendingTaskCount   = dealTasks.filter((t) => !t.completed_at).length
  const score = evaluateDealScore(deal, {
    meetingCount: meetings.length,
    completedTaskCount,
    pendingTaskCount,
    ...proposalCtx,
  })

  const currentStage = STAGES.find((s) => s.id === deal.stage_id)

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--surface-base)' }}>

      {/* ── Top bar: breadcrumb fixo nas bordas + hero centralizado ── */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${border}`, position: 'relative' }}>

        {/* Botão voltar — fixo no canto esquerdo */}
        <button type="button" onClick={() => navigate('/pipeline')} style={{
          position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '11px', fontWeight: 500, color: muted,
          background: 'none', border: 'none', cursor: 'pointer', zIndex: 1,
          padding: '4px 6px', borderRadius: '5px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = text; e.currentTarget.style.backgroundColor = isDark ? '#1c1c1a' : '#f0ede8' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = muted; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <ArrowLeft style={{ width: '12px', height: '12px' }} />
          Jornada
        </button>

        {/* Hero — centrado */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 120px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '600px', width: '100%' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: avatarColor, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                {deal.company_name ?? contactName}
              </p>
              <p style={{ fontSize: '11px', color: muted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deal.title}
              </p>
            </div>
            {currentStage && (
              <span style={{ fontSize: '10px', fontWeight: 700, color: currentStage.color, backgroundColor: `${currentStage.color}15`, border: `1px solid ${currentStage.color}35`, borderRadius: '20px', padding: '3px 10px', flexShrink: 0 }}>
                {currentStage.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stage selector ── */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'center', backgroundColor: isDark ? '#0d0c0b' : '#faf9f7' }}>
        <div style={{ maxWidth: '1280px', width: '100%', padding: '0 16px', display: 'flex', flexDirection: 'column' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', overflowX: 'auto', padding: '8px 0' }}>
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
                    height: '26px', padding: '0 12px', borderRadius: '20px', whiteSpace: 'nowrap',
                    fontSize: '11px', fontWeight: isActive ? 700 : 400,
                    color: isActive ? s.color : isPrev ? (isDark ? '#3a3834' : '#c8c4bc') : muted,
                    backgroundColor: isActive ? `${s.color}14` : 'transparent',
                    border: isActive ? `1px solid ${s.color}40` : '1px solid transparent',
                    cursor: s.id === deal.stage_id ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = isDark ? '#1c1c1a' : '#f0ede8'; e.currentTarget.style.color = text } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = isPrev ? (isDark ? '#3a3834' : '#c8c4bc') : muted } }}
                >
                  {isActive && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />}
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
                      color: lossReasonDraft === r ? '#c53030' : (isDark ? '#9a7070' : '#a88030'),
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
      </div>

      {/* ── Declined banner ── */}
      {contract?.status === 'paused' && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 20px',
          backgroundColor: isDark ? '#1a0f0f' : '#fff1f1',
          borderBottom: `1px solid ${isDark ? '#4a1818' : '#fecaca'}`,
        }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b1212', backgroundColor: 'rgba(107,18,18,0.12)', border: '1px solid rgba(107,18,18,0.3)', borderRadius: '999px', padding: '2px 8px', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>
            Declinado
          </span>
          <span style={{ fontSize: '12px', color: isDark ? '#c97070' : '#7f1d1d' }}>
            Contrato pausado. Cria uma nova proposta e clica <strong>Reactivar</strong> em <strong>Admin → Cobrança → Declinados</strong> para voltar a activos.
          </span>
        </div>
      )}

      {/* ── Main body: tab area + right sidebar ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <div style={{ flex: 1, minHeight: 0, maxWidth: '1280px', width: '100%', padding: '12px 16px 16px', overflow: 'hidden', display: 'flex', gap: '12px' }}>

        {/* Left sidebar — stacked cards */}
        <div style={{
          width: '270px', minWidth: '270px', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '10px',
          order: 1, overflowY: 'auto',
        }}>
          {/* Aurea AI card */}
          {(() => {
            const scoreColor = score >= 70 ? '#2c5545' : score >= 45 ? '#a88030' : '#b83535'
            const scoreLabel = score >= 70 ? 'Saudável' : score >= 45 ? 'Atenção' : 'Crítico'
            const trackBg    = isDark ? '#1e1e1c' : '#eeece8'
            type ChipDef = { label: string; val: string; color: string }
            const chips: ChipDef[] = [
              { label: 'Health Score', val: `${score}`, color: scoreColor },
              ...(deal.probability != null ? [{ label: 'Probabilidade', val: `${deal.probability}%`, color: '#4d7aa8' }] : []),
              { label: 'Etapa', val: `${deal.days_in_stage}d`, color: '#7678b0' },
            ]
            return (
              <div style={{ padding: '18px 20px 16px', border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: isDark ? '#111110' : '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap style={{ width: '12px', height: '12px', color: '#a01818' }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#a01818' }}>Aurea AI</span>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#2c5545', backgroundColor: isDark ? '#0d2318' : '#f0faf4', border: '1px solid #2c554530', borderRadius: '999px', padding: '2px 8px' }}>Ativo</span>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: scoreColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{score}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: scoreColor }}>{scoreLabel}</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', width: `${score}%`, backgroundColor: scoreColor, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {chips.map((c) => (
                    <span key={c.label} style={{
                      fontSize: '11px', fontWeight: 500, color: c.color,
                      backgroundColor: `${c.color}14`, border: `1px solid ${c.color}28`,
                      borderRadius: '999px', padding: '3px 9px', whiteSpace: 'nowrap',
                    }}>
                      {c.label}: <strong style={{ fontWeight: 700 }}>{c.val}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Action buttons card */}
          <div style={{ padding: '16px 18px', border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: isDark ? '#111110' : '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setShowEditPanel(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                width: '100%', height: '34px', borderRadius: '8px',
                backgroundColor: '#8b1515', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: 700,
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <Pencil style={{ width: '11px', height: '11px' }} />
              Editar lead
            </button>

            {deal.contact_phone && (
              <a
                href={`https://wa.me/${deal.contact_phone.replace(/\D/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  width: '100%', height: '32px', borderRadius: '8px',
                  backgroundColor: isDark ? '#0a2e1a' : '#f0faf4',
                  border: `1px solid #3d8a6e40`, color: '#2c5545',
                  fontSize: '11px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
                  transition: 'opacity 0.15s ease', boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            )}

            {deal.contact_email && (
              <button
                type="button"
                onClick={() => navigate(`/email?to=${encodeURIComponent(deal.contact_email!)}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  width: '100%', height: '32px', borderRadius: '8px',
                  backgroundColor: 'transparent', border: `1px solid ${border}`,
                  color: muted, fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Mail style={{ width: '11px', height: '11px' }} />
                Email
              </button>
            )}
          </div>

          {/* Contacts card */}
          {(deal.contact_name || deal.contact_email || deal.contact_phone || deal.contact_linkedin || deal.company_website) && (
            <div style={{ padding: '16px 18px', border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: isDark ? '#111110' : '#ffffff' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Contacto</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {deal.contact_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: isDark ? '#2a2824' : '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: muted }}>👤</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.contact_name}</span>
                  </div>
                )}
                {deal.contact_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: isDark ? '#1a1e2a' : '#eff3fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail style={{ width: '12px', height: '12px', color: '#4d7aa8' }} />
                    </div>
                    <button type="button" onClick={() => navigate(`/email?to=${encodeURIComponent(deal.contact_email!)}`)}
                      style={{ fontSize: '12px', fontWeight: 500, color: '#4d7aa8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                      {deal.contact_email}
                    </button>
                  </div>
                )}
                {deal.contact_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: isDark ? '#0a2010' : '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Phone style={{ width: '12px', height: '12px', color: '#2c5545' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: text }}>{deal.contact_phone}</span>
                  </div>
                )}
                {deal.contact_linkedin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: isDark ? '#151a28' : '#eef2fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Linkedin style={{ width: '12px', height: '12px', color: '#7678b0' }} />
                    </div>
                    <a href={deal.contact_linkedin} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '12px', fontWeight: 500, color: '#7678b0', textDecoration: 'none' }}>LinkedIn</a>
                  </div>
                )}
                {deal.company_website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: isDark ? '#1a1a16' : '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Globe style={{ width: '12px', height: '12px', color: muted }} />
                    </div>
                    <a href={deal.company_website.startsWith('http') ? deal.company_website : `https://${deal.company_website}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '12px', fontWeight: 500, color: muted, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deal.company_website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Tab area */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', order: 2 }}>
        <div style={{ flex: 1, backgroundColor: isDark ? '#111110' : '#ffffff', border: `1px solid ${border}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ padding: '0 20px', borderBottom: '1px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '2px', height: '48px' }}>
            {([
              { id: 'overview',  label: 'Resumo'    },
              { id: 'activity',  label: 'Atividade' },
              { id: 'tasks',     label: 'Tarefas'   },
              { id: 'proposal',  label: 'Proposta'  },
            ] as const).map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                style={{
                  height: '100%', padding: '0 14px', fontSize: '13px', fontWeight: activeTab === tab.id ? 600 : 500,
                  color: activeTab === tab.id ? accent : muted,
                  backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? `2px solid ${accent}` : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                  marginBottom: '-1px', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = text }}
                onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = muted }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* ── Visão geral tab ── */}
            {activeTab === 'overview' && (
              <div style={{ padding: '6px 8px' }}>
                {/* KPI grid */}
                {(() => {
                  const sizeLabel: Record<string, string> = { '1-50': 'Pequena · 1–50', '51-200': 'Média · 51–200', '201-1000': 'Grande · 201–1k', '1000+': 'Enterprise · 1k+' }
                  const segCfg: Record<string, { color: string; bg: string; bgDark: string; desc: string }> = {
                    B2B: { color: '#4d7aa8', bg: '#eff4fb', bgDark: '#1a2436', desc: 'Empresa para Empresa' },
                    B2C: { color: '#8878b8', bg: '#f3f0fb', bgDark: '#24193a', desc: 'Empresa para Consumidor' },
                    B2G: { color: '#4d8fa8', bg: '#edf5f8', bgDark: '#162430', desc: 'Empresa para Governo' },
                  }
                  const seg = deal.segment ? segCfg[deal.segment] : null
                  const kpiCard: React.CSSProperties = { padding: '12px 14px', backgroundColor: isDark ? '#111110' : '#ffffff', border: `1px solid ${border}`, borderRadius: '7px' }
                  const kpiLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }
                  return (
                    <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {/* Row 1: Segmento + Origem */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div style={{ ...kpiCard, ...(seg ? { backgroundColor: isDark ? seg.bgDark : seg.bg, border: `1px solid ${seg.color}20` } : {}) }}>
                          <p style={kpiLabel}>Área</p>
                          {seg ? (
                            <>
                              <p style={{ fontSize: '15px', fontWeight: 700, color: seg.color, letterSpacing: '-0.01em', lineHeight: 1, fontFamily: '"Geist Mono", monospace' }}>{deal.segment}</p>
                              <p style={{ fontSize: '11px', color: seg.color, opacity: 0.65, marginTop: '3px' }}>{seg.desc}</p>
                            </>
                          ) : <p style={{ fontSize: '13px', color: muted, fontStyle: 'italic' }}>—</p>}
                        </div>
                        <div style={kpiCard}>
                          <p style={kpiLabel}>Origem</p>
                          {deal.lead_source
                            ? <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{deal.lead_source}</p>
                            : <p style={{ fontSize: '13px', color: muted, fontStyle: 'italic' }}>—</p>}
                        </div>
                      </div>
                      {/* Row 2: Porte + Setor */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div style={kpiCard}>
                          <p style={kpiLabel}>Porte</p>
                          {deal.company_size
                            ? <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{sizeLabel[deal.company_size] ?? deal.company_size}</p>
                            : <p style={{ fontSize: '13px', color: muted, fontStyle: 'italic' }}>—</p>}
                        </div>
                        <div style={kpiCard}>
                          <p style={kpiLabel}>Setor</p>
                          {deal.company_sector
                            ? <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.company_sector}</p>
                            : <p style={{ fontSize: '13px', color: muted, fontStyle: 'italic' }}>—</p>}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Recent activity feed */}
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Atividade Recente</p>
                {(() => {
                  const timeline = buildTimeline(activities, meetings, meetingRecords).slice(0, 5)
                  if (timeline.length === 0) return <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Nenhuma atividade ainda</p>
                  return (
                    <div>
                      {timeline.map((entry) => (
                        <div key={entry.kind === 'activity' ? entry.activity.id : entry.kind === 'meeting' ? entry.meeting.id : entry.record.id}>
                          {entry.kind === 'activity'
                            ? <ActivityEntry activity={entry.activity} meeting={entry.meeting} isDark={isDark} />
                            : entry.kind === 'meeting'
                            ? <StandaloneMeetingEntry meeting={entry.meeting} isDark={isDark} />
                            : null
                          }
                        </div>
                      ))}
                      {buildTimeline(activities, meetings, meetingRecords).length > 5 && (
                        <button type="button" onClick={() => setActiveTab('activity')} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                          Ver toda atividade →
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* Unified history */}
                {(() => {
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

                  type HistItem = { key: string; date: string; badge: string; badgeColor: string; title: string; detail?: string }
                  const items: HistItem[] = []

                  // Meetings
                  for (const m of meetings) {
                    items.push({ key: `m-${m.id}`, date: m.scheduled_at, badge: 'Reunião', badgeColor: '#b83535', title: m.title, detail: `${m.duration_minutes}min · ${m.attendees?.length ?? 0} participantes` })
                  }

                  // Activities (email, call, note, meeting, task)
                  const ACT_BADGE: Record<string, { label: string; color: string }> = {
                    email:   { label: 'Email enviado',  color: '#4d7aa8' },
                    call:    { label: 'Ligação',         color: '#4d8fa8' },
                    note:    { label: 'Nota',            color: '#a88030' },
                    meeting: { label: 'Reunião',         color: accent },
                    task:    { label: 'Actividade',      color: '#7678b0' },
                  }
                  for (const a of activities) {
                    const cfg = ACT_BADGE[a.type] ?? { label: a.type, color: '#6b6560' }
                    items.push({ key: `act-${a.id}`, date: a.created_at, badge: cfg.label, badgeColor: cfg.color, title: a.subject, detail: a.body ? a.body.slice(0, 80) : undefined })
                  }

                  // Tasks
                  for (const t of dealTasks) {
                    if (t.completed_at) {
                      items.push({ key: `tc-${t.id}`, date: t.completed_at, badge: 'Tarefa concluída', badgeColor: '#2c5545', title: t.title })
                    } else {
                      items.push({ key: `tp-${t.id}`, date: t.created_at ?? t.due_date ?? '', badge: 'Tarefa criada', badgeColor: '#4d7aa8', title: t.title, detail: t.due_date ? `Vence ${formatDate(t.due_date)}` : undefined })
                    }
                  }

                  // Proposals from store (DB)
                  dbProposals.forEach((p, i) => {
                    const sub = p.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
                    const val = sub - sub * ((p.discount_pct ?? 0) / 100)
                    const statusLabel = p.status === 'accepted' ? 'Aceite' : p.status === 'rejected' ? 'Recusada' : 'Em análise'
                    const color = p.status === 'accepted' ? '#2c5545' : p.status === 'rejected' ? '#b83535' : '#a88030'
                    items.push({ key: `prop-${i}`, date: p.created_at ?? '', badge: `Proposta — ${statusLabel}`, badgeColor: color, title: formatCurrency(val) })
                  })

                  // Stage changes from stageHistory
                  for (const sh of stageHistory) {
                    const fromLabel = sh.from_stage ? (STAGES.find((s) => s.id === sh.from_stage)?.label ?? sh.from_stage) : 'Início'
                    const toLabel = STAGES.find((s) => s.id === sh.to_stage)?.label ?? sh.to_stage
                    items.push({ key: `sh-${sh.id}`, date: sh.changed_at, badge: 'Etapa', badgeColor: '#b83535', title: `${fromLabel} → ${toLabel}`, detail: sh.days_in_previous_stage > 0 ? `${sh.days_in_previous_stage}d na etapa anterior` : undefined })
                  }

                  // Field changes from dealEvents (non-stage, non-task)
                  for (const ev of dealEvents) {
                    if (ev.event_type === 'stage_change') continue // already from stageHistory
                    if (ev.event_type === 'task_added' || ev.event_type === 'task_removed') continue // already from dealTasks
                    const fieldLabel = ev.field_name ? (FIELD_LABELS[ev.field_name] ?? ev.field_name) : 'Campo'
                    const oldStr = fmtVal(ev.old_value, ev.field_name ?? undefined)
                    const newStr = fmtVal(ev.new_value, ev.field_name ?? undefined)
                    items.push({ key: `ev-${ev.id}`, date: ev.created_at, badge: fieldLabel, badgeColor: muted, title: `${oldStr} → ${newStr}` })
                  }

                  const sorted = items.filter(i => i.date).sort((a, b) => b.date.localeCompare(a.date))

                  return (
                    <div style={{ marginTop: '20px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Histórico</p>
                      {loadingEvents ? (
                        <p style={{ fontSize: '11px', color: muted }}>Carregando...</p>
                      ) : sorted.length === 0 ? (
                        <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic' }}>Nenhum evento ainda</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {sorted.map((item) => (
                            <div key={item.key} style={{
                              padding: '10px 12px',
                              backgroundColor: isDark ? '#111110' : '#ffffff',
                              border: `1px solid ${border}`,
                              borderLeft: `3px solid ${item.badgeColor}`,
                              borderRadius: '7px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: item.badgeColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.badge}</span>
                                <span style={{ fontSize: '10px', color: muted }}>{relativeDate(item.date.slice(0, 10))}</span>
                              </div>
                              <p style={{ fontSize: '12px', color: text, fontWeight: 600, lineHeight: 1.35 }}>{item.title}</p>
                              {item.detail && <p style={{ fontSize: '11px', color: muted, marginTop: '3px' }}>{item.detail}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

              </div>
            )}

            {/* ── Atividade tab ── */}
            {activeTab === 'activity' && (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

                {/* ── Section 1: Atividades / Reuniões / Tarefas ── */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Atividades & Reuniões</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: border }} />
                  </div>

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
                          try {
                            await createTask({ title: quickTaskTitle.trim(), deal_id: deal.id, due_date: quickTaskDate || undefined, priority: 'medium', task_type: 'other' })
                            await addActivity(deal.id, { type: 'task', subject: quickTaskTitle.trim(), owner })
                            setQuickTaskTitle(''); setQuickTaskDate(''); setShowQuickTask(false)
                          } finally { setSavingQuickTask(false) }
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
                          style={{ height: '24px', padding: '0 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 500, cursor: 'pointer', backgroundColor: quickTaskDate === value ? '#6b1212' : 'transparent', color: quickTaskDate === value ? '#fff' : muted, border: `1px solid ${quickTaskDate === value ? '#6b1212' : border}` }}
                        >{label}</button>
                      ))}
                      <button type="button"
                        disabled={!quickTaskTitle.trim() || savingQuickTask}
                        onClick={async () => {
                          if (!quickTaskTitle.trim()) return
                          setSavingQuickTask(true)
                          try {
                            await createTask({ title: quickTaskTitle.trim(), deal_id: deal.id, due_date: quickTaskDate || undefined, priority: 'medium', task_type: 'other' })
                            await addActivity(deal.id, { type: 'task', subject: quickTaskTitle.trim(), owner })
                            setQuickTaskTitle(''); setQuickTaskDate(''); setShowQuickTask(false)
                          } finally { setSavingQuickTask(false) }
                        }}
                        style={{ height: '24px', padding: '0 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#6b1212', color: '#fff', border: 'none', marginLeft: 'auto', opacity: quickTaskTitle.trim() ? 1 : 0.5 }}
                      >{savingQuickTask ? '...' : 'Criar tarefa'}</button>
                    </div>
                  </div>
                )}
                {showAddActivity && (
                  <AddActivityForm dealId={deal.id} owner={owner} onClose={() => setShowAddActivity(false)} isDark={isDark} />
                )}
                {(() => {
                  const timeline = buildTimeline(activities, meetings, meetingRecords)
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
                          <div key={entry.kind === 'activity' ? entry.activity.id : entry.kind === 'meeting' ? entry.meeting.id : entry.record.id}>
                            {showGroup && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', marginTop: i > 0 ? '4px' : 0 }}>
                                <span style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{group}</span>
                                <div style={{ flex: 1, height: '1px', backgroundColor: border }} />
                              </div>
                            )}
                            {entry.kind === 'activity'
                              ? <ActivityEntry activity={entry.activity} meeting={entry.meeting} isDark={isDark} />
                              : entry.kind === 'meeting'
                              ? <StandaloneMeetingEntry meeting={entry.meeting} isDark={isDark} />
                              : <MeetingRecordEntry record={entry.record} isDark={isDark} />
                            }
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
                </div>{/* end section 1 */}

                {/* ── Section 2: Histórico de Pipeline ── */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Jornada no Pipeline</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: border }} />
                  </div>
                  {stageHistory.length === 0 ? (
                    <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Nenhuma movimentação registrada ainda</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stageHistory.map((entry) => {
                        const fromLabel = entry.from_stage ? (STAGES.find((s) => s.id === entry.from_stage)?.label ?? entry.from_stage) : 'Início'
                        const toLabel   = STAGES.find((s) => s.id === entry.to_stage)?.label ?? entry.to_stage
                        return (
                          <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                            <span style={{ fontSize: '9px', color: muted, whiteSpace: 'nowrap', minWidth: '60px' }}>{relativeDate(entry.changed_at.slice(0, 10))}</span>
                            <span style={{ color: isDark ? '#fc8181' : '#c53030', fontWeight: 500 }}>{fromLabel}</span>
                            <span style={{ color: muted }}>→</span>
                            <span style={{ color: '#2c5545', fontWeight: 600 }}>{toLabel}</span>
                            {entry.days_in_previous_stage > 0 && (
                              <span style={{ fontSize: '10px', color: muted, marginLeft: 'auto' }}>{entry.days_in_previous_stage}d na etapa</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>{/* end section 2 */}

              </div>
            )}

            {/* ── Propostas tab ── */}
            {activeTab === 'proposal' && (
              <ProposalTab deal={deal} isDark={isDark} border={border} text={text} muted={muted} inputBg={inputBg} initialProposalId={locationState?.proposalId} />
            )}

            {/* ── Tarefas tab ── */}
            {activeTab === 'tasks' && (
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tarefas ({dealTasks.length})</p>
                  <button type="button" onClick={() => { setShowQuickTask(true); setShowAddActivity(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: accent, backgroundColor: 'rgba(184,53,53,0.10)', border: '1px solid rgba(184,53,53,0.25)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer' }}>
                    <Plus style={{ width: '10px', height: '10px' }} />Nova Tarefa
                  </button>
                </div>
                {showQuickTask && (
                  <div style={{ marginBottom: '16px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', backgroundColor: 'var(--surface-raised)' }}>
                    <input autoFocus type="text" value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && quickTaskTitle.trim()) {
                          setSavingQuickTask(true)
                          try {
                            await createTask({ title: quickTaskTitle.trim(), deal_id: deal.id, due_date: quickTaskDate || undefined, priority: 'medium', task_type: 'other' })
                            await addActivity(deal.id, { type: 'task', subject: quickTaskTitle.trim(), owner })
                            setQuickTaskTitle(''); setQuickTaskDate(''); setShowQuickTask(false)
                          } finally { setSavingQuickTask(false) }
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
                          try {
                            await createTask({ title: quickTaskTitle.trim(), deal_id: deal.id, due_date: quickTaskDate || undefined, priority: 'medium', task_type: 'other' })
                            await addActivity(deal.id, { type: 'task', subject: quickTaskTitle.trim(), owner })
                            setQuickTaskTitle(''); setQuickTaskDate(''); setShowQuickTask(false)
                          } finally { setSavingQuickTask(false) }
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
                    {dealTasks.map((task) => {
                      const isOverdue = !task.completed_at && task.due_date && task.due_date < new Date().toISOString().slice(0, 10)
                      const dotColor = task.completed_at ? '#2c5545' : isOverdue ? '#c53030' : 'var(--ink-muted)'
                      const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
                        high:   { label: 'Alta',   color: '#b83535', bg: 'rgba(184,53,53,0.10)' },
                        medium: { label: 'Média',  color: '#a88030', bg: 'rgba(168,128,48,0.10)' },
                        low:    { label: 'Baixa',  color: '#4d8fa8', bg: 'rgba(77,143,168,0.10)' },
                      }
                      const pcfg = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium
                      return (
                        <div key={task.id} className="card-sm" style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0, marginTop: '5px' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <p style={{ fontSize: '13px', fontWeight: 500, color: task.completed_at ? muted : text, textDecoration: task.completed_at ? 'line-through' : 'none', flex: 1 }}>{task.title}</p>
                              <span style={{ fontSize: '9px', fontWeight: 700, color: pcfg.color, backgroundColor: pcfg.bg, borderRadius: '4px', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{pcfg.label}</span>
                            </div>
                            {task.due_date && <p style={{ fontSize: '11px', color: isOverdue ? '#c53030' : muted, marginTop: '2px' }}>{isOverdue ? '⚠ ' : ''}{formatDate(task.due_date)}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Anotações — agrupadas com tarefas */}
                <div style={{ marginTop: '24px', borderTop: `1px solid ${border}`, paddingTop: '20px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Anotações</p>
                  <NotesSection dealId={deal.id} owner={owner} isDark={isDark} border={border} text={text} muted={muted} />
                </div>
              </div>
            )}


          </div>
        </div>
        </div>{/* end tab area wrapper */}
      </div>{/* end inner max-width wrapper */}
      </div>{/* end main body flex row */}
    </div>

    {/* ── Edit slide panel ── */}
    {showEditPanel && (
      <>
        <div
          onClick={() => setShowEditPanel(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 49, backgroundColor: 'rgba(0,0,0,0.18)' }}
        />
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '360px', zIndex: 50,
          backgroundColor: isDark ? '#111110' : '#ffffff',
          borderLeft: `1px solid ${border}`,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-6px 0 28px rgba(0,0,0,0.14)',
        }}>
          <div style={{ height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Editar Lead</p>
            <button type="button" onClick={() => setShowEditPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px', display: 'flex' }}>
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

            {/* ── Contato ── */}
            <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Contato</p>

            {/* Nome */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Nome</p>
              {editingField === 'contact_name' ? (
                <input autoFocus type="text" value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => saveField({ contact_name: editDraft.trim() || deal.contact_name })}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveField({ contact_name: editDraft.trim() || deal.contact_name }); if (e.key === 'Escape') cancelEdit() }}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              ) : (
                <div onClick={() => startEdit('contact_name', deal.contact_name ?? '')} style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', backgroundColor: inputBg }}>
                  <span style={{ fontSize: '13px', color: deal.contact_name ? text : muted, fontStyle: deal.contact_name ? 'normal' : 'italic' }}>{deal.contact_name || 'Adicionar nome...'}</span>
                </div>
              )}
            </div>

            {/* Cargo */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Cargo</p>
              {editingField === 'contact_title' ? (
                <input autoFocus type="text" value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => saveField({ contact_title: editDraft.trim() || undefined })}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveField({ contact_title: editDraft.trim() || undefined }); if (e.key === 'Escape') cancelEdit() }}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              ) : (
                <div onClick={() => startEdit('contact_title', deal.contact_title ?? '')} style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', backgroundColor: inputBg }}>
                  <span style={{ fontSize: '13px', color: deal.contact_title ? text : muted, fontStyle: deal.contact_title ? 'normal' : 'italic' }}>{deal.contact_title || 'Adicionar cargo...'}</span>
                </div>
              )}
            </div>

            {/* Telefone */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Telefone / WhatsApp</p>
              {editingField === 'contact_phone' ? (
                <input autoFocus type="tel" value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => saveField({ contact_phone: editDraft.trim() || undefined })}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveField({ contact_phone: editDraft.trim() || undefined }); if (e.key === 'Escape') cancelEdit() }}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              ) : (
                <div onClick={() => startEdit('contact_phone', deal.contact_phone ?? '')} style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', backgroundColor: inputBg }}>
                  <span style={{ fontSize: '13px', color: deal.contact_phone ? text : muted, fontStyle: deal.contact_phone ? 'normal' : 'italic' }}>{deal.contact_phone || 'Adicionar telefone...'}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Email</p>
              {editingField === 'contact_email' ? (
                <input autoFocus type="email" value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => saveField({ contact_email: editDraft.trim() || undefined })}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveField({ contact_email: editDraft.trim() || undefined }); if (e.key === 'Escape') cancelEdit() }}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              ) : (
                <div onClick={() => startEdit('contact_email', deal.contact_email ?? '')} style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', backgroundColor: inputBg }}>
                  <span style={{ fontSize: '13px', color: deal.contact_email ? text : muted, fontStyle: deal.contact_email ? 'normal' : 'italic' }}>{deal.contact_email || 'Adicionar email...'}</span>
                </div>
              )}
            </div>

            {/* LinkedIn */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>LinkedIn</p>
              {editingField === 'contact_linkedin' ? (
                <input autoFocus type="url" value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  onBlur={() => saveField({ contact_linkedin: editDraft.trim() || undefined })}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveField({ contact_linkedin: editDraft.trim() || undefined }); if (e.key === 'Escape') cancelEdit() }}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              ) : (
                <div onClick={() => startEdit('contact_linkedin', deal.contact_linkedin ?? '')} style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', backgroundColor: inputBg }}>
                  <span style={{ fontSize: '13px', color: deal.contact_linkedin ? text : muted, fontStyle: deal.contact_linkedin ? 'normal' : 'italic' }}>{deal.contact_linkedin || 'Adicionar LinkedIn...'}</span>
                </div>
              )}
            </div>

            {/* Website */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Site / Website</p>
              {editingField === 'company_website' ? (
                <input autoFocus type="url" value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  placeholder="https://empresa.com"
                  onBlur={() => saveField({ company_website: editDraft.trim() || undefined } as Partial<Deal>)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveField({ company_website: editDraft.trim() || undefined } as Partial<Deal>); if (e.key === 'Escape') cancelEdit() }}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              ) : (
                <div onClick={() => startEdit('company_website', (deal as Deal & { company_website?: string }).company_website ?? '')} style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', backgroundColor: inputBg }}>
                  <span style={{ fontSize: '13px', color: (deal as Deal & { company_website?: string }).company_website ? text : muted, fontStyle: (deal as Deal & { company_website?: string }).company_website ? 'normal' : 'italic' }}>{(deal as Deal & { company_website?: string }).company_website || 'Adicionar site...'}</span>
                </div>
              )}
            </div>

            <div style={{ height: '1px', backgroundColor: border, marginBottom: '18px' }} />

            {/* ── Empresa ── */}
            <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Empresa</p>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Setor</p>
              {editingField === 'company_sector' ? (
                <input autoFocus type="text" value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => saveField({ company_sector: editDraft.trim() || undefined })}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveField({ company_sector: editDraft.trim() || undefined }); if (e.key === 'Escape') cancelEdit() }}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              ) : (
                <div onClick={() => startEdit('company_sector', deal.company_sector ?? '')} style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', backgroundColor: inputBg }}>
                  <span style={{ fontSize: '13px', color: deal.company_sector ? text : muted, fontStyle: deal.company_sector ? 'normal' : 'italic' }}>{deal.company_sector ?? 'Adicionar setor...'}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Porte</p>
              <div style={{ position: 'relative' }}>
                <select value={deal.company_size ?? ''} onChange={(e) => saveField({ company_size: (e.target.value as CompanySize) || undefined })}
                  style={{ width: '100%', height: '34px', padding: '0 30px 0 10px', fontSize: '13px', color: deal.company_size ? text : muted, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', appearance: 'none' }}>
                  <option value="">Selecionar...</option>
                  {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: muted, pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>ARR Estimado</p>
              <div style={{ position: 'relative' }}>
                <select value={deal.company_arr_range ?? ''} onChange={(e) => saveField({ company_arr_range: (e.target.value as ArrRange) || undefined })}
                  style={{ width: '100%', height: '34px', padding: '0 30px 0 10px', fontSize: '13px', color: deal.company_arr_range ? text : muted, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', appearance: 'none' }}>
                  <option value="">Selecionar...</option>
                  {ARR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: muted, pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Segmento</p>
              <div style={{ position: 'relative' }}>
                <select value={deal.segment ?? ''} onChange={(e) => saveField({ segment: (e.target.value as 'B2B' | 'B2C' | 'B2G') || null })}
                  style={{ width: '100%', height: '34px', padding: '0 30px 0 10px', fontSize: '13px', color: deal.segment ? text : muted, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', appearance: 'none' }}>
                  <option value="">Selecionar...</option>
                  <option value="B2B">B2B — Empresa para Empresa</option>
                  <option value="B2C">B2C — Empresa para Consumidor</option>
                  <option value="B2G">B2G — Empresa para Governo</option>
                </select>
                <ChevronDown style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: muted, pointerEvents: 'none' }} />
              </div>
            </div>

            {teams.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Time</p>
                <div style={{ position: 'relative' }}>
                  <select value={(deal as Deal & { team_id?: string }).team_id ?? ''} onChange={(e) => saveField({ team_id: e.target.value || undefined } as Partial<Deal>)}
                    style={{ width: '100%', height: '34px', padding: '0 30px 0 10px', fontSize: '13px', color: (deal as Deal & { team_id?: string }).team_id ? text : muted, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', appearance: 'none' }}>
                    <option value="">Sem time</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <ChevronDown style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: muted, pointerEvents: 'none' }} />
                </div>
              </div>
            )}

            {/* Contrato & Pagamentos — só visível em closed_won */}
            {deal.stage_id === 'closed_won' && (contract || dealPayments.length > 0) && (() => {
              const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
              const fmtDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso))
              const overdue  = dealPayments.filter((p) => p.status === 'overdue')
              const pending  = dealPayments.filter((p) => p.status === 'pending')
              const paid     = dealPayments.filter((p) => p.status === 'paid')
              return (
                <>
                  <div style={{ height: '1px', backgroundColor: border, margin: '6px 0 18px' }} />
                  <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Contrato & Pagamentos</p>
                  {contract && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: inputBg, border: `1px solid ${border}`, marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: text }}>{fmtBRL(contract.value)}</span>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#2c5545', backgroundColor: 'rgba(44,85,69,0.10)', borderRadius: '999px', padding: '1px 6px' }}>
                          {contract.status === 'active' ? 'Activo' : contract.status === 'completed' ? 'Concluído' : contract.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '10px', color: muted }}>
                        {contract.installments}x · {contract.frequency === 'monthly' ? 'Mensal' : contract.frequency === 'quarterly' ? 'Trimestral' : contract.frequency === 'yearly' ? 'Anual' : 'Único'}
                      </p>
                    </div>
                  )}
                  {overdue.length > 0 && (
                    <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(184,53,53,0.06)', border: '1px solid rgba(184,53,53,0.25)', marginBottom: '4px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#b83535', marginBottom: '2px' }}>
                        {overdue.length} parcela{overdue.length !== 1 ? 's' : ''} em atraso
                      </p>
                      {overdue.slice(0, 2).map((p) => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#b83535' }}>#{p.installment_no} · {fmtDate(p.due_date)}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#b83535' }}>{fmtBRL(p.amount)}</span>
                            <button type="button" onClick={() => payInstallment(p.id)}
                              style={{ fontSize: '9px', fontWeight: 700, color: '#fff', backgroundColor: '#2c5545', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>
                              Pago
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {pending.length > 0 && overdue.length === 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', backgroundColor: inputBg, border: `1px solid ${border}` }}>
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: text }}>Próxima parcela</p>
                        <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>
                          #{pending[0].installment_no} · {fmtDate(pending[0].due_date)}
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#a88030' }}>{fmtBRL(pending[0].amount)}</span>
                    </div>
                  )}
                  {paid.length > 0 && (
                    <p style={{ fontSize: '10px', color: muted, marginTop: '6px' }}>
                      {paid.length} parcela{paid.length !== 1 ? 's' : ''} paga{paid.length !== 1 ? 's' : ''} · {fmtBRL(paid.reduce((s, p) => s + p.amount, 0))} recebido
                    </p>
                  )}
                </>
              )
            })()}

            {/* Próxima atividade — auto-derivada das tarefas pendentes */}
            {(() => {
              const nextTask = allTasks
                .filter((t) => t.deal_id === deal.id && !t.completed_at && t.due_date)
                .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0]
              if (!nextTask) return null
              const isOverdue = nextTask.due_date! < new Date().toISOString().slice(0, 10)
              const dueFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(nextTask.due_date! + 'T12:00:00'))
              return (
                <>
                  <div style={{ height: '1px', backgroundColor: border, margin: '6px 0 18px' }} />
                  <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Próxima Atividade</p>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: inputBg, border: `1px solid ${isOverdue ? '#b8353540' : border}` }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextTask.title}</p>
                    <p style={{ fontSize: '11px', color: isOverdue ? '#b83535' : muted, fontWeight: isOverdue ? 600 : 400 }}>
                      {isOverdue ? `Atrasada — ${dueFmt}` : dueFmt}
                    </p>
                  </div>
                </>
              )
            })()}

          </div>
        </div>
      </>
    )}

    </>
  )
}
