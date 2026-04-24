import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Mic, Activity, CalendarDays, Plus, X } from 'lucide-react'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { Deal } from '@/types/deal.types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string
  date: string          // 'YYYY-MM-DD'
  title: string
  type: 'meeting' | 'activity'
  color: string
  subtitle?: string
  dealId?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_PT   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function toDate(iso: string): string {
  return iso.slice(0, 10)
}


function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function isSameMonth(date: string, year: number, month: number) {
  const [y, m] = date.split('-').map(Number)
  return y === year && m === month + 1
}

// ─── Activity type color ──────────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<string, string> = {
  meeting: '#2c5545',
  call:    '#7c5c3a',
  task:    '#4a6b8a',
  email:   '#6b4a8a',
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({
  day, events, isSelected, isToday, isOtherMonth,
  onClick, isDark,
}: {
  day: number
  events: CalEvent[]
  isSelected: boolean
  isToday: boolean
  isOtherMonth: boolean
  onClick: () => void
  isDark: boolean
}) {
  const [hovered, setHovered] = useState(false)

  const bg = isSelected
    ? (isDark ? '#2c5545' : '#2c5545')
    : isToday
      ? (isDark ? '#1e2d27' : '#e8f2ee')
      : hovered
        ? (isDark ? '#1e1e1c' : '#f8f7f4')
        : 'transparent'

  const dayColor = isSelected
    ? '#ffffff'
    : isToday
      ? '#2c5545'
      : isOtherMonth
        ? (isDark ? '#3a3834' : '#c4bfb8')
        : (isDark ? '#e8e4dc' : '#1a1814')

  const MAX_DOTS = 3

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '1', width: '100%', borderRadius: '8px',
        backgroundColor: bg, border: isToday && !isSelected ? `1px solid #2c554540` : '1px solid transparent',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '3px',
        padding: '4px', transition: 'background-color 0.1s ease',
        position: 'relative', minHeight: '44px',
      }}
    >
      <span style={{ fontSize: '12px', fontWeight: isToday || isSelected ? 700 : 500, color: dayColor, lineHeight: 1 }}>
        {day}
      </span>
      {events.length > 0 && (
        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {events.slice(0, MAX_DOTS).map((ev, i) => (
            <div key={i} style={{
              width: '5px', height: '5px', borderRadius: '50%',
              backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : ev.color,
            }} />
          ))}
          {events.length > MAX_DOTS && (
            <span style={{ fontSize: '8px', color: isSelected ? 'rgba(255,255,255,0.7)' : (isDark ? '#6b6560' : '#8a857d'), fontWeight: 700 }}>
              +{events.length - MAX_DOTS}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Event list item ──────────────────────────────────────────────────────────

function EventItem({ event, isDark, onDealClick }: { event: CalEvent; isDark: boolean; onDealClick: (id: string) => void }) {
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const cardBg  = isDark ? '#1a1a18' : '#f8f7f4'

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 12px', backgroundColor: cardBg,
      borderRadius: '8px', border: `1px solid ${border}`,
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
        backgroundColor: `${event.color}18`,
        border: `1px solid ${event.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {event.type === 'meeting'
          ? <Mic style={{ width: '12px', height: '12px', color: event.color }} />
          : <Activity style={{ width: '12px', height: '12px', color: event.color }} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: text, lineHeight: 1.3 }}>{event.title}</p>
        {event.subtitle && (
          <button
            type="button"
            onClick={() => event.dealId && onDealClick(event.dealId)}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: '11px', color: event.dealId ? '#2c5545' : muted,
              cursor: event.dealId ? 'pointer' : 'default',
              marginTop: '2px', display: 'block', textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            {event.subtitle}
          </button>
        )}
      </div>
      <span style={{
        fontSize: '9px', fontWeight: 700, color: event.color,
        backgroundColor: `${event.color}14`, borderRadius: '3px',
        padding: '2px 6px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {event.type === 'meeting' ? 'Reunião' : 'Atividade'}
      </span>
    </div>
  )
}

// ─── New Meeting Modal ────────────────────────────────────────────────────────

function NewMeetingModal({ defaultDate, onClose, isDark }: { defaultDate: string; onClose: () => void; isDark: boolean }) {
  const deals      = useDealStore((s) => s.deals)
  const addMeeting = useMeetingStore((s) => s.addMeeting)
  const owners     = useOwnerStore((s) => s.owners)
  const authUser   = useAuthStore((s) => s.user)
  const owner      = owners.find((o) => o.id === authUser?.id) ?? owners[0] ?? { id: '', name: 'Desconhecido', initials: '?', avatar_color: '#6b6560' }

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f8f7f4'
  const cardBg  = isDark ? '#161614' : '#ffffff'

  const [title, setTitle]       = useState('')
  const [dealId, setDealId]     = useState('')
  const [date, setDate]         = useState(defaultDate)
  const [time, setTime]         = useState('09:00')
  const [duration, setDuration] = useState('60')
  const [attendee, setAttendee] = useState('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [saving, setSaving]     = useState(false)
  const attendeeRef = useRef<HTMLInputElement>(null)

  function addAttendee() {
    const val = attendee.trim()
    if (val && !attendees.includes(val)) setAttendees((a) => [...a, val])
    setAttendee('')
    attendeeRef.current?.focus()
  }

  async function handleSave() {
    if (!title.trim() || !dealId || !date) return
    setSaving(true)
    try {
      await addMeeting({
        deal_id: dealId,
        title: title.trim(),
        scheduled_at: `${date}T${time}:00`,
        duration_minutes: Number(duration) || 60,
        attendees,
        owner,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    height: '34px', padding: '0 10px', fontSize: '13px', fontWeight: 500,
    backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px',
    color: text, outline: 'none', width: '100%',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: text }}>Nova Reunião</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Título */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Título *</p>
          <input autoFocus type="text" placeholder="Ex: Alinhamento inicial com Petrobras" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>

        {/* Deal */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Lead *</p>
          <select value={dealId} onChange={(e) => setDealId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Selecionar lead...</option>
            {deals.filter((d) => !(d as Deal & { deleted_at?: string }).deleted_at).map((d) => (
              <option key={d.id} value={d.id}>{d.company_name} — {d.contact_name ?? d.title}</option>
            ))}
          </select>
        </div>

        {/* Data e hora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Data *</p>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Hora</p>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
          </div>
        </div>

        {/* Duração */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Duração (min)</p>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {[30, 45, 60, 90, 120].map((v) => <option key={v} value={v}>{v} min</option>)}
          </select>
        </div>

        {/* Participantes */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Participantes</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              ref={attendeeRef} type="text" placeholder="Nome do participante" value={attendee}
              onChange={(e) => setAttendee(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAttendee() } }}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="button" onClick={addAttendee} style={{ height: '34px', padding: '0 12px', fontSize: '12px', fontWeight: 600, backgroundColor: isDark ? '#1e1e1c' : '#f0eeea', border: `1px solid ${border}`, borderRadius: '6px', color: text, cursor: 'pointer', flexShrink: 0 }}>
              <Plus style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
          {attendees.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '7px' }}>
              {attendees.map((a) => (
                <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#2c5545', backgroundColor: '#2c554514', border: '1px solid #2c554530', borderRadius: '4px', padding: '2px 7px' }}>
                  {a}
                  <button type="button" onClick={() => setAttendees((arr) => arr.filter((x) => x !== a))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2c5545', padding: 0, lineHeight: 1 }}>
                    <X style={{ width: '10px', height: '10px' }} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button type="button" onClick={onClose} style={{ fontSize: '12px', fontWeight: 600, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px' }}>Cancelar</button>
          <button
            type="button" disabled={saving || !title.trim() || !dealId || !date}
            onClick={handleSave}
            style={{
              fontSize: '12px', fontWeight: 600, padding: '6px 16px', borderRadius: '6px', border: 'none',
              backgroundColor: title.trim() && dealId && date ? (isDark ? '#f0ede5' : '#1a1814') : (isDark ? '#2a2a28' : '#e4e0da'),
              color: title.trim() && dealId && date ? (isDark ? '#0f0e0c' : '#f0ede5') : muted,
              cursor: title.trim() && dealId && date ? 'pointer' : 'not-allowed',
            }}
          >{saving ? 'Salvando...' : 'Criar Reunião'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

const HOUR_START = 7   // 7am
const HOUR_END   = 21  // 9pm
const SLOT_H     = 56  // px per hour

function getWeekDays(dateStr: string): string[] {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay() // 0=Sun
  const monday = new Date(d)
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day.toISOString().slice(0, 10)
  })
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function isoToMinutes(isoStr: string): number {
  const t = isoStr.slice(11, 16)
  return timeToMinutes(t)
}

// ─── Week View ────────────────────────────────────────────────────────────────

interface WeekMeeting {
  id: string; title: string; color: string; subtitle?: string; dealId?: string
  startMin: number; durationMin: number; date: string
}

function WeekView({ weekDays, eventsByDate, meetings, isDark, onDayClick, todayStr, onMeetingClick }: {
  weekDays: string[]
  eventsByDate: Map<string, CalEvent[]>
  meetings: import('@/types/deal.types').DealMeeting[]
  isDark: boolean
  todayStr: string
  onDayClick: (d: string) => void
  onMeetingClick: (dealId: string) => void
}) {
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const trackBg = isDark ? '#0f0f0e' : '#f8f7f4'

  const totalH   = (HOUR_END - HOUR_START) * SLOT_H
  const hours    = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const DAYS_SHORT = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

  // All-day events (activities — no time)
  const allDay = weekDays.map((d) =>
    (eventsByDate.get(d) ?? []).filter((e) => e.type === 'activity')
  )

  // Timed meetings per day
  const timedPerDay: WeekMeeting[][] = weekDays.map((d) => {
    return meetings
      .filter((m) => m.scheduled_at.slice(0, 10) === d)
      .map((m) => ({
        id: m.id, title: m.title, color: '#2c5545',
        subtitle: m.attendees?.slice(0, 1).join('') ?? undefined,
        dealId: m.deal_id,
        startMin: isoToMinutes(m.scheduled_at),
        durationMin: m.duration_minutes ?? 60,
        date: d,
      }))
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* All-day row */}
      <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <div style={{ borderRight: `1px solid ${border}`, padding: '6px 0' }} />
        {weekDays.map((d, i) => {
          const [, , dd] = d.split('-').map(Number)
          const isToday  = d === todayStr
          const acts     = allDay[i]
          return (
            <div key={d} style={{ borderRight: i < 6 ? `1px solid ${border}` : 'none', padding: '6px 4px', minHeight: '36px' }}>
              <button type="button" onClick={() => onDayClick(d)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '5px',
                  display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px',
                  backgroundColor: isToday ? '#2c5545' : 'transparent',
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 600, color: isToday ? '#fff' : muted, textTransform: 'uppercase' }}>{DAYS_SHORT[i]}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: isToday ? '#fff' : text }}>{dd}</span>
              </button>
              {acts.map((ev) => (
                <div key={ev.id} title={ev.subtitle ?? ev.title}
                  style={{ fontSize: '9px', fontWeight: 600, color: '#fff', backgroundColor: ev.color, borderRadius: '3px', padding: '1px 5px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Time grid (scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', position: 'relative', height: `${totalH}px` }}>
          {/* Hour labels */}
          <div style={{ position: 'relative', borderRight: `1px solid ${border}` }}>
            {hours.map((h) => (
              <div key={h} style={{ position: 'absolute', top: `${(h - HOUR_START) * SLOT_H}px`, right: '6px', fontSize: '9px', fontWeight: 600, color: muted, transform: 'translateY(-50%)', userSelect: 'none' }}>
                {h}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((d, ci) => {
            const isToday = d === todayStr
            const timed   = timedPerDay[ci]

            return (
              <div key={d} style={{
                position: 'relative', borderRight: ci < 6 ? `1px solid ${border}` : 'none',
                backgroundColor: isToday ? (isDark ? '#0e1a14' : '#f4fbf7') : 'transparent',
              }}>
                {/* Hour lines */}
                {hours.map((h) => (
                  <div key={h} style={{
                    position: 'absolute', top: `${(h - HOUR_START) * SLOT_H}px`,
                    left: 0, right: 0, height: '1px',
                    backgroundColor: isDark ? '#1e1e1c' : '#f0eeea',
                  }} />
                ))}

                {/* Half-hour lines */}
                {hours.map((h) => (
                  <div key={`h${h}`} style={{
                    position: 'absolute', top: `${(h - HOUR_START) * SLOT_H + SLOT_H / 2}px`,
                    left: 0, right: 0, height: '1px',
                    backgroundColor: isDark ? '#181816' : '#f8f7f4',
                  }} />
                ))}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date()
                  const mins = now.getHours() * 60 + now.getMinutes()
                  const top = ((mins - HOUR_START * 60) / 60) * SLOT_H
                  if (top < 0 || top > totalH) return null
                  return (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${top}px`, zIndex: 10, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                      <div style={{ flex: 1, height: '1.5px', backgroundColor: '#ef4444' }} />
                    </div>
                  )
                })()}

                {/* Meeting blocks */}
                {timed.map((ev) => {
                  const topMin  = ev.startMin - HOUR_START * 60
                  const top     = (topMin / 60) * SLOT_H
                  const height  = Math.max((ev.durationMin / 60) * SLOT_H - 2, 20)
                  if (top < 0 || top > totalH) return null
                  return (
                    <button key={ev.id} type="button"
                      onClick={() => ev.dealId && onMeetingClick(ev.dealId)}
                      title={`${ev.title}${ev.subtitle ? ` — ${ev.subtitle}` : ''}`}
                      style={{
                        position: 'absolute', left: '2px', right: '2px',
                        top: `${top}px`, height: `${height}px`, zIndex: 5,
                        backgroundColor: `${ev.color}cc`, border: `1px solid ${ev.color}`,
                        borderRadius: '4px', padding: '2px 5px', cursor: ev.dealId ? 'pointer' : 'default',
                        overflow: 'hidden', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                        {ev.title}
                      </span>
                      {height > 28 && ev.subtitle && (
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.subtitle}
                        </span>
                      )}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const meetings = useMeetingStore((s) => s.meetings)
  const deals    = useDealStore((s) => s.deals)
  const navigate = useNavigate()

  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string>(toDate(today.toISOString()))
  const [showNewMeeting, setShowNewMeeting] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'

  // ── Build event list ────────────────────────────────────────────────────────
  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = []

    for (const m of meetings) {
      list.push({
        id: m.id,
        date: toDate(m.scheduled_at),
        title: m.title,
        type: 'meeting',
        color: '#2c5545',
        subtitle: m.attendees?.length ? m.attendees.slice(0, 2).join(', ') : undefined,
        dealId: m.deal_id,
      })
    }

    for (const d of deals) {
      if (!d.next_activity?.due_date) continue
      list.push({
        id: `act-${d.id}`,
        date: toDate(d.next_activity.due_date),
        title: d.next_activity.label,
        type: 'activity',
        color: ACTIVITY_COLORS[d.next_activity.type] ?? '#4a6b8a',
        subtitle: d.company_name,
        dealId: d.id,
      })
    }

    return list
  }, [meetings, deals])

  // ── Group events by date ────────────────────────────────────────────────────
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) {
      const arr = map.get(ev.date) ?? []
      arr.push(ev)
      map.set(ev.date, arr)
    }
    return map
  }, [events])

  // ── Calendar grid ───────────────────────────────────────────────────────────
  const daysInMonth  = getDaysInMonth(year, month)
  const firstWeekday = getFirstWeekday(year, month)
  const prevMonthDays = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1)

  const cells: { day: number; year: number; month: number }[] = []

  // Prev month overflow
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month - 1 < 0 ? 11 : month - 1
    const y = month - 1 < 0 ? year - 1 : year
    cells.push({ day: d, year: y, month: m })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, year, month })
  }

  // Next month overflow to fill last row
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
  for (let d = 1; d <= remaining; d++) {
    const m = month + 1 > 11 ? 0 : month + 1
    const y = month + 1 > 11 ? year + 1 : year
    cells.push({ day: d, year: y, month: m })
  }

  // ── Selected day events ────────────────────────────────────────────────────
  const selectedEvents = eventsByDate.get(selectedDay) ?? []

  // ── Upcoming (next 30 days from today) ─────────────────────────────────────
  const todayStr = toDate(today.toISOString())
  const plus30   = toDate(new Date(today.getTime() + 30 * 86400000).toISOString())
  const upcoming = useMemo(() =>
    events
      .filter((e) => e.date >= todayStr && e.date <= plus30)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8),
    [events, todayStr, plus30]
  )

  // ── Navigation ──────────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  // ── Format selected day label ───────────────────────────────────────────────
  const [sy, sm, sd] = selectedDay.split('-').map(Number)
  const selectedLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(sy, sm - 1, sd))

  // ── Week navigation ─────────────────────────────────────────────────────────
  const weekDays = useMemo(() => getWeekDays(selectedDay), [selectedDay])

  function prevWeek() {
    const d = new Date(selectedDay + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    setSelectedDay(d.toISOString().slice(0, 10))
  }
  function nextWeek() {
    const d = new Date(selectedDay + 'T12:00:00')
    d.setDate(d.getDate() + 7)
    setSelectedDay(d.toISOString().slice(0, 10))
  }

  const weekLabel = useMemo(() => {
    if (!weekDays.length) return ''
    const first = new Date(weekDays[0] + 'T12:00:00')
    const last  = new Date(weekDays[6] + 'T12:00:00')
    const fmt   = (d: Date) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(d)
    return `${fmt(first)} – ${fmt(last)}`
  }, [weekDays])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Calendário</p>
            <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
              {events.length} evento{events.length !== 1 ? 's' : ''} · {upcoming.length} nos próximos 30 dias
            </p>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', backgroundColor: isDark ? '#111110' : '#f0eeea', borderRadius: '7px', padding: '2px', gap: '1px' }}>
            {(['month', 'week'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setViewMode(mode)}
                style={{
                  fontSize: '11px', fontWeight: viewMode === mode ? 700 : 500,
                  color: viewMode === mode ? text : muted,
                  backgroundColor: viewMode === mode ? (isDark ? '#1e1e1c' : '#fff') : 'transparent',
                  border: viewMode === mode ? `1px solid ${border}` : '1px solid transparent',
                  borderRadius: '5px', padding: '4px 12px', cursor: 'pointer', transition: 'all 0.12s ease',
                }}
              >{mode === 'month' ? 'Mês' : 'Semana'}</button>
            ))}
          </div>

          {/* Week label when in week mode */}
          {viewMode === 'week' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button type="button" onClick={prevWeek} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '5px', cursor: 'pointer', padding: '3px 6px', color: muted, display: 'flex' }}>
                <ChevronLeft style={{ width: '13px', height: '13px' }} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: 600, color: text, minWidth: '140px', textAlign: 'center' }}>{weekLabel}</span>
              <button type="button" onClick={nextWeek} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '5px', cursor: 'pointer', padding: '3px 6px', color: muted, display: 'flex' }}>
                <ChevronRight style={{ width: '13px', height: '13px' }} />
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowNewMeeting(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600,
            color: isDark ? '#e8e4dc' : '#1a1814', backgroundColor: isDark ? '#1e1e1c' : '#f0eeea',
            border: `1px solid ${border}`, borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
          }}
        >
          <Plus style={{ width: '12px', height: '12px' }} />
          Nova Reunião
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── Week view ── */}
        {viewMode === 'week' && (
          <WeekView
            weekDays={weekDays}
            eventsByDate={eventsByDate}
            meetings={meetings}
            isDark={isDark}
            todayStr={todayStr}
            onDayClick={(d) => { setSelectedDay(d); setViewMode('month') }}
            onMeetingClick={(dealId) => navigate(`/deal/${dealId}`)}
          />
        )}

        {/* ── Left: calendar grid ── */}
        {viewMode === 'month' && <>
        <div style={{ flex: '0 0 auto', width: '380px', display: 'flex', flexDirection: 'column', padding: '16px', borderRight: `1px solid ${border}`, overflowY: 'auto' }}>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: muted, display: 'flex' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#1e1e1c' : '#f0eeea')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ChevronLeft style={{ width: '16px', height: '16px' }} />
            </button>
            <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>
              {MONTHS_PT[month]} {year}
            </p>
            <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: muted, display: 'flex' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#1e1e1c' : '#f0eeea')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Day names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
            {DAYS_PT.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {cells.map((cell, i) => {
              const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
              const cellEvents = eventsByDate.get(dateStr) ?? []
              const isOther   = !isSameMonth(dateStr, year, month)
              const isToday   = dateStr === todayStr
              const isSel     = dateStr === selectedDay
              return (
                <DayCell
                  key={i}
                  day={cell.day}
                  events={cellEvents}
                  isSelected={isSel}
                  isToday={isToday}
                  isOtherMonth={isOther}
                  isDark={isDark}
                  onClick={() => setSelectedDay(dateStr)}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            {[
              { color: '#2c5545', label: 'Reunião' },
              { color: '#7c5c3a', label: 'Ligação' },
              { color: '#4a6b8a', label: 'Tarefa' },
              { color: '#6b4a8a', label: 'E-mail' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                <span style={{ fontSize: '10px', color: muted }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: side panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Selected day */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text, textTransform: 'capitalize' }}>{selectedLabel}</p>
            <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
              {selectedEvents.length > 0 ? `${selectedEvents.length} evento${selectedEvents.length > 1 ? 's' : ''}` : 'Nenhum evento'}
            </p>
          </div>

          <div style={{ padding: '12px 20px', flex: 1, overflowY: 'auto' }}>
            {selectedEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {selectedEvents.map((ev) => (
                  <EventItem key={ev.id} event={ev} isDark={isDark} onDealClick={(id) => navigate(`/deal/${id}`)} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: '8px', marginBottom: '24px' }}>
                <CalendarDays style={{ width: '24px', height: '24px', color: isDark ? '#3a3834' : '#c4bfb8' }} />
                <p style={{ fontSize: '12px', color: muted, fontWeight: 500 }}>Nenhum evento neste dia</p>
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                  Próximos 30 dias
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {upcoming.map((ev) => {
                    const [ey, em, ed] = ev.date.split('-').map(Number)
                    return (
                      <div key={ev.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', borderRadius: '7px',
                        backgroundColor: isDark ? '#161614' : '#ffffff',
                        border: `1px solid ${border}`,
                      }}>
                        <div style={{
                          width: '36px', flexShrink: 0, textAlign: 'center',
                          padding: '4px 0', borderRadius: '6px',
                          backgroundColor: `${ev.color}14`,
                        }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: ev.color, lineHeight: 1 }}>{ed}</p>
                          <p style={{ fontSize: '9px', color: ev.color, fontWeight: 600, textTransform: 'uppercase' }}>
                            {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(ey, em - 1, ed))}
                          </p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.title}
                          </p>
                          {ev.subtitle && (
                            <p style={{ fontSize: '10px', color: muted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.subtitle}
                            </p>
                          )}
                        </div>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, color: ev.color,
                          backgroundColor: `${ev.color}14`, borderRadius: '3px',
                          padding: '2px 6px', flexShrink: 0, textTransform: 'uppercase',
                        }}>
                          {ev.type === 'meeting' ? 'Reunião' : 'Ativ.'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
        </>}
      </div>

      {showNewMeeting && (
        <NewMeetingModal
          defaultDate={selectedDay}
          onClose={() => setShowNewMeeting(false)}
          isDark={isDark}
        />
      )}
    </div>
  )
}
