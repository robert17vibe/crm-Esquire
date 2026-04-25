import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Plus, X,
  Phone, Mail, CheckSquare, Bell, Mic, CalendarDays, Clock,
  Link, Trash2, ExternalLink, Copy, Check,
} from 'lucide-react'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { supabase } from '@/lib/supabase'
import type { Deal, DealMeeting, MeetingStatus } from '@/types/deal.types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string
  date: string
  title: string
  type: 'meeting' | 'activity'
  color: string
  subtitle?: string
  dealId?: string
  startTime?: string
  eventType?: string
}

interface CalendarEvent {
  id: string
  title: string
  description?: string | null
  event_date: string
  start_time?: string | null
  end_time?: string | null
  event_type: 'call' | 'meeting' | 'task' | 'reminder'
  deal_id?: string | null
}

type EventTypeName = 'meeting' | 'call' | 'task' | 'reminder' | 'email'
type ModalState = { open: boolean; date?: string; event?: CalendarEvent; startTime?: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND = '#2c5545'

const MONTHS_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const DAYS_MIN   = ['D','S','T','Q','Q','S','S']
const HOUR_START = 7
const HOUR_END   = 21
const SLOT_H     = 60

const EVENT_TYPE_CFG: Record<string, {
  label: string; color: string; bg: string; bgDark: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
}> = {
  meeting:  { label: 'Reunião',  color: BRAND,     bg: '#2c554518', bgDark: '#2c554535', icon: Mic         },
  call:     { label: 'Ligação',  color: '#b45309', bg: '#b4530918', bgDark: '#b4530935', icon: Phone       },
  task:     { label: 'Tarefa',   color: '#2563eb', bg: '#2563eb18', bgDark: '#2563eb35', icon: CheckSquare },
  reminder: { label: 'Lembrete',color: '#7c3aed', bg: '#7c3aed18', bgDark: '#7c3aed35', icon: Bell        },
  email:    { label: 'Email',    color: '#0e7490', bg: '#0e749018', bgDark: '#0e749035', icon: Mail        },
}

const STATUS_OPTIONS: { value: MeetingStatus; label: string; color: string }[] = [
  { value: 'agendada',   label: 'Agendada',   color: '#6b7280' },
  { value: 'confirmada', label: 'Confirmada', color: '#2563eb' },
  { value: 'realizada',  label: 'Realizada',  color: BRAND     },
  { value: 'reagendada', label: 'Reagendada', color: '#b45309' },
  { value: 'cancelada',  label: 'Cancelada',  color: '#ef4444' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(iso: string) { return iso.slice(0, 10) }
function fmtTime(iso: string) { return iso.slice(11, 16) }
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay() }
function roundTime(): string {
  const now = new Date()
  const m   = now.getMinutes() >= 30 ? 60 : 30
  const h   = m === 60 ? now.getHours() + 1 : now.getHours()
  return `${String(h % 24).padStart(2, '0')}:${m === 60 ? '00' : '30'}`
}
function getWeekDays(dateStr: string): string[] {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday); day.setDate(monday.getDate() + i)
    return day.toISOString().slice(0, 10)
  })
}
function timeToMinutes(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + (m ?? 0) }
function isoToMinutes(iso: string) { return timeToMinutes(iso.slice(11, 16)) }
function evColor(type: string) { return (EVENT_TYPE_CFG[type] ?? EVENT_TYPE_CFG.meeting).color }
function evBg(type: string, dark: boolean) {
  const cfg = EVENT_TYPE_CFG[type] ?? EVENT_TYPE_CFG.meeting
  return dark ? cfg.bgDark : cfg.bg
}

// ─── Type Pill Selector ───────────────────────────────────────────────────────

