import { useState, useEffect } from 'react'
import { X, CheckSquare, Square } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/store/useThemeStore'

const DEFAULT_CHECKLIST = [
  { id: 'apresentacao',  text: 'Fez apresentação da empresa/produto',  weight: 1.5 },
  { id: 'dor',           text: 'Identificou dor/necessidade principal', weight: 2.0 },
  { id: 'decisor',       text: 'Falou com decisor ou influenciador chave', weight: 2.0 },
  { id: 'orcamento',     text: 'Validou orçamento disponível',          weight: 1.5 },
  { id: 'timeline',      text: 'Definiu timeline de decisão',           weight: 1.0 },
  { id: 'concorrentes',  text: 'Identificou concorrentes avaliados',    weight: 1.0 },
  { id: 'proximo_passo', text: 'Agendou próximo passo concreto',        weight: 1.0 },
]

interface Props {
  dealId: string
  onClose: () => void
  onSaved: () => void
}

export function MeetingRecordModal({ dealId, onClose, onSaved }: Props) {
  const isDark = useThemeStore((s) => s.isDark)
  const [checked, setChecked]     = useState<Set<string>>(new Set())
  const [notes, setNotes]         = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 16))
  const [saving, setSaving]       = useState(false)
  const [templateId, setTemplateId] = useState<string | null>(null)

  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#2a2a28' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f8f7f4'

  // Try to fetch template from DB; fallback to default
  useEffect(() => {
    supabase.from('meeting_checklist_templates').select('id').eq('is_active', true).limit(1).maybeSingle()
      .then(({ data }) => { if (data) setTemplateId(data.id) })
  }, [])

  function toggleItem(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function computeScore(): number {
    const totalWeight = DEFAULT_CHECKLIST.reduce((s, i) => s + i.weight, 0)
    const doneWeight  = DEFAULT_CHECKLIST.filter((i) => checked.has(i.id)).reduce((s, i) => s + i.weight, 0)
    return totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 10 * 10) / 10 : 0
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const score = computeScore()
      const { error } = await supabase.from('meeting_records').insert({
        deal_id: dealId,
        meeting_date: new Date(meetingDate).toISOString(),
        template_id: templateId,
        completed_items: [...checked],
        score,
        notes: notes.trim() || null,
      })
      if (error) throw error
      onSaved()
      onClose()
    } catch (err) {
      console.error('[MeetingRecord]', err)
    } finally {
      setSaving(false)
    }
  }

  const score = computeScore()
  const scoreColor = score >= 7 ? '#16a34a' : score >= 4 ? '#d97706' : '#dc2626'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: 'min(520px, 94vw)', maxHeight: '88vh',
        backgroundColor: bg, borderRadius: '12px',
        border: `1px solid ${border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>Registar Reunião</p>
            <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Checklist de qualidade comercial</p>
          </div>
          <button type="button" onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted }}>
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        {/* Score badge */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, backgroundColor: isDark ? '#111110' : '#fafaf8' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: scoreColor, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{score.toFixed(1)}</span>
            <span style={{ fontSize: '12px', color: muted }}>/10</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: '6px', borderRadius: '999px', backgroundColor: isDark ? '#ffffff12' : '#00000010', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score * 10}%`, backgroundColor: scoreColor, borderRadius: '999px', transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ fontSize: '10px', color: muted, marginTop: '4px' }}>
              {checked.size} de {DEFAULT_CHECKLIST.length} itens · {score >= 7 ? 'Reunião qualificada' : score >= 4 ? 'Reunião parcial' : 'Necessita melhoria'}
            </p>
          </div>
        </div>

        {/* Checklist */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {DEFAULT_CHECKLIST.map((item) => {
              const done = checked.has(item.id)
              return (
                <button key={item.id} type="button" onClick={() => toggleItem(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                    backgroundColor: done ? (isDark ? 'rgba(22,163,74,0.08)' : '#f0fdf4') : inputBg,
                    border: `1px solid ${done ? '#16a34a30' : border}`,
                    textAlign: 'left', transition: 'all 0.12s ease',
                  }}>
                  {done
                    ? <CheckSquare style={{ width: '16px', height: '16px', color: '#16a34a', flexShrink: 0 }} />
                    : <Square style={{ width: '16px', height: '16px', color: muted, flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: '12px', fontWeight: done ? 600 : 400, color: done ? text : muted, flex: 1 }}>{item.text}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: muted, backgroundColor: isDark ? '#ffffff08' : '#00000008', borderRadius: '4px', padding: '2px 5px' }}>
                    ×{item.weight}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Date + notes */}
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Data da Reunião</p>
              <input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
                style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Notas</p>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resumo, próximos passos..."
                style={{ width: '100%', height: '72px', padding: '8px 10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${border}`, display: 'flex', gap: '8px', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ height: '34px', padding: '0 16px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: 'transparent', fontSize: '12px', fontWeight: 600, color: muted, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ height: '34px', padding: '0 20px', borderRadius: '6px', border: 'none', backgroundColor: '#e31e24', fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'A guardar...' : 'Guardar Reunião'}
          </button>
        </div>
      </div>
    </div>
  )
}
