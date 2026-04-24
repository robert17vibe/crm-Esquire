import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Pencil, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/store/useToastStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type StakeholderRole = 'economic_buyer' | 'technical_buyer' | 'champion' | 'influencer' | 'blocker' | 'user'
type Relationship    = 'strong' | 'moderate' | 'weak' | 'unknown'
type Sentiment       = 'positive' | 'neutral' | 'negative' | 'unknown'

interface RichStakeholder {
  id: string
  deal_id: string
  name: string
  title?: string
  company?: string
  email?: string
  role: StakeholderRole
  influence_level: number
  relationship: Relationship
  sentiment: Sentiment
  notes?: string
  last_interaction_at?: string
  avatar_color?: string
  initials?: string
  created_at: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<StakeholderRole, { label: string; icon: string; color: string; bg: string }> = {
  economic_buyer:  { label: 'Decisor Econômico', icon: '💰', color: '#7c3aed', bg: '#ede9fe' },
  technical_buyer: { label: 'Decisor Técnico',   icon: '⚙️', color: '#1d4ed8', bg: '#dbeafe' },
  champion:        { label: 'Champion',           icon: '🏆', color: '#16a34a', bg: '#dcfce7' },
  influencer:      { label: 'Influenciador',      icon: '🎯', color: '#d97706', bg: '#fef3c7' },
  blocker:         { label: 'Bloqueador',         icon: '🚫', color: '#dc2626', bg: '#fee2e2' },
  user:            { label: 'Usuário Final',      icon: '👤', color: '#6b7280', bg: '#f3f4f6' },
}

const REL_CFG: Record<Relationship, { label: string; color: string }> = {
  strong:   { label: 'Forte',        color: '#16a34a' },
  moderate: { label: 'Moderado',     color: '#d97706' },
  weak:     { label: 'Fraco',        color: '#dc2626' },
  unknown:  { label: 'Desconhecido', color: '#9ca3af' },
}

const SENT_CFG: Record<Sentiment, { emoji: string; label: string }> = {
  positive: { emoji: '😊', label: 'Positivo'     },
  neutral:  { emoji: '😐', label: 'Neutro'       },
  negative: { emoji: '😟', label: 'Negativo'     },
  unknown:  { emoji: '❓', label: 'Desconhecido' },
}

// ─── Stakeholder Card ─────────────────────────────────────────────────────────

function StakeholderNode({
  s, isDark, border, text, muted, cardBg,
  onEdit, onDelete,
}: {
  s: RichStakeholder; isDark: boolean; border: string; text: string; muted: string; cardBg: string
  onEdit: (s: RichStakeholder) => void; onDelete: (id: string) => void
}) {
  const role = ROLE_CFG[s.role]
  const rel  = REL_CFG[s.relationship]
  const sent = SENT_CFG[s.sentiment]
  const color = s.avatar_color ?? role.color

  return (
    <div style={{
      backgroundColor: cardBg, border: `1px solid ${border}`,
      borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
      minWidth: '160px', maxWidth: '200px',
    }}>
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
          backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: '#fff',
        }}>{s.initials ?? s.name.slice(0, 2).toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
          {s.title && <p style={{ fontSize: '10px', color: muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</p>}
        </div>
      </div>

      {/* Role badge */}
      <span style={{
        alignSelf: 'flex-start', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px',
        backgroundColor: role.bg, color: role.color,
      }}>{role.icon} {role.label}</span>

      {/* Influence bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ fontSize: '9px', color: muted }}>Influência</span>
          <span style={{ fontSize: '9px', fontWeight: 700, color: text }}>{s.influence_level}/10</span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', backgroundColor: isDark ? '#1a1a18' : '#e8e4dc' }}>
          <div style={{ height: '100%', width: `${s.influence_level * 10}%`, borderRadius: '2px', backgroundColor: role.color }} />
        </div>
      </div>

      {/* Rel + Sentiment */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: rel.color }}>● {rel.label}</span>
        <span style={{ fontSize: '13px' }} title={sent.label}>{sent.emoji}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
        <button type="button" onClick={() => onEdit(s)}
          style={{ flex: 1, height: '24px', fontSize: '10px', fontWeight: 600, backgroundColor: isDark ? '#1a1a18' : '#f5f4f0', border: `1px solid ${border}`, borderRadius: '5px', cursor: 'pointer', color: muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
          <Pencil style={{ width: '9px', height: '9px' }} /> Editar
        </button>
        <button type="button" onClick={() => onDelete(s.id)}
          style={{ width: '24px', height: '24px', backgroundColor: 'transparent', border: `1px solid ${border}`, borderRadius: '5px', cursor: 'pointer', color: muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
          onMouseLeave={(e) => (e.currentTarget.style.color = muted)}>
          <X style={{ width: '10px', height: '10px' }} />
        </button>
      </div>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', title: '', role: 'influencer' as StakeholderRole,
  influence_level: 5, relationship: 'unknown' as Relationship,
  sentiment: 'unknown' as Sentiment, notes: '', email: '',
}

function StakeholderForm({
  initial, isDark, border, text, muted, inputBg, onSave, onCancel,
}: {
  initial: typeof EMPTY_FORM; isDark: boolean; border: string; text: string; muted: string; inputBg: string
  onSave: (data: typeof EMPTY_FORM) => void; onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Nome *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: João Silva"
            style={{ width: '100%', height: '32px', padding: '0 10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Cargo</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex: CFO"
            style={{ width: '100%', height: '32px', padding: '0 10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Papel *</label>
          <select value={form.role} onChange={(e) => set('role', e.target.value)}
            style={{ width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', cursor: 'pointer' }}>
            {(Object.entries(ROLE_CFG) as [StakeholderRole, typeof ROLE_CFG[StakeholderRole]][]).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Influência: {form.influence_level}/10</label>
          <input type="range" min={1} max={10} value={form.influence_level} onChange={(e) => set('influence_level', Number(e.target.value))}
            style={{ width: '100%', accentColor: ROLE_CFG[form.role].color }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Relacionamento</label>
          <select value={form.relationship} onChange={(e) => set('relationship', e.target.value)}
            style={{ width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', cursor: 'pointer' }}>
            {(Object.entries(REL_CFG) as [Relationship, typeof REL_CFG[Relationship]][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Sentimento</label>
          <select value={form.sentiment} onChange={(e) => set('sentiment', e.target.value)}
            style={{ width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', cursor: 'pointer' }}>
            {(Object.entries(SENT_CFG) as [Sentiment, typeof SENT_CFG[Sentiment]][]).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Notas / Estratégia</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
          placeholder="Observações, abordagem recomendada..."
          style={{ width: '100%', padding: '8px 10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}
          style={{ height: '32px', padding: '0 14px', fontSize: '12px', backgroundColor: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button type="button" onClick={() => form.name.trim() && onSave(form)} disabled={!form.name.trim()}
          style={{ height: '32px', padding: '0 16px', fontSize: '12px', fontWeight: 700, background: form.name.trim() ? `linear-gradient(135deg, ${ROLE_CFG[form.role].color}cc, ${ROLE_CFG[form.role].color})` : (isDark ? '#1a1a18' : '#e8e4dc'), color: form.name.trim() ? '#fff' : muted, border: 'none', borderRadius: '6px', cursor: form.name.trim() ? 'pointer' : 'not-allowed' }}>
          Salvar
        </button>
      </div>
    </div>
  )
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function analyzeStakeholders(list: RichStakeholder[]) {
  const alerts: { icon: string; msg: string; severity: 'high' | 'medium' | 'low' }[] = []

  if (!list.some((s) => s.role === 'economic_buyer'))
    alerts.push({ icon: '🚨', msg: 'Falta decisor econômico mapeado', severity: 'high' })
  if (!list.some((s) => s.role === 'champion'))
    alerts.push({ icon: '⚠️', msg: 'Sem champion interno identificado', severity: 'medium' })
  const blockers = list.filter((s) => s.role === 'blocker' && !s.notes?.trim())
  if (blockers.length > 0)
    alerts.push({ icon: '⚠️', msg: `${blockers.length} bloqueador${blockers.length > 1 ? 'es' : ''} sem plano de mitigação`, severity: 'medium' })
  const champions = list.filter((s) => s.role === 'champion' && s.relationship === 'strong')
  if (champions.length > 0)
    alerts.push({ icon: '✅', msg: `Champion forte — alavancar (${champions[0].name})`, severity: 'low' })

  const positive   = list.filter((s) => s.sentiment === 'positive').length
  const negative   = list.filter((s) => s.sentiment === 'negative').length
  const strong     = list.filter((s) => s.relationship === 'strong').length
  const positivePct = list.length > 0 ? Math.round((positive / list.length) * 100) : 0

  return { alerts, positive, negative, strong, positivePct, total: list.length }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StakeholderMap({ dealId, isDark }: { dealId: string; isDark: boolean }) {
  const addToast = useToastStore((s) => s.addToast)
  const [list, setList]         = useState<RichStakeholder[]>([])
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState<RichStakeholder | null>(null)
  const [saving, setSaving]     = useState(false)
  const [tableExists, setTableExists] = useState(true)

  const border  = isDark ? '#242422' : '#e4e0da'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const surfBg  = isDark ? '#111110' : '#f9f8f5'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#5a5652' : '#8a857d'
  const inputBg = isDark ? '#0d0d0b' : '#f9f8f5'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('deal_stakeholders_v2')
        .select('*')
        .eq('deal_id', dealId)
        .order('influence_level', { ascending: false })
      if (error?.code === '42P01') { setTableExists(false); return }
      setList((data ?? []) as RichStakeholder[])
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => { if (expanded) load() }, [expanded, load])

  async function handleSave(form: typeof EMPTY_FORM) {
    setSaving(true)
    try {
      const initials = form.name.trim().split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
      const roleColor = ROLE_CFG[form.role].color
      if (editing) {
        const { error } = await supabase.from('deal_stakeholders_v2').update({ ...form, initials, avatar_color: roleColor }).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('deal_stakeholders_v2').insert({ ...form, deal_id: dealId, initials, avatar_color: roleColor })
        if (error) throw error
      }
      await load()
      setShowAdd(false)
      setEditing(null)
      addToast(editing ? 'Stakeholder atualizado' : 'Stakeholder adicionado', 'success')
    } catch {
      addToast('Erro ao salvar stakeholder', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await supabase.from('deal_stakeholders_v2').delete().eq('id', id)
      setList((l) => l.filter((s) => s.id !== id))
      addToast('Stakeholder removido', 'info')
    } catch {
      addToast('Erro ao remover stakeholder', 'error')
    }
  }

  const analysis = analyzeStakeholders(list)

  const editInitial = editing
    ? { name: editing.name, title: editing.title ?? '', role: editing.role, influence_level: editing.influence_level, relationship: editing.relationship, sentiment: editing.sentiment, notes: editing.notes ?? '', email: editing.email ?? '' }
    : EMPTY_FORM

  return (
    <div style={{ backgroundColor: surfBg, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px' }}>🗺️</span>
          <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Mapa de Stakeholders {list.length > 0 ? `(${list.length})` : ''}
          </p>
        </div>
        <ChevronDown style={{ width: '12px', height: '12px', color: muted, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {!tableExists && (
            <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic', padding: '8px 0' }}>
              Execute a migration <code>20260423000002_deal_stakeholders_rich.sql</code> no Supabase para ativar esta funcionalidade.
            </p>
          )}

          {tableExists && !loading && list.length > 0 && (
            <>
              {/* Analysis */}
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: cardBg, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {analysis.alerts.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontSize: '12px', flexShrink: 0 }}>{a.icon}</span>
                    <span style={{ fontSize: '11px', color: a.severity === 'high' ? '#dc2626' : a.severity === 'medium' ? '#d97706' : '#16a34a', fontWeight: 500 }}>{a.msg}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px', paddingTop: '8px', borderTop: `1px solid ${border}` }}>
                  <span style={{ fontSize: '11px', color: muted }}>😊 {analysis.positivePct}% positivo</span>
                  <span style={{ fontSize: '11px', color: muted }}>● {analysis.strong} rel. fortes</span>
                  <span style={{ fontSize: '11px', color: muted }}>{analysis.total} mapeados</span>
                </div>
              </div>

              {/* Cards grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {list.map((s) => (
                  <StakeholderNode
                    key={s.id} s={s} isDark={isDark} border={border}
                    text={text} muted={muted} cardBg={cardBg}
                    onEdit={(sk) => { setEditing(sk); setShowAdd(true) }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}

          {tableExists && !loading && list.length === 0 && !showAdd && (
            <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic' }}>Nenhum stakeholder mapeado ainda.</p>
          )}

          {/* Form */}
          {tableExists && showAdd && (
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: cardBg, border: `1px solid ${border}` }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: text, marginBottom: '10px' }}>
                {editing ? 'Editar stakeholder' : 'Adicionar stakeholder'}
              </p>
              <StakeholderForm
                initial={editInitial}
                isDark={isDark} border={border} text={text} muted={muted} inputBg={inputBg}
                onSave={!saving ? handleSave : () => {}}
                onCancel={() => { setShowAdd(false); setEditing(null) }}
              />
            </div>
          )}

          {/* Add button */}
          {tableExists && !showAdd && (
            <button type="button" onClick={() => { setShowAdd(true); setEditing(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                width: '100%', height: '28px', padding: '0 10px', fontSize: '11px', fontWeight: 600,
                backgroundColor: 'transparent', border: `1px dashed ${border}`,
                borderRadius: '6px', cursor: 'pointer',
                color: isDark ? '#a0c4b4' : '#2c5545',
              }}>
              <Plus style={{ width: '11px', height: '11px' }} />
              Mapear stakeholder
            </button>
          )}
        </div>
      )}
    </div>
  )
}
