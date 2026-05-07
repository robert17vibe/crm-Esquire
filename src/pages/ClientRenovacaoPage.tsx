import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Mail, Phone, Globe, Users,
  CheckSquare, Plus, X, FileText, Link2, Pencil, Check, RefreshCcw,
  CreditCard, Pen, Truck, CheckCircle2, Clock,
} from 'lucide-react'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useActivityStore } from '@/store/useActivityStore'
import { usePaymentStore } from '@/store/usePaymentStore'
import { PageLoadingState } from '@/components/ui/PageState'
import { supabase } from '@/lib/supabase'
import type { Deal } from '@/types/deal.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${((Math.abs(h) % 360) + 360) % 360}, 52%, 46%)`
}

// ─── Proposta de Renovação ─────────────────────────────────────────────────────

interface RenewalLine { id: string; description: string; qty: number; unit_price: number }

interface SavedRenewalProposal {
  id: string; createdAt: string; intro: string; validity: string
  payment: string; terms: string; lines: RenewalLine[]
  discountPct: number; installments: number
}

function mapProposalRow(row: Record<string, unknown>): SavedRenewalProposal {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    intro: (row.intro as string) ?? '',
    validity: (row.validity as string) ?? '30 dias',
    payment: (row.payment as string) ?? '',
    terms: (row.terms as string) ?? '',
    lines: (row.lines as RenewalLine[]) ?? [],
    discountPct: Number(row.discount_pct ?? 0),
    installments: Number(row.installments ?? 1),
  }
}

