import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, ChevronDown, ChevronRight, ExternalLink, Clock, Users, CheckSquare } from 'lucide-react'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import type { DealMeeting } from '@/types/deal.types'

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

// ─── Transcript block ──────────────────────────────────────────────────────────

function TranscriptBlock({ text, isDark }: { text: string; isDark: boolean }) {
  const bg     = isDark ? '#111110' : '#f5f4f0'
  const border = isDark ? '#242422' : '#e4e0da'
  const color  = isDark ? '#c8c4bc' : '#3a3630'

  return (
    <div style={{
      backgroundColor: bg, border: `1px solid ${border}`,
      borderRadius: '6px', padding: '12px 14px', marginTop: '10px',
    }}>
      <p style={{ fontSize: '9px', fontWeight: 700, color: isDark ? '#4a4a48' : '#a09890', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
        Transcrição — Plaud Note
      </p>
      <p style={{ fontSize: '12px', color, lineHeight: 1.65, fontStyle: 'italic' }}>
        "{text}"
      </p>
    </div>
  )
}

// ─── Meeting card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting, isDark }: { meeting: DealMeeting; isDark: boolean }) {
  const [expanded, setExpanded]             = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const navigate = useNavigate()

  const deal    = useDealStore((s) => s.deals.find((d) => d.id === meeting.deal_id))
  const cardBg  = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const hoverBg = isDark ? '#1c1c1a' : '#f8f7f4'
  const tagBg   = isDark ? '#1e1e1c' : '#f0eeea'

  return (
    <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>

      {/* ── Header row ── */}
      <div
        style={{ padding: '16px 18px', cursor: 'pointer', transition: 'background-color 0.1s ease' }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
            backgroundColor: meeting.plaud_note_id ? '#2c554514' : tagBg,
            border: `1px solid ${meeting.plaud_note_id ? '#2c554530' : border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic style={{ width: '16px', height: '16px', color: meeting.plaud_note_id ? '#2c5545' : muted }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>{meeting.title}</p>
              {meeting.plaud_note_id && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, color: '#2c5545',
                  backgroundColor: '#2c554514', border: '1px solid #2c554530',
                  borderRadius: '3px', padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  Plaud Note
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: muted }}>
                <Clock style={{ width: '10px', height: '10px' }} />
                {fmtDateTime(meeting.scheduled_at)} · {meeting.duration_minutes}min
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: muted }}>
                <Users style={{ width: '10px', height: '10px' }} />
                {meeting.attendees?.length ?? 0} participantes
              </span>
              {deal && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(`/deal/${deal.id}`) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    fontSize: '11px', fontWeight: 600, color: '#2c5545',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  {deal.company_name}
                  <ExternalLink style={{ width: '9px', height: '9px' }} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              backgroundColor: meeting.owner.avatar_color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '7px', fontWeight: 700,
            }}>
              {meeting.owner.initials}
            </div>
            {expanded
              ? <ChevronDown style={{ width: '14px', height: '14px', color: muted }} />
              : <ChevronRight style={{ width: '14px', height: '14px', color: muted }} />}
          </div>
        </div>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${border}`, padding: '16px 18px' }}>
          {meeting.ai_summary && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Resumo IA</p>
              <p style={{ fontSize: '13px', color: text, lineHeight: 1.6 }}>{meeting.ai_summary}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {meeting.key_points && meeting.key_points.length > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Pontos Principais</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {meeting.key_points.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2c5545', flexShrink: 0, marginTop: '6px' }} />
                      <p style={{ fontSize: '12px', color: text, lineHeight: 1.5 }}>{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {meeting.action_items && meeting.action_items.length > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Próximas Ações</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {meeting.action_items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                      <CheckSquare style={{ width: '11px', height: '11px', color: '#2d9e6b', flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontSize: '12px', color: text, lineHeight: 1.5 }}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {meeting.attendees && meeting.attendees.length > 0 && (
            <div style={{ marginBottom: meeting.transcript_excerpt ? '12px' : 0 }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Participantes</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {meeting.attendees.map((a) => (
                  <span key={a} style={{ fontSize: '11px', color: text, fontWeight: 500, backgroundColor: tagBg, borderRadius: '4px', padding: '2px 8px' }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {meeting.transcript_excerpt && (
            <div>
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#2c5545', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '4px' }}
              >
                <Mic style={{ width: '11px', height: '11px' }} />
                {showTranscript ? 'Ocultar transcrição' : 'Ver transcrição Plaud'}
              </button>
              {showTranscript && <TranscriptBlock text={meeting.transcript_excerpt} isDark={isDark} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MeetingsPage() {
  const isDark    = useThemeStore((s) => s.isDark)
  const meetings  = useMeetingStore((s) => s.meetings)

  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'

  const withPlaud = meetings.filter((m) => m.plaud_note_id).length
  const sorted    = [...meetings].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Reuniões</p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
            {meetings.length} reuniões · {withPlaud} com transcrição Plaud
          </p>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          fontSize: '11px', fontWeight: 600, color: '#2c5545',
          backgroundColor: '#2c554514', border: '1px solid #2c554530',
          borderRadius: '6px', padding: '5px 10px',
        }}>
          <Mic style={{ width: '12px', height: '12px' }} />
          {withPlaud} transcrições Plaud
        </span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px', textAlign: 'center' }}>
            <Mic style={{ width: '28px', height: '28px', color: border }} />
            <p style={{ fontSize: '13px', fontWeight: 600, color: muted }}>Nenhuma reunião registrada</p>
            <p style={{ fontSize: '12px', color: isDark ? '#3a3834' : '#c4bfb8' }}>
              Reuniões adicionadas via DealDetail aparecerão aqui
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Recentes — {fmtDate(new Date().toISOString())}
            </p>
            {sorted.map((m) => (
              <MeetingCard key={m.id} meeting={m} isDark={isDark} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
