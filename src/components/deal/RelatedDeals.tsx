import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Link2, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDealStore } from '@/store/useDealStore'
import { useToastStore } from '@/store/useToastStore'

type RelationType = 'upsell' | 'renewal' | 'subsidiary' | 'duplicate' | 'referral'

interface DealRelation {
  id: string
  deal_id: string
  related_deal_id: string
  relation_type: RelationType
  created_at: string
}

const RELATION_LABELS: Record<RelationType, string> = {
  upsell: 'Upsell', renewal: 'Renovação', subsidiary: 'Subsidiária',
  duplicate: 'Duplicata', referral: 'Indicação',
}
const RELATION_COLORS: Record<RelationType, string> = {
  upsell: '#2c5545', renewal: '#1d4ed8', subsidiary: '#7c3aed',
  duplicate: '#92400e', referral: '#b45309',
}
const RELATION_BG: Record<RelationType, string> = {
  upsell: '#d1fae5', renewal: '#dbeafe', subsidiary: '#ede9fe',
  duplicate: '#fef3c7', referral: '#fef9c3',
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

export function RelatedDeals({ dealId, isDark }: { dealId: string; isDark: boolean }) {
  const navigate    = useNavigate()
  const allDeals    = useDealStore((s) => s.deals)
  const addToast    = useToastStore((s) => s.addToast)

  const [relations, setRelations]       = useState<DealRelation[]>([])
  const [loading, setLoading]           = useState(false)
  const [expanded, setExpanded]         = useState(false)
  const [showAdd, setShowAdd]           = useState(false)
  const [search, setSearch]             = useState('')
  const [relType, setRelType]           = useState<RelationType>('upsell')
  const [saving, setSaving]             = useState(false)

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#5a5652' : '#8a857d'
  const surfBg  = isDark ? '#111110' : '#f9f8f5'
  const hoverBg = isDark ? '#1a1a18' : '#f0ede8'
  const inputBg = isDark ? '#0d0d0b' : '#ffffff'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('deal_relations')
        .select('*')
        .or(`deal_id.eq.${dealId},related_deal_id.eq.${dealId}`)
        .order('created_at', { ascending: false })
      setRelations((data ?? []) as DealRelation[])
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    if (expanded) load()
  }, [expanded, load])

  async function handleLink(relatedId: string) {
    setSaving(true)
    try {
      const { error } = await supabase.from('deal_relations').insert({
        deal_id: dealId, related_deal_id: relatedId, relation_type: relType,
      })
      if (error) throw error
      await load()
      setShowAdd(false)
      setSearch('')
      addToast('Deal vinculado com sucesso', 'success')
    } catch {
      addToast('Erro ao vincular deal', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlink(relationId: string) {
    try {
      await supabase.from('deal_relations').delete().eq('id', relationId)
      setRelations((r) => r.filter((x) => x.id !== relationId))
      addToast('Vínculo removido', 'info')
    } catch {
      addToast('Erro ao remover vínculo', 'error')
    }
  }

  const linkedIds = new Set(relations.map((r) => r.deal_id === dealId ? r.related_deal_id : r.deal_id))
  const candidates = allDeals.filter((d) =>
    d.id !== dealId &&
    !linkedIds.has(d.id) &&
    (d.title.toLowerCase().includes(search.toLowerCase()) || (d.company_name ?? '').toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 8)

  const enriched = relations.map((r) => {
    const otherId = r.deal_id === dealId ? r.related_deal_id : r.deal_id
    const deal    = allDeals.find((d) => d.id === otherId)
    return { ...r, otherDeal: deal, otherId }
  })

  return (
    <div style={{ backgroundColor: surfBg, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link2 style={{ width: '11px', height: '11px', color: muted }} />
          <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Deals Relacionados {relations.length > 0 && !loading ? `(${relations.length})` : ''}
          </p>
        </div>
        <ChevronDown style={{ width: '12px', height: '12px', color: muted, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <p style={{ fontSize: '11px', color: muted, textAlign: 'center', padding: '8px 0' }}>Carregando...</p>
          ) : enriched.length === 0 ? (
            <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic' }}>Nenhum deal vinculado</p>
          ) : enriched.map(({ id, relation_type, otherDeal, otherId }) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', backgroundColor: isDark ? '#111110' : '#f5f4f0', border: `1px solid ${border}` }}>
              <span style={{
                fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', flexShrink: 0,
                backgroundColor: RELATION_BG[relation_type as RelationType],
                color: RELATION_COLORS[relation_type as RelationType],
              }}>{RELATION_LABELS[relation_type as RelationType]}</span>
              <button type="button"
                onClick={() => navigate(`/deal/${otherId}`)}
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
              >
                <p style={{ fontSize: '12px', fontWeight: 600, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {otherDeal?.company_name ?? otherDeal?.title ?? otherId.slice(0, 8)}
                </p>
                {otherDeal && (
                  <p style={{ fontSize: '10px', color: muted }}>{fmtCurrency(Number(otherDeal.value))}</p>
                )}
              </button>
              <button type="button" onClick={() => handleUnlink(id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', background: 'none', border: 'none', cursor: 'pointer', color: muted, flexShrink: 0, borderRadius: '4px' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
              >
                <X style={{ width: '11px', height: '11px' }} />
              </button>
            </div>
          ))}

          {/* Add button */}
          {!showAdd ? (
            <button type="button" onClick={() => setShowAdd(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                width: '100%', height: '28px', padding: '0 10px', fontSize: '11px', fontWeight: 600,
                backgroundColor: 'transparent', border: `1px dashed ${border}`,
                borderRadius: '6px', cursor: 'pointer',
                color: isDark ? '#a0c4b4' : '#2c5545',
              }}>
              <Plus style={{ width: '11px', height: '11px' }} />
              Vincular deal
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: inputBg }}>
              {/* Relation type */}
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as RelationType)}
                style={{ height: '28px', padding: '0 8px', fontSize: '11px', backgroundColor: isDark ? '#1a1a18' : '#f5f4f0', border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none' }}
              >
                {Object.entries(RELATION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {/* Search */}
              <input
                autoFocus
                placeholder="Buscar deal por empresa ou título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: '30px', padding: '0 10px', fontSize: '12px', backgroundColor: isDark ? '#1a1a18' : '#f5f4f0', border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none' }}
              />
              {/* Results */}
              {search.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '160px', overflowY: 'auto' }}>
                  {candidates.length === 0 ? (
                    <p style={{ fontSize: '11px', color: muted, padding: '4px 6px', fontStyle: 'italic' }}>Nenhum resultado</p>
                  ) : candidates.map((d) => (
                    <button key={d.id} type="button"
                      onClick={() => !saving && handleLink(d.id)}
                      disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600, color: text }}>{d.company_name ?? d.title}</span>
                      <span style={{ fontSize: '10px', color: muted, flexShrink: 0 }}>{fmtCurrency(Number(d.value))}</span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => { setShowAdd(false); setSearch('') }}
                style={{ alignSelf: 'flex-end', fontSize: '11px', color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
