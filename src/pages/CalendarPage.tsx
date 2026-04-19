import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Mic, Activity, CalendarDays } from 'lucide-react'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Calendário</p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
            {events.length} evento{events.length !== 1 ? 's' : ''} · {upcoming.length} nos próximos 30 dias
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600,
          color: '#2c5545', backgroundColor: '#2c554514',
          border: '1px solid #2c554530', borderRadius: '6px', padding: '5px 10px',
        }}>
          <CalendarDays style={{ width: '12px', height: '12px' }} />
          {meetings.length} reuniões
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: calendar grid ── */}
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
      </div>
    </div>
  )
}
