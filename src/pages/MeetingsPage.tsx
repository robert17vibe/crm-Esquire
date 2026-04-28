import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, ChevronDown, ChevronRight, ExternalLink, Clock, Users, CheckSquare, Plus, X, Square } from 'lucide-react'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { supabase } from '@/lib/supabase'
import { PageEmptyState, PageLoadingState } from '@/components/ui/PageState'
import type { DealMeeting } from '@/types/deal.types'

// â”€â”€â”€ Checklist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CHECKLIST = [
  { id: 'apresentacao',  text: 'Fez apresentaÃ§Ã£o da empresa/produto',     weight: 1.5 },
  { id: 'dor',           text: 'Identificou dor/necessidade principal',    weight: 2.0 },
  { id: 'decisor',       text: 'Falou com decisor ou influenciador chave', weight: 2.0 },
  { id: 'orcamento',     text: 'Validou orÃ§amento disponÃ­vel',             weight: 1.5 },
  { id: 'timeline',      text: 'Definiu timeline de decisÃ£o',              weight: 1.0 },
  { id: 'concorrentes',  text: 'Identificou concorrentes avaliados',       weight: 1.0 },
  { id: 'proximo_passo', text: 'Agendou prÃ³ximo passo concreto',           weight: 1.0 },
]

const TOTAL_WEIGHT = CHECKLIST.reduce((s, i) => s + i.weight, 0)

function computeScore(checked: Set<string>) {
  const done = CHECKLIST.filter((i) => checked.has(i.id)).reduce((s, i) => s + i.weight, 0)
  return TOTAL_WEIGHT > 0 ? Math.round((done / TOTAL_WEIGHT) * 10 * 10) / 10 : 0
}