function TypePills({ value, onChange, border, inBg, muted, isDark }: {
  value: EventTypeName; onChange: (v: EventTypeName) => void
  border: string; inBg: string; muted: string; isDark: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {(Object.entries(EVENT_TYPE_CFG) as [EventTypeName, typeof EVENT_TYPE_CFG[string]][])
        .filter(([k]) => k !== 'email')
        .map(([k, cfg]) => {
          const active = value === k
          const Icon = cfg.icon
          return (
            <button key={k} type="button" onClick={() => onChange(k)} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              height: '30px', padding: '0 12px', borderRadius: '999px',
              border: `1px solid ${active ? cfg.color : border}`,
              backgroundColor: active ? (isDark ? cfg.bgDark : cfg.bg) : inBg,
              color: active ? cfg.color : muted,
              fontSize: '11px', fontWeight: active ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.12s ease',
            }}>
              <Icon style={{ width: '11px', height: '11px' }} />
              {cfg.label}
            </button>
          )
        })}
    </div>
  )
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ year, month, selectedDay, eventsByDate, todayStr, isDark, onSelectDay, onPrev, onNext }: {
  year: number; month: number; selectedDay: string
  eventsByDate: Map<string, CalEvent[]>; todayStr: string; isDark: boolean
  onSelectDay: (d: string) => void; onPrev: () => void; onNext: () => void
}) {
  const text  = isDark ? '#e8e4dc' : '#1a1814'
  const muted = isDark ? '#6b6560' : '#9a9590'
  const faint = isDark ? '#2a2825' : '#e8e4de'

  const daysInMonth  = getDaysInMonth(year, month)
  const firstWeekday = getFirstWeekday(year, month)
  const prevDays     = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1)
  const cells: { day: number; year: number; month: number }[] = []
  for (let i = firstWeekday - 1; i >= 0; i--)
    cells.push({ day: prevDays - i, year: month === 0 ? year - 1 : year, month: month === 0 ? 11 : month - 1 })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, year, month })
  const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
  for (let d = 1; d <= rem; d++) cells.push({ day: d, year: month === 11 ? year + 1 : year, month: month === 11 ? 0 : month + 1 })

  return (
    <div style={{ background: isDark ? '#111110' : '#ffffff', borderRadius: '18px', padding: '14px 12px 12px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button type="button" onClick={onPrev} style={{ background: isDark ? '#1c1c1a' : '#f0ede8', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: '5px', borderRadius: '10px', transition: 'background 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = text; (e.currentTarget as HTMLElement).style.background = isDark ? '#252522' : '#e8e4de' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = muted; (e.currentTarget as HTMLElement).style.background = isDark ? '#1c1c1a' : '#f0ede8' }}>
          <ChevronLeft style={{ width: '12px', height: '12px' }} />
        </button>
        <span style={{ fontSize: '12px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>
          {MONTHS_PT[month]} <span style={{ color: muted, fontWeight: 500 }}>{year}</span>
        </span>
        <button type="button" onClick={onNext} style={{ background: isDark ? '#1c1c1a' : '#f0ede8', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: '5px', borderRadius: '10px', transition: 'background 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = text; (e.currentTarget as HTMLElement).style.background = isDark ? '#252522' : '#e8e4de' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = muted; (e.currentTarget as HTMLElement).style.background = isDark ? '#1c1c1a' : '#f0ede8' }}>
          <ChevronRight style={{ width: '12px', height: '12px' }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
        {DAYS_MIN.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', padding: '2px 0', letterSpacing: '0.06em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((cell, i) => {
          const ds = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
          const isCurrentMonth = cell.year === year && cell.month === month
          const isToday    = ds === todayStr
          const isSelected = ds === selectedDay
          const hasEvents  = (eventsByDate.get(ds) ?? []).length > 0
          return (
            <button key={i} type="button" onClick={() => onSelectDay(ds)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '32px', gap: '2px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '10px',
              backgroundColor: isSelected ? BRAND : isToday ? (isDark ? '#1a2e24' : `${BRAND}14`) : 'transparent',
              transition: 'background-color 0.15s',
            }}
              onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? '#222220' : '#f0eeea' }}
              onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = isToday ? (isDark ? '#1a2e24' : `${BRAND}14`) : 'transparent' }}>
              <span style={{
                fontSize: '11px', fontWeight: isToday || isSelected ? 700 : 400, lineHeight: 1,
                color: isSelected ? '#fff' : isToday ? BRAND : isCurrentMonth ? text : faint,
              }}>{cell.day}</span>
              {hasEvents && !isSelected && (
                <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: BRAND }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Upcoming Event Card ──────────────────────────────────────────────────────

function UpcomingCard({ ev, isDark, onClick }: { ev: CalEvent; isDark: boolean; onClick?: () => void }) {
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#9a9590'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  const cfg    = EVENT_TYPE_CFG[ev.eventType ?? (ev.type === 'meeting' ? 'meeting' : 'task')] ?? EVENT_TYPE_CFG.meeting
  const Icon   = cfg.icon
  const dateObj = new Date(ev.date + 'T12:00:00')
  const dd     = dateObj.getDate()
  const dayName = DAYS_SHORT[dateObj.getDay()]

  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', borderRadius: '10px',
      backgroundColor: isDark ? '#141412' : '#ffffff',
      border: `1px solid ${border}`, borderLeft: `3px solid ${cfg.color}`,
      cursor: onClick ? 'pointer' : 'default', transition: 'background-color 0.1s',
    }}
      onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? '#1a1a18' : '#f5f4f0' }}
      onMouseLeave={(e) => { if (onClick) (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? '#141412' : '#ffffff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0 }}>
        <span style={{ fontSize: '16px', fontWeight: 800, color: cfg.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{dd}</span>
        <span style={{ fontSize: '8px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dayName}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{ev.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: isDark ? cfg.bgDark : cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon style={{ width: '8px', height: '8px', color: cfg.color }} />
          </div>
          {ev.startTime
            ? <span style={{ fontSize: '9px', fontWeight: 600, color: cfg.color }}>{ev.startTime}</span>
            : ev.subtitle
              ? <span style={{ fontSize: '9px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.subtitle}</span>
              : null}
        </div>
      </div>
    </div>
  )
}

// ─── Meeting Detail Panel ─────────────────────────────────────────────────────

function MeetingDetailPanel({ meeting, isDark, onClose, onNavigate }: {
  meeting: DealMeeting; isDark: boolean
  onClose: () => void; onNavigate: (dealId: string) => void
}) {
  const updateMeeting = useMeetingStore((s) => s.updateMeeting)
  const deleteMeeting = useMeetingStore((s) => s.deleteMeeting)
  const deals         = useDealStore((s) => s.deals)
  const owners        = useOwnerStore((s) => s.owners)

  const bg     = isDark ? '#141412' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const inBg   = isDark ? '#0f0f0e' : '#f8f7f4'
  const sideBg = isDark ? '#0e0e0c' : '#f8f7f4'

  const deal = deals.find((d) => d.id === meeting.deal_id)

  const [evType,    setEvType]    = useState<EventTypeName>((meeting as DealMeeting & { event_type?: string }).event_type as EventTypeName ?? 'meeting')
  const [status,    setStatus]    = useState<MeetingStatus>(meeting.status ?? 'agendada')
  const [meetDate,  setMeetDate]  = useState(meeting.scheduled_at.slice(0, 10))
  const [meetTime,  setMeetTime]  = useState(meeting.scheduled_at.slice(11, 16))
  const [link,      setLink]      = useState(meeting.meeting_link ?? '')
  const [attendee,  setAttendee]  = useState('')
  const [attendees, setAttendees] = useState<string[]>(meeting.attendees ?? [])
  const [saving,    setSaving]    = useState(false)
  const [copied,    setCopied]    = useState(false)
  const attendeeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function addAttendee() {
    const val = attendee.trim()
    if (val && !attendees.includes(val)) setAttendees((a) => [...a, val])
    setAttendee(''); attendeeRef.current?.focus()
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateMeeting(meeting.id, {
        status,
        scheduled_at: `${meetDate}T${meetTime}:00`,
        meeting_link: link || null,
        attendees,
      })
      onClose()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!window.confirm('Excluir esta reunião?')) return
    await deleteMeeting(meeting.id); onClose()
  }

  function copyLink() {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const cfg = EVENT_TYPE_CFG[evType] ?? EVENT_TYPE_CFG.meeting
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status)!
  const inp: React.CSSProperties = { height: '38px', padding: '0 12px', fontSize: '13px', fontWeight: 500, backgroundColor: inBg, border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '7px' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, width: '440px', maxWidth: '95vw', backgroundColor: bg, borderLeft: `1px solid ${border}`, display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '-12px 0 48px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: isDark ? cfg.bgDark : cfg.bg, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {(() => { const Icon = cfg.icon; return <Icon style={{ width: '18px', height: '18px', color: cfg.color }} /> })()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.title}</p>
                <p style={{ fontSize: '11px', color: cfg.color, marginTop: '3px', fontWeight: 600 }}>{cfg.label}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px', display: 'flex', borderRadius: '6px', flexShrink: 0 }}>
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '12px', padding: '4px 10px', borderRadius: '999px', backgroundColor: `${currentStatus.color}18`, border: `1px solid ${currentStatus.color}40` }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: currentStatus.color }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: currentStatus.color }}>{currentStatus.label}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* Type */}
          <div style={{ marginBottom: '20px' }}>
            <p style={lbl}>Tipo de Atividade</p>
            <TypePills value={evType} onChange={setEvType} border={border} inBg={inBg} muted={muted} isDark={isDark} />
          </div>

          {/* Date + Time */}
          <div style={{ marginBottom: '20px' }}>
            <p style={lbl}>Data e Horário</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} style={{ ...inp, colorScheme: isDark ? 'dark' : 'light', paddingLeft: '36px' }} />
                <CalendarDays style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: muted, pointerEvents: 'none' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <input type="time" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} style={{ ...inp, colorScheme: isDark ? 'dark' : 'light', paddingLeft: '36px' }} />
                <Clock style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: muted, pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Lead */}
          {deal && (
            <div style={{ marginBottom: '20px' }}>
              <p style={lbl}>Lead / Cliente</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '38px', padding: '0 12px', backgroundColor: inBg, border: `1px solid ${border}`, borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: text }}>{deal.company_name || deal.contact_name || deal.title}</span>
                <button type="button" onClick={() => onNavigate(deal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND, display: 'flex', padding: '2px' }}>
                  <ExternalLink style={{ width: '13px', height: '13px' }} />
                </button>
              </div>
            </div>
          )}

          {/* Status */}
          <div style={{ marginBottom: '20px' }}>
            <p style={lbl}>Status do Agendamento</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value
                return (
                  <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '30px', padding: '0 12px', borderRadius: '999px', border: `1px solid ${active ? opt.color : border}`, backgroundColor: active ? `${opt.color}18` : inBg, color: active ? opt.color : muted, fontSize: '11px', fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.1s' }}>
                    {active ? <Check style={{ width: '10px', height: '10px' }} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: opt.color }} />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Link */}
          <div style={{ marginBottom: '20px' }}>
            <p style={lbl}>Link da Reunião</p>
            <div style={{ position: 'relative' }}>
              <input type="url" placeholder="Sem link disponível" value={link} onChange={(e) => setLink(e.target.value)} style={{ ...inp, paddingLeft: '36px', paddingRight: link ? '36px' : '12px' }} />
              <Link style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: muted, pointerEvents: 'none' }} />
              {link && (
                <button type="button" onClick={copyLink} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: copied ? BRAND : muted, display: 'flex', padding: '2px' }}>
                  {copied ? <Check style={{ width: '13px', height: '13px' }} /> : <Copy style={{ width: '13px', height: '13px' }} />}
                </button>
              )}
            </div>
          </div>

          {/* Attendees */}
          <div>
            <p style={lbl}>Participantes</p>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <input ref={attendeeRef} type="text" placeholder="email@exemplo.com" value={attendee} onChange={(e) => setAttendee(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAttendee() } }} style={{ ...inp, flex: 1 }} />
              <button type="button" onClick={addAttendee} style={{ height: '38px', width: '38px', backgroundColor: BRAND, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
            {attendees.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {attendees.map((a) => (
                  <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, color: text, backgroundColor: inBg, border: `1px solid ${border}`, borderRadius: '999px', padding: '3px 10px 3px 8px' }}>
                    {a}
                    <button type="button" onClick={() => setAttendees((arr) => arr.filter((x) => x !== a))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0, lineHeight: 1, display: 'flex' }}>
                      <X style={{ width: '10px', height: '10px' }} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {owners.length > 0 && (
              <div style={{ backgroundColor: sideBg, borderRadius: '10px', border: `1px solid ${border}`, overflow: 'hidden' }}>
                {owners.map((o, i) => {
                  const already = attendees.includes(o.name) || attendees.includes(o.id)
                  return (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderTop: i > 0 ? `1px solid ${border}` : 'none' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: o.avatar_color ?? '#6b6560', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{o.initials}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: text }}>{o.name}</p>
                        <p style={{ fontSize: '10px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.id}</p>
                      </div>
                      <button type="button" disabled={already} onClick={() => !already && setAttendees((a) => [...a, o.name])}
                        style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '6px', border: `1px solid ${already ? border : `${BRAND}40`}`, backgroundColor: already ? 'transparent' : `${BRAND}0f`, color: already ? muted : BRAND, cursor: already ? 'default' : 'pointer' }}>
                        {already ? 'Adicionado' : 'Adicionar'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button type="button" onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#ef444412', color: '#ef4444', cursor: 'pointer' }}>
            <Trash2 style={{ width: '13px', height: '13px' }} /> Excluir
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} style={{ fontSize: '13px', fontWeight: 600, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px' }}>Cancelar</button>
            <button type="button" disabled={saving} onClick={handleSave}
              style={{ fontSize: '13px', fontWeight: 600, padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: cfg.color, color: '#fff', opacity: saving ? 0.6 : 1, transition: 'opacity 0.15s' }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

interface WeekMeeting {
  id: string; title: string; color: string; bgColor: string
  subtitle?: string; dealId?: string; startMin: number; durationMin: number
  date: string; eventType: string; rawMeeting?: DealMeeting; rawCalEv?: CalendarEvent
}

function WeekView({ weekDays, eventsByDate: _eventsByDate, meetings, calendarEvents, isDark, todayStr, onMeetingOpen, onCalEventOpen, onNewEvent }: {
  weekDays: string[]; eventsByDate: Map<string, CalEvent[]>
  meetings: DealMeeting[]; calendarEvents: CalendarEvent[]
  isDark: boolean; todayStr: string
  onMeetingOpen: (m: DealMeeting) => void
  onCalEventOpen: (ce: CalendarEvent) => void
  onNewEvent: (date: string, time?: string) => void
}) {
  const border = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#5a5752' : '#a09890'
  const totalH = (HOUR_END - HOUR_START) * SLOT_H
  const hours  = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const DS     = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

  const timedPerDay: WeekMeeting[][] = weekDays.map((d) => {
    const evs: WeekMeeting[] = []
    meetings.filter((m) => m.scheduled_at.slice(0, 10) === d).forEach((m) => {
      const t = (m as DealMeeting & { event_type?: string }).event_type ?? 'meeting'
      evs.push({ id: m.id, title: m.title, color: evColor(t), bgColor: evBg(t, isDark), subtitle: m.attendees?.slice(0, 1).join('') ?? undefined, dealId: m.deal_id, startMin: isoToMinutes(m.scheduled_at), durationMin: m.duration_minutes ?? 60, date: d, eventType: t, rawMeeting: m })
    })
    calendarEvents.filter((ce) => ce.event_date === d && ce.start_time).forEach((ce) => {
      evs.push({ id: `ce-${ce.id}`, title: ce.title, color: evColor(ce.event_type), bgColor: evBg(ce.event_type, isDark), subtitle: ce.description ?? undefined, dealId: ce.deal_id ?? undefined, startMin: timeToMinutes(ce.start_time!), durationMin: 60, date: d, eventType: ce.event_type, rawCalEv: ce })
    })
    return evs.sort((a, b) => a.startMin - b.startMin)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', flexShrink: 0, borderBottom: `1px solid ${border}` }}>
        <div />
        {weekDays.map((d, i) => {
          const [, , dd] = d.split('-').map(Number)
          const isToday = d === todayStr
          return (
            <div key={d} style={{ borderLeft: `1px solid ${border}`, padding: '12px 8px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', backgroundColor: isToday ? (isDark ? '#0c1a10' : `${BRAND}08`) : 'transparent' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: isToday ? BRAND : muted }}>{DS[i]}</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: isToday ? BRAND : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: isToday ? '#fff' : text, lineHeight: 1 }}>{dd}</span>
              </div>
              <button type="button" onClick={() => onNewEvent(d)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: isDark ? '#1e1e1c' : '#f0eeea', border: `1px solid ${border}`, cursor: 'pointer' }}>
                <Plus style={{ width: '9px', height: '9px', color: muted }} />
              </button>
            </div>
          )
        })}
      </div>
      {/* Time grid */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', position: 'relative', height: `${totalH}px` }}>
          <div style={{ position: 'relative', borderRight: `1px solid ${border}` }}>
            {hours.map((h) => (
              <div key={h} style={{ position: 'absolute', top: `${(h - HOUR_START) * SLOT_H}px`, left: 0, right: '4px', fontSize: '9px', fontWeight: 600, color: muted, transform: 'translateY(-50%)', textAlign: 'right', userSelect: 'none' }}>{h}:00</div>
            ))}
          </div>
          {weekDays.map((d, ci) => {
            const isToday = d === todayStr
            return (
              <div key={d} style={{ position: 'relative', borderLeft: `1px solid ${border}`, backgroundColor: isToday ? (isDark ? '#0c1a1060' : `${BRAND}05`) : 'transparent' }}>
                {hours.map((h) => (
                  <div key={h} style={{ position: 'absolute', top: `${(h - HOUR_START) * SLOT_H}px`, left: 0, right: 0, height: '1px', backgroundColor: isDark ? '#1a1a18' : '#f0eeea' }} />
                ))}
                {hours.map((h) => (
                  <div key={`hh${h}`} style={{ position: 'absolute', top: `${(h - HOUR_START) * SLOT_H + SLOT_H / 2}px`, left: 0, right: 0, height: '1px', backgroundColor: isDark ? '#141412' : '#f8f7f4' }} />
                ))}
                {isToday && (() => {
                  const now = new Date()
                  const top = ((now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / 60) * SLOT_H
                  if (top < 0 || top > totalH) return null
                  return (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${top}px`, zIndex: 10, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0, marginLeft: '-4px' }} />
                      <div style={{ flex: 1, height: '1.5px', backgroundColor: '#ef4444' }} />
                    </div>
                  )
                })()}
                {timedPerDay[ci].map((ev) => {
                  const top    = ((ev.startMin - HOUR_START * 60) / 60) * SLOT_H
                  const height = Math.max((ev.durationMin / 60) * SLOT_H - 4, 24)
                  if (top < 0 || top > totalH) return null
                  const endMin   = ev.startMin + ev.durationMin
                  const startLbl = `${String(Math.floor(ev.startMin / 60)).padStart(2,'0')}:${String(ev.startMin % 60).padStart(2,'0')}`
                  const endLbl   = `${String(Math.floor(endMin / 60)).padStart(2,'0')}:${String(endMin % 60).padStart(2,'0')}`
                  return (
                    <button key={ev.id} type="button"
                      onClick={() => {
                        if (ev.rawMeeting) { onMeetingOpen(ev.rawMeeting); return }
                        if (ev.rawCalEv)   { onCalEventOpen(ev.rawCalEv); return }
                      }}
                      style={{ position: 'absolute', left: '3px', right: '3px', top: `${top}px`, height: `${height}px`, zIndex: 5, backgroundColor: ev.bgColor, border: `1px solid ${ev.color}40`, borderLeft: `3px solid ${ev.color}`, borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', overflow: 'hidden', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'filter 0.1s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.93)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)' }}>
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: ev.color, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                        {height > 32 && <p style={{ fontSize: '9px', color: `${ev.color}99`, marginTop: '2px', lineHeight: 1 }}>{startLbl} – {endLbl}</p>}
                      </div>
                      {height > 44 && ev.subtitle && <p style={{ fontSize: '9px', color: `${ev.color}80`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.subtitle}</p>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── New Activity Modal ───────────────────────────────────────────────────────

function NewMeetingModal({ defaultDate, onClose, isDark }: { defaultDate: string; onClose: () => void; isDark: boolean }) {
  const deals      = useDealStore((s) => s.deals)
  const addMeeting = useMeetingStore((s) => s.addMeeting)
  const createTask = useTaskStore((s) => s.create)
  const owners     = useOwnerStore((s) => s.owners)
  const authUser   = useAuthStore((s) => s.user)
  const owner      = owners.find((o) => o.id === authUser?.id) ?? owners[0] ?? { id: '', name: 'Desconhecido', initials: '?', avatar_color: '#6b6560' }

  const bg     = isDark ? '#141412' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const inBg   = isDark ? '#0f0f0e' : '#f8f7f4'

  const [evType,    setEvType]    = useState<EventTypeName>('meeting')
  const [title,     setTitle]     = useState('')
  const [dealId,    setDealId]    = useState('')
  const [date,      setDate]      = useState(defaultDate)
  const [time,      setTime]      = useState('09:00')
  const [duration,  setDuration]  = useState('60')
  const [attendee,  setAttendee]  = useState('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [saving,    setSaving]    = useState(false)
  const attendeeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function addAttendee() {
    const val = attendee.trim()
    if (val && !attendees.includes(val)) setAttendees((a) => [...a, val])
    setAttendee(''); attendeeRef.current?.focus()
  }

  async function handleSave() {
    if (!title.trim() || !dealId || !date) return
    setSaving(true)
    try {
      await addMeeting({ deal_id: dealId, title: title.trim(), scheduled_at: `${date}T${time}:00`, duration_minutes: Number(duration) || 60, attendees, owner })
      if (evType === 'meeting' || evType === 'task') {
        createTask({ title: title.trim(), deal_id: dealId, due_date: date, task_type: evType === 'meeting' ? 'meeting' : 'other', priority: 'medium' }).catch(() => {})
      }
      onClose()
    } finally { setSaving(false) }
  }

  const cfg = EVENT_TYPE_CFG[evType] ?? EVENT_TYPE_CFG.meeting
  const inp: React.CSSProperties = { height: '36px', padding: '0 12px', fontSize: '13px', fontWeight: 500, backgroundColor: inBg, border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }
  const canSave = title.trim() && dealId && date

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 24px 80px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: text }}>Nova Atividade</p>
            <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Agenda e sincroniza com tarefas</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px', display: 'flex', borderRadius: '6px' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div>
          <p style={lbl}>Tipo</p>
          <TypePills value={evType} onChange={setEvType} border={border} inBg={inBg} muted={muted} isDark={isDark} />
        </div>

        <div><p style={lbl}>Título *</p>
          <input autoFocus type="text" placeholder={`Ex: ${cfg.label} com cliente`} value={title} onChange={(e) => setTitle(e.target.value)} style={inp} /></div>

        <div><p style={lbl}>Lead *</p>
          <select value={dealId} onChange={(e) => setDealId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">Selecionar lead...</option>
            {deals.filter((d) => !(d as Deal & { deleted_at?: string }).deleted_at).map((d) => (
              <option key={d.id} value={d.id}>{d.company_name} — {d.contact_name ?? d.title}</option>
            ))}
          </select></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div><p style={lbl}>Data *</p>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inp, colorScheme: isDark ? 'dark' : 'light' }} /></div>
          <div><p style={lbl}>Hora</p>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inp, colorScheme: isDark ? 'dark' : 'light' }} /></div>
          <div><p style={lbl}>Duração</p>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {[30,45,60,90,120].map((v) => <option key={v} value={v}>{v}min</option>)}
            </select></div>
        </div>

        <div><p style={lbl}>Participantes</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input ref={attendeeRef} type="text" placeholder="Nome..." value={attendee} onChange={(e) => setAttendee(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAttendee() } }} style={{ ...inp, flex: 1 }} />
            <button type="button" onClick={addAttendee} style={{ height: '36px', padding: '0 12px', backgroundColor: inBg, border: `1px solid ${border}`, borderRadius: '8px', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Plus style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
          {attendees.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
              {attendees.map((a) => (
                <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: BRAND, backgroundColor: `${BRAND}14`, border: `1px solid ${BRAND}30`, borderRadius: '999px', padding: '2px 10px 2px 8px' }}>
                  {a}
                  <button type="button" onClick={() => setAttendees((arr) => arr.filter((x) => x !== a))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND, padding: 0, lineHeight: 1, display: 'flex' }}>
                    <X style={{ width: '10px', height: '10px' }} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px', borderTop: `1px solid ${border}` }}>
          <button type="button" onClick={onClose} style={{ fontSize: '13px', fontWeight: 600, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px' }}>Cancelar</button>
          <button type="button" disabled={saving || !canSave} onClick={handleSave}
            style={{ fontSize: '13px', fontWeight: 600, padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', backgroundColor: canSave ? cfg.color : (isDark ? '#252522' : '#e4e0da'), color: canSave ? '#fff' : muted, transition: 'all 0.15s' }}>
            {saving ? 'Salvando...' : `Criar ${cfg.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Event Modal ──────────────────────────────────────────────────────────────

function EventModal({ state, onClose, isDark, deals, onSaved }: {
  state: ModalState; onClose: () => void; isDark: boolean; deals: Deal[]; onSaved: () => void
}) {
  const isEdit = !!state.event
  const bg     = isDark ? '#141412' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const inBg   = isDark ? '#0f0f0e' : '#f8f7f4'

  const [title,     setTitle]  = useState(state.event?.title ?? '')
  const [desc,      setDesc]   = useState(state.event?.description ?? '')
  const [eventDate, setDate]   = useState(state.event?.event_date ?? state.date ?? '')
  const [startTime, setStart]  = useState(state.event?.start_time ?? state.startTime ?? '')
  const [endTime,   setEnd]    = useState(state.event?.end_time ?? '')
  const [eventType, setType]   = useState<EventTypeName>(state.event?.event_type ?? 'meeting')
  const [dealId,    setDealId] = useState(state.event?.deal_id ?? '')
  const [saving,    setSaving] = useState(false)
  const [deleting,  setDel]    = useState(false)
  const [timeErr,   setTimeErr]= useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    if (!title.trim() || title.trim().length < 2) return
    if (startTime && endTime && endTime <= startTime) { setTimeErr('Término deve ser após o início'); return }
    setTimeErr('')
    setSaving(true)
    try {
      const payload = { title: title.trim(), description: desc.trim() || null, event_date: eventDate, start_time: startTime || null, end_time: endTime || null, event_type: eventType, deal_id: dealId || null }
      if (isEdit && state.event) { await supabase.from('calendar_events').update(payload).eq('id', state.event.id) }
      else { await supabase.from('calendar_events').insert(payload) }
      onSaved(); onClose()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!state.event || !window.confirm('Excluir este evento?')) return
    setDel(true)
    try { await supabase.from('calendar_events').delete().eq('id', state.event.id); onSaved(); onClose() }
    finally { setDel(false) }
  }

  const cfg = EVENT_TYPE_CFG[eventType] ?? EVENT_TYPE_CFG.meeting
  const inp: React.CSSProperties = { height: '36px', padding: '0 12px', fontSize: '13px', fontWeight: 500, backgroundColor: inBg, border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }
  const canSave = title.trim().length >= 2 && eventDate

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 24px 80px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: text }}>{isEdit ? 'Editar Evento' : 'Novo Evento'}</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px', display: 'flex', borderRadius: '6px' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div>
          <p style={lbl}>Tipo</p>
          <TypePills value={eventType} onChange={setType} border={border} inBg={inBg} muted={muted} isDark={isDark} />
        </div>

        <div><p style={lbl}>Título *</p>
          <input autoFocus type="text" placeholder={`Ex: ${cfg.label} com cliente`} value={title} onChange={(e) => setTitle(e.target.value)} style={inp} /></div>

        <div><p style={lbl}>Notas</p>
          <textarea placeholder="Observações opcionais..." value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} style={{ ...inp, height: 'auto', padding: '8px 12px', resize: 'vertical', lineHeight: 1.5 }} /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div style={{ gridColumn: '1/-1' }}><p style={lbl}>Data *</p>
            <input type="date" value={eventDate} onChange={(e) => setDate(e.target.value)} style={{ ...inp, colorScheme: isDark ? 'dark' : 'light' }} /></div>
          <div><p style={lbl}>Início</p>
            <input type="time" value={startTime} onChange={(e) => setStart(e.target.value)} style={{ ...inp, colorScheme: isDark ? 'dark' : 'light' }} /></div>
          <div><p style={lbl}>Término</p>
            <input type="time" value={endTime} onChange={(e) => setEnd(e.target.value)} style={{ ...inp, colorScheme: isDark ? 'dark' : 'light' }} /></div>
        </div>
        {timeErr && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '-8px' }}>{timeErr}</p>}

        <div><p style={lbl}>Lead (opcional)</p>
          <select value={dealId} onChange={(e) => setDealId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">Nenhum</option>
            {deals.filter((d) => !(d as Deal & { deleted_at?: string }).deleted_at).map((d) => (
              <option key={d.id} value={d.id}>{d.title ?? d.company_name}</option>
            ))}
          </select></div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', paddingTop: '4px', borderTop: `1px solid ${border}` }}>
          {isEdit
            ? <button type="button" onClick={handleDelete} disabled={deleting} style={{ fontSize: '12px', fontWeight: 600, padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#ef444415', color: '#ef4444', cursor: deleting ? 'not-allowed' : 'pointer' }}>{deleting ? 'Excluindo...' : 'Excluir'}</button>
            : <span />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} style={{ fontSize: '13px', fontWeight: 600, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px' }}>Cancelar</button>
            <button type="button" disabled={saving || !canSave} onClick={handleSave}
              style={{ fontSize: '13px', fontWeight: 600, padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', backgroundColor: canSave ? cfg.color : (isDark ? '#252522' : '#e4e0da'), color: canSave ? '#fff' : muted, transition: 'all 0.15s' }}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : `Criar ${cfg.label}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const meetings = useMeetingStore((s) => s.meetings)
  const deals    = useDealStore((s) => s.deals)
  const navigate = useNavigate()

  const today    = new Date()
  const todayStr = toDate(today.toISOString())

  const [year,          setYear]          = useState(today.getFullYear())
  const [month,         setMonth]         = useState(today.getMonth())
  const [selectedDay,   setSelectedDay]   = useState(todayStr)
  const [showMeeting,   setShowMeeting]   = useState(false)
  const [calendarEvents, setCE]           = useState<CalendarEvent[]>([])
  const [modalState,    setModalState]    = useState<ModalState | null>(null)
  const [detailMeeting, setDetailMeeting] = useState<DealMeeting | null>(null)
  const [detailCalEv,   setDetailCalEv]   = useState<CalendarEvent | null>(null)

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from('calendar_events').select('*').order('event_date', { ascending: true })
    if (data) setCE(data as CalendarEvent[])
  }, [])
  useEffect(() => { loadEvents() }, [loadEvents])

  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const sideBg = isDark ? '#0e0e0c' : '#f8f7f4'

  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = []
    for (const m of meetings) {
      const t = (m as DealMeeting & { event_type?: string }).event_type ?? 'meeting'
      list.push({ id: m.id, date: toDate(m.scheduled_at), title: m.title, type: 'meeting', color: evColor(t), subtitle: m.attendees?.length ? m.attendees.slice(0, 2).join(', ') : undefined, dealId: m.deal_id, startTime: fmtTime(m.scheduled_at), eventType: t })
    }
    for (const d of deals) {
      if (!d.next_activity?.due_date) continue
      const t = d.next_activity.type ?? 'task'
      list.push({ id: `act-${d.id}`, date: toDate(d.next_activity.due_date), title: d.next_activity.label, type: 'activity', color: evColor(t), subtitle: d.company_name, dealId: d.id, eventType: t })
    }
    for (const ce of calendarEvents) {
      list.push({ id: `ce-${ce.id}`, date: ce.event_date, title: ce.title, type: 'activity', color: evColor(ce.event_type), subtitle: ce.description ?? undefined, dealId: ce.deal_id ?? undefined, startTime: ce.start_time ?? undefined, eventType: ce.event_type })
    }
    return list
  }, [meetings, deals, calendarEvents])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) { const arr = map.get(ev.date) ?? []; arr.push(ev); map.set(ev.date, arr) }
    return map
  }, [events])

  const plus30   = toDate(new Date(today.getTime() + 30 * 86400000).toISOString())
  const upcoming = useMemo(() =>
    events.filter((e) => e.date >= todayStr && e.date <= plus30).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8),
    [events, todayStr, plus30]
  )

  function prevMonth() { if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1) }

  const weekDays = useMemo(() => getWeekDays(selectedDay), [selectedDay])
  function prevWeek() { const d = new Date(selectedDay + 'T12:00:00'); d.setDate(d.getDate() - 7); setSelectedDay(d.toISOString().slice(0, 10)) }
  function nextWeek() { const d = new Date(selectedDay + 'T12:00:00'); d.setDate(d.getDate() + 7); setSelectedDay(d.toISOString().slice(0, 10)) }

  const weekLabel = useMemo(() => {
    if (!weekDays.length) return ''
    const fmt = (d: Date) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(d)
    return `${fmt(new Date(weekDays[0] + 'T12:00:00'))} – ${fmt(new Date(weekDays[6] + 'T12:00:00'))}`
  }, [weekDays])

  useEffect(() => {
    const [y, m] = selectedDay.split('-').map(Number)
    setYear(y); setMonth(m - 1)
  }, [selectedDay])

  function openNewEvent(date: string, time?: string) { setModalState({ open: true, date, startTime: time }) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Calendário</p>
            <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>{upcoming.length} eventos nos próximos 30 dias</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" onClick={prevWeek} style={{ display: 'flex', background: 'none', border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', padding: '4px 7px', color: muted }}>
              <ChevronLeft style={{ width: '13px', height: '13px' }} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, color: text, minWidth: '160px', textAlign: 'center' }}>{weekLabel}</span>
            <button type="button" onClick={nextWeek} style={{ display: 'flex', background: 'none', border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', padding: '4px 7px', color: muted }}>
              <ChevronRight style={{ width: '13px', height: '13px' }} />
            </button>
            {selectedDay !== todayStr && (
              <button type="button" onClick={() => setSelectedDay(todayStr)} style={{ fontSize: '11px', fontWeight: 600, color: BRAND, background: 'none', border: `1px solid ${BRAND}30`, borderRadius: '6px', cursor: 'pointer', padding: '4px 12px' }}>
                Hoje
              </button>
            )}
          </div>
        </div>
        <button type="button" onClick={() => setShowMeeting(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: isDark ? '#e8e4dc' : '#1a1814', color: isDark ? '#0f0e0c' : '#f0ede5', fontSize: '12px', fontWeight: 600, transition: 'opacity 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
          <Plus style={{ width: '13px', height: '13px' }} />
          Nova Atividade
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: '264px', minWidth: '264px', flexShrink: 0, backgroundColor: sideBg, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 14px 14px', flexShrink: 0 }}>
            <MiniCalendar year={year} month={month} selectedDay={selectedDay} eventsByDate={eventsByDate} todayStr={todayStr} isDark={isDark} onSelectDay={setSelectedDay} onPrev={prevMonth} onNext={nextMonth} />
          </div>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
            <p style={{ fontSize: '9px', fontWeight: 700, color: isDark ? '#3a3834' : '#c4bfb8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Tipos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(EVENT_TYPE_CFG).filter(([k]) => k !== 'email').map(([, cfg]) => (
                <div key={cfg.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: 500, color: muted }}>{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
            {upcoming.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '8px' }}>
                <CalendarDays style={{ width: '20px', height: '20px', color: isDark ? '#2e2c28' : '#d0ccc5' }} />
                <p style={{ fontSize: '11px', color: isDark ? '#3a3834' : '#c4bfb8', fontWeight: 500 }}>Sem eventos próximos</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '9px', fontWeight: 700, color: isDark ? '#3a3834' : '#c4bfb8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Próximos eventos</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {upcoming.map((ev) => (
                    <UpcomingCard key={ev.id} ev={ev} isDark={isDark} onClick={ev.dealId ? () => navigate(`/deal/${ev.dealId}`) : undefined} />
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ padding: '12px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
            <button type="button" onClick={() => openNewEvent(selectedDay, roundTime())}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', height: '34px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: muted, transition: 'all 0.12s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? '#1a1a18' : '#f0eeea'; (e.currentTarget as HTMLElement).style.color = text }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = muted }}>
              <Plus style={{ width: '12px', height: '12px' }} />
              Novo evento
            </button>
          </div>
        </div>

        {/* Week View */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: isDark ? '#0c0c0a' : '#ffffff' }}>
          <WeekView
            weekDays={weekDays}
            eventsByDate={eventsByDate}
            meetings={meetings}
            calendarEvents={calendarEvents}
            isDark={isDark}
            todayStr={todayStr}
            onMeetingOpen={(m) => { setDetailMeeting(m); setDetailCalEv(null) }}
            onCalEventOpen={(ce) => { setDetailCalEv(ce); setDetailMeeting(null) }}
            onNewEvent={(date, time) => openNewEvent(date, time ?? roundTime())}
          />
        </div>
      </div>

      {showMeeting && <NewMeetingModal defaultDate={selectedDay} onClose={() => setShowMeeting(false)} isDark={isDark} />}
      {modalState?.open && <EventModal state={modalState} onClose={() => setModalState(null)} isDark={isDark} deals={deals} onSaved={loadEvents} />}
      {detailMeeting && (
        <MeetingDetailPanel
          meeting={detailMeeting}
          isDark={isDark}
          onClose={() => setDetailMeeting(null)}
          onNavigate={(id) => { setDetailMeeting(null); navigate(`/deal/${id}`) }}
        />
      )}
      {detailCalEv && (
        <EventModal
          state={{ open: true, event: detailCalEv }}
          onClose={() => setDetailCalEv(null)}
          isDark={isDark}
          deals={deals}
          onSaved={() => { loadEvents(); setDetailCalEv(null) }}
        />
      )}
    </div>
  )
}