function PropostaRenovacao({ deal, isDark, border, text, muted, inputBg }: {
  deal: Deal; isDark: boolean; border: string; text: string; muted: string; inputBg: string
}) {
  const [history, setHistory]           = useState<SavedRenewalProposal[]>([])
  const [intro, setIntro]               = useState('')
  const [validity, setValidity]         = useState('30 dias')
  const [payment, setPayment]           = useState('')
  const [terms, setTerms]               = useState('')
  const [discountPct, setDiscountPct]   = useState(0)
  const [installments, setInstallments] = useState(1)
  const [lines, setLines]               = useState<RenewalLine[]>([])
  const [preview, setPreview]           = useState<SavedRenewalProposal | null>(null)
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)

  useEffect(() => {
    supabase.from('renewal_proposals')
      .select('*')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setHistory(data.map(mapProposalRow))
      })
  }, [deal.id])

  function addLine() {
    setLines((l) => [...l, { id: crypto.randomUUID(), description: '', qty: 1, unit_price: deal.value ?? 0 }])
  }
  function updateLine(id: string, patch: Partial<RenewalLine>) {
    setLines((l) => l.map((line) => line.id === id ? { ...line, ...patch } : line))
  }
  function removeLine(id: string) { setLines((l) => l.filter((line) => line.id !== id)) }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    const { data, error } = await supabase
      .from('renewal_proposals')
      .insert({ deal_id: deal.id, intro, validity, payment, terms, lines, discount_pct: discountPct, installments })
      .select()
      .single()
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    if (data) setHistory((h) => [mapProposalRow(data as Record<string, unknown>), ...h].slice(0, 10))
  }

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
  const discount = subtotal * (discountPct / 100)
  const total    = subtotal - discount

  const card: React.CSSProperties = {
    backgroundColor: isDark ? '#111110' : '#ffffff',
    border: `1px solid ${border}`, borderRadius: '10px', padding: '18px 20px', marginBottom: '14px',
  }
  const label: React.CSSProperties = {
    fontSize: '10px', fontWeight: 600, color: muted,
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px',
  }
  const input: React.CSSProperties = {
    width: '100%', padding: '0 10px', fontSize: '12px', fontWeight: 500,
    backgroundColor: inputBg, border: `1px solid ${border}`,
    borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box',
    height: '32px', fontFamily: 'inherit',
  }

  if (preview) {
    const prevSubtotal = preview.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
    const prevDiscount = prevSubtotal * (preview.discountPct / 100)
    const prevTotal    = prevSubtotal - prevDiscount
    const company      = deal.company_name || deal.title
    return (
      <div style={{ padding: '20px 24px' }}>
        <button type="button" onClick={() => setPreview(null)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px', padding: 0 }}>
          <ArrowLeft size={12} /> Voltar ao editor
        </button>
        <div style={{ ...card, maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${border}` }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#6b1212', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>Proposta de Renovação</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: text, letterSpacing: '-0.03em' }}>{company}</p>
            <p style={{ fontSize: '11px', color: muted, marginTop: '4px' }}>{fmtDate(preview.createdAt)}</p>
          </div>
          {preview.intro && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ ...label }}>Apresentação</p>
              <p style={{ fontSize: '13px', color: text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{preview.intro}</p>
            </div>
          )}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ ...label }}>Serviços</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Descrição', 'Qtd', 'Unit.', 'Total'].map((h) => (
                    <th key={h} style={{ textAlign: h === 'Descrição' ? 'left' : 'right', fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '6px 0', paddingRight: h !== 'Total' ? '12px' : 0 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ fontSize: '12px', color: text, padding: '8px 12px 8px 0' }}>{l.description}</td>
                    <td style={{ fontSize: '12px', color: muted, textAlign: 'right', padding: '8px 12px 8px 0', fontFamily: "'Geist Mono', monospace" }}>{l.qty}</td>
                    <td style={{ fontSize: '12px', color: muted, textAlign: 'right', padding: '8px 12px 8px 0', fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(l.unit_price)}</td>
                    <td style={{ fontSize: '12px', color: text, fontWeight: 600, textAlign: 'right', padding: '8px 0', fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(l.qty * l.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              {prevDiscount > 0 && (
                <>
                  <div style={{ display: 'flex', gap: '32px' }}>
                    <span style={{ fontSize: '11px', color: muted }}>Subtotal</span>
                    <span style={{ fontSize: '11px', color: muted, fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(prevSubtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '32px' }}>
                    <span style={{ fontSize: '11px', color: '#2c5545' }}>Desconto {preview.discountPct}%</span>
                    <span style={{ fontSize: '11px', color: '#2c5545', fontFamily: "'Geist Mono', monospace" }}>-{fmtBRL(prevDiscount)}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: '32px', paddingTop: '6px', borderTop: `1px solid ${border}`, marginTop: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: text }}>Total</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#6b1212', fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(prevTotal)}</span>
              </div>
              {preview.installments > 1 && (
                <span style={{ fontSize: '11px', color: muted }}>{preview.installments}x de {fmtBRL(prevTotal / preview.installments)}</span>
              )}
            </div>
          </div>
          {(preview.validity || preview.payment || preview.terms) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${border}` }}>
              {[
                { label: 'Validade', value: preview.validity },
                { label: 'Pagamento', value: preview.payment },
                { label: 'Condições', value: preview.terms },
              ].filter((r) => r.value).map((r) => (
                <div key={r.label}>
                  <p style={{ ...label }}>{r.label}</p>
                  <p style={{ fontSize: '12px', color: text }}>{r.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Intro */}
      <div style={card}>
        <p style={{ ...label }}>Apresentação</p>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="Descreva a proposta de renovação e os principais benefícios..."
          rows={4}
          style={{ ...input, height: 'auto', padding: '8px 10px', lineHeight: '1.55', resize: 'vertical' }}
        />
      </div>

      {/* Services */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <p style={{ ...label, marginBottom: 0 }}>Serviços</p>
          <button type="button" onClick={addLine}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#6b1212', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Plus size={11} /> Adicionar linha
          </button>
        </div>
        {lines.length === 0 && (
          <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
            Nenhum item — clique em Adicionar linha
          </p>
        )}
        {lines.map((line) => (
          <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 110px 24px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
            <input style={input} placeholder="Descrição do serviço" value={line.description}
              onChange={(e) => updateLine(line.id, { description: e.target.value })} />
            <input style={{ ...input, textAlign: 'center' }} type="number" min={1} value={line.qty}
              onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })} />
            <input style={{ ...input, textAlign: 'right', fontFamily: "'Geist Mono', monospace" }} type="number" min={0} value={line.unit_price}
              onChange={(e) => updateLine(line.id, { unit_price: Number(e.target.value) })} />
            <button type="button" onClick={() => removeLine(line.id)}
              style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted }}>
              <X size={11} />
            </button>
          </div>
        ))}
        {lines.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: muted }}>Desconto</span>
              <input type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))}
                style={{ ...input, width: '60px', textAlign: 'center' }} />
              <span style={{ fontSize: '11px', color: muted }}>%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: muted }}>Parcelas</span>
              <input type="number" min={1} max={60} value={installments} onChange={(e) => setInstallments(Number(e.target.value))}
                style={{ ...input, width: '60px', textAlign: 'center' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              {discount > 0 && <span style={{ fontSize: '10px', color: muted, fontFamily: "'Geist Mono', monospace" }}>-{fmtBRL(discount)}</span>}
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#6b1212', fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.03em' }}>{fmtBRL(total)}</span>
              {installments > 1 && <span style={{ fontSize: '10px', color: muted }}>{installments}x de {fmtBRL(total / installments)}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Conditions */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Validade', value: validity, setter: setValidity, placeholder: 'Ex: 30 dias' },
            { label: 'Pagamento', value: payment, setter: setPayment, placeholder: 'Ex: Boleto 30/60/90' },
            { label: 'Condições', value: terms, setter: setTerms, placeholder: 'Condições gerais' },
          ].map(({ label: l, value, setter, placeholder }) => (
            <div key={l}>
              <p style={{ ...label }}>{l}</p>
              <input style={input} value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ height: '34px', padding: '0 18px', borderRadius: '7px', border: 'none', backgroundColor: saving ? '#a0403e' : '#6b1212', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'A guardar…' : 'Guardar Proposta'}
        </button>
        {lines.length > 0 && (
          <button type="button" onClick={() => setPreview({ id: 'preview', createdAt: new Date().toISOString(), intro, validity, payment, terms, lines, discountPct, installments })}
            style={{ height: '34px', padding: '0 14px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileText size={12} /> Pré-visualizar
          </button>
        )}
        </div>
        {saveError && (
          <p style={{ fontSize: '11px', color: '#b83535' }}>Erro ao guardar: {saveError}</p>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            Propostas anteriores
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.map((p, i) => {
              const sub = p.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
              const tot = sub * (1 - p.discountPct / 100)
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: '8px', backgroundColor: isDark ? '#111110' : '#f9f9f8',
                  border: `1px solid ${border}`,
                }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: text }}>Proposta #{history.length - i}</p>
                    <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>{fmtDate(p.createdAt)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#6b1212', fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(tot)}</p>
                    <button type="button" onClick={() => setPreview(p)}
                      style={{ fontSize: '10px', color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Ver proposta
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Materiais & Entrega ──────────────────────────────────────────────────────

interface Material { id: string; name: string; url: string; type: 'link' | 'doc' | 'video'; addedAt: string }
interface Deliverable { id: string; label: string; done: boolean }

function MateriaisEntrega({ dealId, isDark, border, text, muted, inputBg }: {
  dealId: string; isDark: boolean; border: string; text: string; muted: string; inputBg: string
}) {
  const [materials,    setMaterials]    = useState<Material[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [notes,        setNotes]        = useState<string>('')
  const [newMatName,   setNewMatName]   = useState('')
  const [newMatUrl,    setNewMatUrl]    = useState('')
  const [newMatType,   setNewMatType]   = useState<'link' | 'doc' | 'video'>('link')
  const [newDelLabel,  setNewDelLabel]  = useState('')
  const [editNotes,    setEditNotes]    = useState(false)
  const [notesDraft,   setNotesDraft]   = useState('')

  useEffect(() => {
    supabase.from('deal_materials').select('*').eq('deal_id', dealId).order('added_at', { ascending: false })
      .then(({ data }) => { if (data) setMaterials(data.map((r) => ({ id: r.id as string, name: r.name as string, url: r.url as string, type: r.type as 'link'|'doc'|'video', addedAt: r.added_at as string }))) })
    supabase.from('deal_deliverables').select('*').eq('deal_id', dealId).order('created_at')
      .then(({ data }) => { if (data) setDeliverables(data.map((r) => ({ id: r.id as string, label: r.label as string, done: r.done as boolean }))) })
    supabase.from('deal_delivery_notes').select('notes').eq('deal_id', dealId).maybeSingle()
      .then(({ data }) => { if (data) { setNotes(data.notes as string); setNotesDraft(data.notes as string) } })
  }, [dealId])

  const addMaterial = useCallback(async () => {
    if (!newMatName.trim() || !newMatUrl.trim()) return
    const { data } = await supabase.from('deal_materials')
      .insert({ deal_id: dealId, name: newMatName.trim(), url: newMatUrl.trim(), type: newMatType })
      .select().single()
    if (data) {
      setMaterials((m) => [{ id: data.id as string, name: data.name as string, url: data.url as string, type: data.type as 'link'|'doc'|'video', addedAt: data.added_at as string }, ...m])
      setNewMatName(''); setNewMatUrl('')
    }
  }, [dealId, newMatName, newMatUrl, newMatType])

  const removeMaterial = useCallback(async (id: string) => {
    await supabase.from('deal_materials').delete().eq('id', id)
    setMaterials((m) => m.filter((x) => x.id !== id))
  }, [])

  const addDeliverable = useCallback(async () => {
    if (!newDelLabel.trim()) return
    const { data } = await supabase.from('deal_deliverables')
      .insert({ deal_id: dealId, label: newDelLabel.trim(), done: false })
      .select().single()
    if (data) {
      setDeliverables((d) => [...d, { id: data.id as string, label: data.label as string, done: false }])
      setNewDelLabel('')
    }
  }, [dealId, newDelLabel])

  const toggleDeliverable = useCallback(async (id: string) => {
    const item = deliverables.find((d) => d.id === id)
    if (!item) return
    const newDone = !item.done
    await supabase.from('deal_deliverables').update({ done: newDone }).eq('id', id)
    setDeliverables((d) => d.map((x) => x.id === id ? { ...x, done: newDone } : x))
  }, [deliverables])

  const removeDeliverable = useCallback(async (id: string) => {
    await supabase.from('deal_deliverables').delete().eq('id', id)
    setDeliverables((d) => d.filter((x) => x.id !== id))
  }, [])

  async function saveNotes() {
    await supabase.from('deal_delivery_notes')
      .upsert({ deal_id: dealId, notes: notesDraft, updated_at: new Date().toISOString() }, { onConflict: 'deal_id' })
    setNotes(notesDraft)
    setEditNotes(false)
  }

  const card: React.CSSProperties = {
    backgroundColor: isDark ? '#111110' : '#ffffff',
    border: `1px solid ${border}`, borderRadius: '10px', padding: '18px 20px', marginBottom: '14px',
  }
  const label: React.CSSProperties = {
    fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase',
    letterSpacing: '0.07em', marginBottom: '10px',
  }
  const input: React.CSSProperties = {
    height: '32px', padding: '0 10px', fontSize: '12px', fontWeight: 500,
    backgroundColor: inputBg, border: `1px solid ${border}`,
    borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  const doneCount   = deliverables.filter((d) => d.done).length
  const totalCount  = deliverables.length
  const progress    = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const TYPE_COLORS: Record<string, string> = { link: '#4d7aa8', doc: '#6b1212', video: '#7c5cbf' }

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Progresso de entrega */}
      {totalCount > 0 && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: text }}>Progresso de entrega</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: progress === 100 ? '#2c5545' : muted, fontFamily: "'Geist Mono', monospace" }}>
                {doneCount}/{totalCount}
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', backgroundColor: isDark ? '#1e1e1c' : '#f3f4f6', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, backgroundColor: progress === 100 ? '#2c5545' : '#6b1212', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <p style={{ fontSize: '22px', fontWeight: 700, color: progress === 100 ? '#2c5545' : '#6b1212', fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.04em', lineHeight: 1 }}>{progress}%</p>
            <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>concluído</p>
          </div>
        </div>
      )}

      {/* Deliverables checklist */}
      <div style={card}>
        <p style={{ ...label }}>Checklist de entrega</p>
        {deliverables.map((d) => (
          <div
            key={d.id}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: `1px solid ${border}` }}
          >
            <button type="button" onClick={() => toggleDeliverable(d.id)}
              style={{
                width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                border: `1.5px solid ${d.done ? '#2c5545' : border}`,
                backgroundColor: d.done ? '#2c5545' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {d.done && <Check size={10} color="#fff" strokeWidth={3} />}
            </button>
            <span style={{ fontSize: '12px', fontWeight: 500, color: d.done ? muted : text, textDecoration: d.done ? 'line-through' : 'none', flex: 1 }}>
              {d.label}
            </span>
            <button type="button" onClick={() => removeDeliverable(d.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px', display: 'flex', alignItems: 'center' }}>
              <X size={11} />
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          <input
            style={{ ...input, flex: 1 }}
            placeholder="Nova entrega..."
            value={newDelLabel}
            onChange={(e) => setNewDelLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addDeliverable() }}
          />
          <button type="button" onClick={addDeliverable}
            style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: 'none', backgroundColor: '#6b1212', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={11} /> Adicionar
          </button>
        </div>
      </div>

      {/* Materials / links */}
      <div style={card}>
        <p style={{ ...label }}>Materiais & Links</p>
        {materials.map((mat) => (
          <div key={mat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
              backgroundColor: `${TYPE_COLORS[mat.type]}14`,
              border: `1px solid ${TYPE_COLORS[mat.type]}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {mat.type === 'doc' ? <FileText size={12} color={TYPE_COLORS[mat.type]} />
               : mat.type === 'video' ? <CheckSquare size={12} color={TYPE_COLORS[mat.type]} />
               : <Link2 size={12} color={TYPE_COLORS[mat.type]} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <a
                href={mat.url.startsWith('http') ? mat.url : `https://${mat.url}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', fontWeight: 600, color: text, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
              >
                {mat.name}
              </a>
              <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>
                {mat.url.replace(/^https?:\/\//, '').slice(0, 50)}
              </p>
            </div>
            <button type="button" onClick={() => removeMaterial(mat.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <X size={11} />
            </button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px auto', gap: '6px', marginTop: '10px' }}>
          <input style={input} placeholder="Nome do material" value={newMatName} onChange={(e) => setNewMatName(e.target.value)} />
          <input style={input} placeholder="URL ou link" value={newMatUrl} onChange={(e) => setNewMatUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addMaterial() }} />
          <select value={newMatType} onChange={(e) => setNewMatType(e.target.value as 'link' | 'doc' | 'video')}
            style={{ ...input, cursor: 'pointer' }}>
            <option value="link">Link</option>
            <option value="doc">Documento</option>
            <option value="video">Vídeo</option>
          </select>
          <button type="button" onClick={addMaterial}
            style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: 'none', backgroundColor: '#6b1212', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Delivery notes */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={{ ...label, marginBottom: 0 }}>Notas de entrega</p>
          {editNotes ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" onClick={() => { setNotesDraft(notes); setEditNotes(false) }}
                style={{ height: '26px', padding: '0 10px', borderRadius: '5px', border: `1px solid ${border}`, backgroundColor: 'transparent', fontSize: '11px', color: muted, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={saveNotes}
                style={{ height: '26px', padding: '0 10px', borderRadius: '5px', border: 'none', backgroundColor: '#6b1212', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={10} /> Guardar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => { setNotesDraft(notes); setEditNotes(true) }}
              style={{ height: '26px', padding: '0 8px', borderRadius: '5px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: muted }}>
              <Pencil size={10} /> Editar
            </button>
          )}
        </div>
        {editNotes ? (
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={6}
            placeholder="Notas sobre o progresso da entrega, feedback do cliente, pendências..."
            style={{ ...input, height: 'auto', padding: '8px 10px', lineHeight: '1.55', resize: 'vertical', width: '100%' }}
          />
        ) : notes ? (
          <p style={{ fontSize: '13px', color: text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{notes}</p>
        ) : (
          <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Sem notas — clique em Editar para adicionar</p>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Dados do Cliente ─────────────────────────────────────────────────────

function DadosCliente({ deal, isDark, border, text, muted }: {
  deal: Deal; isDark: boolean; border: string; text: string; muted: string
}) {
  const navigate   = useNavigate()
  const byDeal     = useActivityStore((s) => s.byDeal)
  const activities = (byDeal[deal.id] ?? []).slice(0, 5)
  const owner      = deal.owner

  const daysSinceWon = deal.updated_at
    ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86_400_000)
    : 0

  const daysToClose = deal.expected_close
    ? Math.round((new Date(deal.expected_close).getTime() - Date.now()) / 86_400_000)
    : null

  const card: React.CSSProperties = {
    backgroundColor: isDark ? '#111110' : '#ffffff',
    border: `1px solid ${border}`, borderRadius: '10px', padding: '18px 20px',
  }
  const label: React.CSSProperties = {
    fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em',
  }

  return (
    <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

      {/* Contacto */}
      <div style={card}>
        <p style={{ ...label, marginBottom: '14px' }}>Contacto</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { icon: <Users size={12} color={muted} />, label: 'Nome', value: deal.contact_name },
            { icon: <Mail size={12} color={muted} />, label: 'Email', value: deal.contact_email, clickable: true, onClick: () => navigate(`/email?to=${encodeURIComponent(deal.contact_email ?? '')}`) },
            { icon: <Phone size={12} color={muted} />, label: 'Telefone', value: deal.contact_phone },
            { icon: <Globe size={12} color={muted} />, label: 'Website', value: deal.company_website, link: true },
          ].map(({ icon, label: l, value, clickable, onClick, link }) => value ? (
            <div key={l} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '1px', flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ ...label, marginBottom: '1px' }}>{l}</p>
                {clickable ? (
                  <button type="button" onClick={onClick}
                    style={{ fontSize: '12px', fontWeight: 500, color: '#6b1212', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    {value}
                  </button>
                ) : link ? (
                  <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', fontWeight: 500, color: '#6b1212', textDecoration: 'none' }}>
                    {value}
                  </a>
                ) : (
                  <p style={{ fontSize: '12px', fontWeight: 500, color: text }}>{value}</p>
                )}
              </div>
            </div>
          ) : null)}
        </div>
      </div>

      {/* Empresa */}
      <div style={card}>
        <p style={{ ...label, marginBottom: '14px' }}>Empresa</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { icon: <Building2 size={12} color={muted} />, label: 'Nome', value: deal.company_name },
            { icon: <Building2 size={12} color={muted} />, label: 'Setor', value: deal.company_sector },
            { icon: <Users size={12} color={muted} />, label: 'Tamanho', value: deal.company_size ? `${deal.company_size} func.` : undefined },
            { icon: <Building2 size={12} color={muted} />, label: 'Segmento', value: deal.segment },
          ].map(({ icon, label: l, value }) => value ? (
            <div key={l} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '1px', flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ ...label, marginBottom: '1px' }}>{l}</p>
                <p style={{ fontSize: '12px', fontWeight: 500, color: text }}>{value}</p>
              </div>
            </div>
          ) : null)}
        </div>
      </div>

      {/* Stats de cliente */}
      <div style={{ ...card, gridColumn: '1 / -1' }}>
        <p style={{ ...label, marginBottom: '14px' }}>Métricas do Contrato</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', backgroundColor: border, borderRadius: '8px', overflow: 'hidden' }}>
          {[
            { label: 'Valor do contrato', value: fmtBRL(deal.value ?? 0), color: '#6b1212' },
            { label: 'Dias como cliente', value: `${daysSinceWon}d`, color: muted },
            { label: 'Renovação em', value: daysToClose !== null ? `${daysToClose}d` : '—', color: daysToClose !== null && daysToClose <= 30 ? '#a88030' : muted },
            { label: 'Data de fecho', value: fmtDate(deal.expected_close), color: muted },
          ].map((s) => (
            <div key={s.label} style={{ backgroundColor: isDark ? '#111110' : '#ffffff', padding: '14px 16px' }}>
              <p style={{ ...label, marginBottom: '4px' }}>{s.label}</p>
              <p style={{ fontSize: '17px', fontWeight: 700, color: s.color, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.03em' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Responsável */}
      {owner && (
        <div style={card}>
          <p style={{ ...label, marginBottom: '12px' }}>Responsável</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: owner.avatar_color ?? '#6b6560', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
              {owner.initials}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{owner.name}</p>
              <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>Account Manager</p>
            </div>
          </div>
        </div>
      )}

      {/* Atividade recente */}
      {activities.length > 0 && (
        <div style={card}>
          <p style={{ ...label, marginBottom: '12px' }}>Atividade recente</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activities.map((act) => (
              <div key={act.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#6b1212', flexShrink: 0, marginTop: '5px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.subject}</p>
                  <p style={{ fontSize: '10px', color: muted }}>{fmtDate(act.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Cobrança & Entrega ──────────────────────────────────────────────────

function CobrancaTab({ dealId, isDark, border, text, muted }: {
  dealId: string; isDark: boolean; border: string; text: string; muted: string
}) {
  const contract     = usePaymentStore((s) => s.getContractByDeal(dealId))
  const payments     = usePaymentStore((s) => s.getPaymentsByDeal(dealId))
  const signContract = usePaymentStore((s) => s.signContract)
  const setDelivery  = usePaymentStore((s) => s.setDeliveryStatus)
  const initialize   = usePaymentStore((s) => s.initialize)

  useEffect(() => { initialize() }, [initialize])

  const card: React.CSSProperties = {
    backgroundColor: isDark ? '#111110' : '#ffffff',
    border: `1px solid ${border}`, borderRadius: '10px', padding: '18px 20px', marginBottom: '14px',
  }
  const label: React.CSSProperties = {
    fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em',
  }

  if (!contract) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <CreditCard size={32} color={muted} style={{ marginBottom: '12px' }} />
        <p style={{ fontSize: '14px', fontWeight: 600, color: text, marginBottom: '6px' }}>Sem contrato</p>
        <p style={{ fontSize: '12px', color: muted }}>O contrato é gerado automaticamente quando o deal vai para Ganho.</p>
      </div>
    )
  }

  const paidCount   = payments.filter((p) => p.status === 'paid').length
  const totalCount  = payments.length
  const paidAmount  = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalAmount = contract.value
  const progress    = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

  const DELIVERY_OPTS: { key: import('@/types/payment.types').DeliveryStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'pending',     label: 'Aguardando',  icon: <Clock size={11} />,       color: muted },
    { key: 'in_progress', label: 'Em entrega',  icon: <Truck size={11} />,       color: '#a88030' },
    { key: 'delivered',   label: 'Entregue',    icon: <CheckCircle2 size={11} />, color: '#2c5545' },
  ]

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Progresso financeiro */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ ...label }}>Parcelas pagas</p>
          <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: "'Geist Mono', monospace", color: progress === 100 ? '#2c5545' : text }}>
            {paidCount}/{totalCount}
          </span>
        </div>
        <div style={{ height: '6px', borderRadius: '3px', backgroundColor: isDark ? '#1e1e1c' : '#f3f4f6', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: progress === 100 ? '#2c5545' : '#6b1212', borderRadius: '3px', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: muted }}>Recebido</span>
          <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: "'Geist Mono', monospace", color: '#2c5545' }}>{fmtBRL(paidAmount)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
          <span style={{ fontSize: '11px', color: muted }}>Valor total</span>
          <span style={{ fontSize: '11px', fontFamily: "'Geist Mono', monospace", color: muted }}>{fmtBRL(totalAmount)}</span>
        </div>
      </div>

      {/* Assinatura */}
      <div style={card}>
        <p style={{ ...label, marginBottom: '10px' }}>Assinatura do contrato</p>
        {contract.signed_at ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#2c5545" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#2c5545' }}>Assinado a {fmtDate(contract.signed_at)}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: muted }}>Aguardando assinatura</span>
            <button
              type="button"
              onClick={() => signContract(contract.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', padding: '0 12px', borderRadius: '6px', border: 'none', backgroundColor: '#6b1212', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Pen size={10} /> Registar assinatura
            </button>
          </div>
        )}
      </div>

      {/* Estado de entrega */}
      <div style={card}>
        <p style={{ ...label, marginBottom: '12px' }}>Estado de entrega das peças</p>
        <div style={{ display: 'flex', gap: '6px' }}>
          {DELIVERY_OPTS.map((opt) => {
            const active = contract.delivery_status === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDelivery(contract.id, opt.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  height: '32px', padding: '0 14px', borderRadius: '7px', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 600,
                  backgroundColor: active ? `${opt.color}18` : 'transparent',
                  border: `1.5px solid ${active ? opt.color : border}`,
                  color: active ? opt.color : muted,
                  transition: 'all 0.15s',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de parcelas */}
      {payments.length > 0 && (
        <div style={card}>
          <p style={{ ...label, marginBottom: '12px' }}>Parcelas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${border}` }}>
            {payments.map((p) => {
              const isPaid    = p.status === 'paid'
              const isOverdue = p.status === 'overdue'
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '9px 12px',
                  backgroundColor: isDark ? '#111110' : '#ffffff',
                  borderBottom: `1px solid ${border}`,
                }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isPaid ? '#0a1f0e' : isOverdue ? '#2a0a0a' : isDark ? '#1e1e1c' : '#f3f4f6',
                    border: `1.5px solid ${isPaid ? '#2c5545' : isOverdue ? '#6b1212' : border}`,
                  }}>
                    {isPaid
                      ? <Check size={10} color="#2c5545" strokeWidth={3} />
                      : <span style={{ fontSize: '9px', fontWeight: 700, color: isOverdue ? '#a83535' : muted }}>{p.installment_no}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', fontWeight: 500, color: text }}>Parcela {p.installment_no}</p>
                    <p style={{ fontSize: '10px', color: muted }}>Vence {fmtDate(p.due_date)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, fontFamily: "'Geist Mono', monospace", color: isPaid ? '#2c5545' : isOverdue ? '#a83535' : text }}>{fmtBRL(p.amount)}</p>
                    {isPaid && p.paid_at && (
                      <p style={{ fontSize: '10px', color: muted }}>Pago {fmtDate(p.paid_at)}</p>
                    )}
                    {isOverdue && (
                      <p style={{ fontSize: '10px', color: '#a83535', fontWeight: 600 }}>Em atraso</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {progress === 100 && (
        <div style={{ ...card, backgroundColor: isDark ? '#0a1f0e' : '#f0fdf4', border: `1px solid ${isDark ? '#14532d' : '#bbf7d0'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle2 size={20} color="#2c5545" />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#2c5545' }}>Contrato quitado</p>
            <p style={{ fontSize: '11px', color: '#2c5545', opacity: 0.7 }}>Todas as parcelas foram pagas. Contrato marcado como concluído.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type RenewalTab = 'dados' | 'proposta' | 'materiais' | 'cobranca'

export function ClientRenovacaoPage() {
  const { id }           = useParams<{ id: string }>()
  const navigate         = useNavigate()
  const isDark           = useThemeStore((s) => s.isDark)
  const deal             = useDealStore((s) => s.deals.find((d) => d.id === id))
  const dealsLoading     = useDealStore((s) => s.isLoading)
  const dealsInitialized = useDealStore((s) => s.initialized)
  const fetchActivities  = useActivityStore((s) => s.fetchForDeal)

  const [tab, setTab] = useState<RenewalTab>('dados')

  useEffect(() => { if (id) fetchActivities(id) }, [id, fetchActivities])

  if (dealsLoading || !dealsInitialized) {
    return <PageLoadingState title="Carregando cliente" description="Preparando os dados do cliente." />
  }

  if (!deal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#8a857d' }}>Cliente não encontrado</p>
        <button type="button" onClick={() => navigate('/pipeline')}
          style={{ fontSize: '12px', color: '#6b1212', background: 'none', border: 'none', cursor: 'pointer' }}>
          Voltar ao Pipeline
        </button>
      </div>
    )
  }

  const border   = isDark ? '#242422' : '#e4e0da'
  const text     = isDark ? '#e8e4dc' : '#1a1814'
  const muted    = isDark ? '#6b6560' : '#8a857d'
  const inputBg  = isDark ? '#111110' : '#f8f7f4'
  const pageBg   = isDark ? '#0d0c0a' : '#f9fafb'
  const cardBg   = isDark ? '#161614' : '#ffffff'

  const company    = deal.company_name || deal.title
  const initials   = company.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
  const avatarCol  = hashColor(company)

  const daysSinceWon = deal.updated_at
    ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86_400_000)
    : 0

  const TABS: { id: RenewalTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dados',      label: 'Dados',              icon: <Users size={13} /> },
    { id: 'proposta',   label: 'Proposta',            icon: <FileText size={13} /> },
    { id: 'cobranca',   label: 'Cobrança',            icon: <CreditCard size={13} /> },
    { id: 'materiais',  label: 'Materiais & Entrega', icon: <CheckSquare size={13} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: pageBg }}>

      {/* ── Hero header ── */}
      <div style={{
        backgroundColor: cardBg,
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
      }}>
        {/* Breadcrumb */}
        <div style={{ padding: '10px 24px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button type="button" onClick={() => navigate('/pipeline')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={11} /> Pipeline
          </button>
          <span style={{ fontSize: '11px', color: isDark ? '#2a2a28' : '#d1d5db' }}>/</span>
          <span style={{ fontSize: '11px', color: muted }}>Renovação</span>
          <span style={{ fontSize: '11px', color: isDark ? '#2a2a28' : '#d1d5db' }}>/</span>
          <span style={{ fontSize: '11px', color: text, fontWeight: 500 }}>{company}</span>
        </div>

        {/* Hero */}
        <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px', backgroundColor: avatarCol, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '20px', fontWeight: 700,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: text, letterSpacing: '-0.03em', margin: 0 }}>
                {company}
              </h1>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: 700, color: '#2c5545',
                backgroundColor: isDark ? '#0a1f0e' : '#f0fdf4',
                border: `1px solid ${isDark ? '#14532d' : '#bbf7d0'}`,
                borderRadius: '999px', padding: '2px 8px',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                <RefreshCcw size={9} /> Cliente activo
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', flexWrap: 'wrap' }}>
              {deal.company_sector && <span style={{ fontSize: '12px', color: muted }}>{deal.company_sector}</span>}
              <span style={{ fontSize: '12px', fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: '#6b1212' }}>
                {fmtBRL(deal.value ?? 0)}
              </span>
              <span style={{ fontSize: '12px', color: muted }}>{daysSinceWon}d como cliente</span>
              {deal.owner?.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: deal.owner.avatar_color ?? '#6b6560', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 700, color: '#fff' }}>
                    {deal.owner.initials}
                  </div>
                  <span style={{ fontSize: '12px', color: muted }}>{deal.owner.name.split(' ')[0]}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {deal.contact_email && (
              <button type="button" onClick={() => navigate(`/email?to=${encodeURIComponent(deal.contact_email!)}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '30px', padding: '0 12px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', fontSize: '12px', fontWeight: 500, color: muted, cursor: 'pointer' }}>
                <Mail size={12} /> Email
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '0 20px', marginTop: '12px', gap: '2px' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                height: '40px', padding: '0 16px', borderRadius: '0',
                border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                fontSize: '13px', fontWeight: tab === t.id ? 600 : 500,
                color: tab === t.id ? '#6b1212' : muted,
                borderBottom: tab === t.id ? '2px solid #6b1212' : '2px solid transparent',
                marginBottom: '-1px', whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => { if (tab !== t.id) e.currentTarget.style.color = text }}
              onMouseLeave={(e) => { if (tab !== t.id) e.currentTarget.style.color = muted }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {tab === 'dados' && (
          <DadosCliente deal={deal} isDark={isDark} border={border} text={text} muted={muted} />
        )}
        {tab === 'proposta' && (
          <PropostaRenovacao deal={deal} isDark={isDark} border={border} text={text} muted={muted} inputBg={inputBg} />
        )}
        {tab === 'cobranca' && (
          <CobrancaTab dealId={deal.id} isDark={isDark} border={border} text={text} muted={muted} />
        )}
        {tab === 'materiais' && (
          <MateriaisEntrega dealId={deal.id} isDark={isDark} border={border} text={text} muted={muted} inputBg={inputBg} />
        )}
      </div>
    </div>
  )
}