// â”€â”€â”€ Modal de Registo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MeetingRecordModal({ onClose, onSaved, isDark }: { onClose: () => void; onSaved: () => void; isDark: boolean }) {
  const deals      = useVisibleDeals()
  const activeDeals = useMemo(() =>
    deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id)),
    [deals]
  )

  const [dealId,       setDealId]       = useState('')
  const [meetingDate,  setMeetingDate]  = useState(new Date().toISOString().slice(0, 16))
  const [checked,      setChecked]      = useState<Set<string>>(new Set())
  const [notes,        setNotes]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const bg      = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#2a2a28' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f8f7f4'

  function toggle(id: string) {
    setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleSave() {
    if (!dealId) { setError('Seleciona um lead'); return }
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const score = computeScore(checked)
      const { error: err } = await supabase.from('meeting_records').insert({
        deal_id: dealId,
        meeting_date: new Date(meetingDate).toISOString(),
        completed_items: [...checked],
        score,
        notes: notes.trim() || null,
      })
      if (err) throw err
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  const score      = computeScore(checked)
  const scoreColor = score >= 7 ? '#16a34a' : score >= 4 ? '#d97706' : '#dc2626'
  const done       = checked.size

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ width: 'min(520px, 94vw)', maxHeight: '88vh', overflowY: 'auto', backgroundColor: bg, borderRadius: '12px', border: `1px solid ${border}`, boxShadow: '0 24px 60px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e31e2414', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mic style={{ width: '15px', height: '15px', color: '#e31e24' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Registar ReuniÃ£o</p>
              <p style={{ fontSize: '10px', color: muted }}>AvaliaÃ§Ã£o manual pÃ³s-reuniÃ£o</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Lead selector */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Lead *</label>
            <select
              value={dealId}
              onChange={(e) => { setDealId(e.target.value); setError('') }}
              style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${error && !dealId ? '#dc2626' : border}`, borderRadius: '6px', color: dealId ? text : muted, outline: 'none' }}
            >
              <option value="">Seleciona um lead...</option>
              {activeDeals.map((d) => (
                <option key={d.id} value={d.id}>{d.title}{d.company_name ? ` â€” ${d.company_name}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Data da ReuniÃ£o</label>
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Score badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: isDark ? '#111110' : '#f8f7f4', border: `1px solid ${border}` }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: muted }}>{done}/{CHECKLIST.length} itens concluÃ­dos</span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: scoreColor, letterSpacing: '-0.02em' }}>{score.toFixed(1)} <span style={{ fontSize: '10px', fontWeight: 500 }}>/ 10</span></span>
          </div>

          {/* Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CHECKLIST.map((item) => {
              const isChecked = checked.has(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${isChecked ? '#16a34a40' : border}`, backgroundColor: isChecked ? (isDark ? '#14532d18' : '#f0fdf4') : inputBg, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
                >
                  {isChecked
                    ? <CheckSquare style={{ width: '15px', height: '15px', color: '#16a34a', flexShrink: 0 }} />
                    : <Square style={{ width: '15px', height: '15px', color: muted, flexShrink: 0 }} />
                  }
                  <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: isChecked ? (isDark ? '#86efac' : '#15803d') : text }}>{item.text}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: muted, backgroundColor: isDark ? '#ffffff10' : '#00000008', borderRadius: '3px', padding: '2px 5px', flexShrink: 0 }}>Ã—{item.weight}</span>
                </button>
              )
            })}
          </div>

          {/* Notas */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ObservaÃ§Ãµes, prÃ³ximos passos, contexto..."
              rows={3}
              style={{ width: '100%', padding: '10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>{error}</p>}

          {/* AÃ§Ãµes */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ height: '36px', padding: '0 16px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ height: '36px', padding: '0 20px', borderRadius: '6px', border: 'none', backgroundColor: '#e31e24', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'A guardar...' : 'Guardar Registo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

// â”€â”€â”€ Transcript block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TranscriptBlock({ text, isDark }: { text: string; isDark: boolean }) {
  const bg     = isDark ? '#111110' : '#f5f4f0'
  const border = isDark ? '#242422' : '#e4e0da'
  const color  = isDark ? '#c8c4bc' : '#3a3630'

  return (
    <div style={{
      backgroundColor: bg, border: `1px solid ${border}`,
      borderRadius: '4px', padding: '12px 14px', marginTop: '10px',
    }}>
      <p style={{ fontSize: '9px', fontWeight: 700, color: isDark ? '#4a4a48' : '#a09890', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
        TranscriÃ§Ã£o â€” Plaud Note
      </p>
      <p style={{ fontSize: '12px', color, lineHeight: 1.65, fontStyle: 'italic' }}>
        "{text}"
      </p>
    </div>
  )
}

// â”€â”€â”€ Meeting card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '6px', overflow: 'hidden' }}>

      {/* â”€â”€ Header row â”€â”€ */}
      <div
        style={{ padding: '16px 18px', cursor: 'pointer', transition: 'background-color 0.1s ease' }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
            backgroundColor: meeting.plaud_note_id ? '#e31e2414' : tagBg,
            border: `1px solid ${meeting.plaud_note_id ? '#e31e2430' : border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic style={{ width: '16px', height: '16px', color: meeting.plaud_note_id ? '#e31e24' : muted }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>{meeting.title}</p>
              {meeting.plaud_note_id && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, color: '#e31e24',
                  backgroundColor: '#e31e2414', border: '1px solid #e31e2430',
                  borderRadius: '3px', padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  Plaud Note
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: muted }}>
                <Clock style={{ width: '10px', height: '10px' }} />
                {fmtDateTime(meeting.scheduled_at)} Â· {meeting.duration_minutes}min
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
                    fontSize: '11px', fontWeight: 600, color: '#e31e24',
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

      {/* â”€â”€ Expanded content â”€â”€ */}
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
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#e31e24', flexShrink: 0, marginTop: '6px' }} />
                      <p style={{ fontSize: '12px', color: text, lineHeight: 1.5 }}>{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {meeting.action_items && meeting.action_items.length > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>PrÃ³ximas AÃ§Ãµes</p>
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
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#e31e24', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '4px' }}
              >
                <Mic style={{ width: '11px', height: '11px' }} />
                {showTranscript ? 'Ocultar transcriÃ§Ã£o' : 'Ver transcriÃ§Ã£o Plaud'}
              </button>
              {showTranscript && <TranscriptBlock text={meeting.transcript_excerpt} isDark={isDark} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function MeetingsPage() {
  const isDark    = useThemeStore((s) => s.isDark)
  const allMeetings    = useMeetingStore((s) => s.meetings)
  const meetingsLoading = useMeetingStore((s) => s.isLoading)
  const meetingsInitialized = useMeetingStore((s) => s.initialized)
  const allDeals       = useDealStore((s) => s.deals)
  const impersonatedId = useImpersonationStore((s) => s.impersonatedId)
  const [showRecord, setShowRecord] = useState(false)
  const [recordKey, setRecordKey]   = useState(0)

  const meetings = impersonatedId
    ? allMeetings.filter((m) => {
        const deal = allDeals.find((d) => d.id === m.deal_id)
        return deal?.owner_id === impersonatedId
      })
    : allMeetings

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
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ReuniÃµes</p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
            {meetings.length} reuniÃµes Â· {withPlaud} com transcriÃ§Ã£o Plaud
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {withPlaud > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#e31e24', backgroundColor: '#e31e2414', border: '1px solid #e31e2430', borderRadius: '6px', padding: '5px 10px' }}>
              <Mic style={{ width: '12px', height: '12px' }} />
              {withPlaud} Plaud
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowRecord(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 14px', borderRadius: '6px', border: 'none', backgroundColor: '#e31e24', color: '#fff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Plus style={{ width: '13px', height: '13px' }} />
            Registar ReuniÃ£o
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {meetingsLoading || !meetingsInitialized ? (
          <PageLoadingState
            title="Carregando reuniões"
            description="Estamos reunindo os registros e as transcrições disponíveis."
          />
        ) : sorted.length === 0 ? (
          <PageEmptyState
            icon={<Mic style={{ width: '28px', height: '28px', color: '#e31e24' }} />}
            title="Nenhuma reunião registrada"
            description="Registre a primeira reunião para começar a acompanhar resumos, participantes e próximos passos."
            action={
              <button
                type="button"
                onClick={() => setShowRecord(true)}
                style={{ fontSize: '12px', fontWeight: 600, color: '#e31e24', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}
              >
                Registrar reunião
              </button>
            }
          />
        ) : (
          <>
            <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Recentes â€” {fmtDate(new Date().toISOString())}
            </p>
            {sorted.map((m) => (
              <MeetingCard key={m.id} meeting={m} isDark={isDark} />
            ))}
          </>
        )}
      </div>

      {showRecord && (
        <MeetingRecordModal
          key={recordKey}
          isDark={isDark}
          onClose={() => setShowRecord(false)}
          onSaved={() => { setShowRecord(false); setRecordKey((k) => k + 1) }}
        />
      )}
    </div>
  )
}

