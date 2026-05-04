import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, TrendingUp, Clock, ArrowRight } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { STAGES } from '@/constants/pipeline'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtFull(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}
function dateLabel(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

const STATUS_CFG: Record<ProposalStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:    { label: 'Enviada', color: '#4d7aa8', bg: '#4d7aa814', icon: <ArrowRight size={11} /> },
  sent:     { label: 'Enviada', color: '#4d7aa8', bg: '#4d7aa814', icon: <ArrowRight size={11} /> },
  accepted: { label: 'Enviada', color: '#4d7aa8', bg: '#4d7aa814', icon: <ArrowRight size={11} /> },
  rejected: { label: 'Enviada', color: '#4d7aa8', bg: '#4d7aa814', icon: <ArrowRight size={11} /> },
}

// Shape stored in localStorage per deal (matches DealDetailPage SavedProposal)
interface StoredProposal {
  id?: string
  status?: string
  createdAt?: string   // DealDetailPage stores camelCase
  created_at?: string  // legacy snake_case fallback
  lines: { description?: string; qty: number; unit_price: number }[]
  discountPct: number
  title?: string
}

interface ProposalRow {
  key: string
  dealId: string
  dealTitle: string
  companyName?: string
  ownerName?: string
  ownerColor?: string
  stageLabel: string
  value: number
  createdAt: string
}

function readProposals(deals: ReturnType<typeof useVisibleDeals>): ProposalRow[] {
  const rows: ProposalRow[] = []
  for (const deal of deals) {
    try {
      const list: StoredProposal[] = JSON.parse(localStorage.getItem(`esq_proposals_v4_${deal.id}`) ?? '[]')
      const stageLabel = STAGES.find((s) => s.id === deal.stage_id)?.label ?? deal.stage_id
      list.forEach((p, idx) => {
        const sub = p.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
        const value = sub - sub * ((p.discountPct ?? 0) / 100)
        rows.push({
          key: `${deal.id}-${idx}`,
          dealId: deal.id,
          dealTitle: p.title ?? deal.title,
          companyName: deal.company_name ?? undefined,
          ownerName: deal.owner?.name ?? undefined,
          ownerColor: deal.owner?.avatar_color ?? undefined,
          stageLabel,
          value,
          createdAt: p.createdAt ?? p.created_at ?? deal.created_at,
        })
      })
    } catch { /* localStorage parse error — skip */ }
  }
  return rows
}

export function PropostasPage() {
  const isDark = useThemeStore((s) => s.isDark)
  const deals = useVisibleDeals()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'value' | 'date'>('date')

  const border   = isDark ? '#242422' : '#eaecf0'
  const text     = isDark ? '#e8e4dc' : '#101828'
  const muted    = isDark ? '#6b6560' : '#667085'
  const cardBg   = isDark ? '#161614' : '#ffffff'
  const pageBg   = isDark ? '#0d0c0a' : '#f9fafb'
  const subtleBg = isDark ? '#111110' : '#f3f4f6'
  const inputBg  = isDark ? '#111111' : '#f3f4f6'

  // Read localStorage only when deal IDs change, not on every deal update
  const dealIdsKey = useMemo(() => deals.map((d) => d.id).join(','), [deals])
  const [proposals, setProposals] = useState<ProposalRow[]>([])
  const dealsRef = useRef(deals)
  dealsRef.current = deals

  useEffect(() => {
    setProposals(readProposals(dealsRef.current))
  }, [dealIdsKey])

  const filtered = useMemo(() => {
    let list = proposals
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        p.dealTitle.toLowerCase().includes(q) ||
        (p.companyName ?? '').toLowerCase().includes(q) ||
        (p.ownerName ?? '').toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) =>
      sort === 'value'
        ? b.value - a.value
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [proposals, search, sort])

  const stats = useMemo(() => ({
    total:      proposals.length,
    totalValue: proposals.reduce((s, p) => s + p.value, 0),
  }), [proposals])

  function getInitials(name?: string) {
    if (!name) return '?'
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div style={{ backgroundColor: pageBg, minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <FileText size={18} color={isDark ? '#e8e4dc' : '#101828'} />
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>
              Propostas Comerciais
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: muted, margin: 0 }}>
            Todos os documentos comerciais criados nos leads
          </p>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Documentos', value: stats.total,    sub: fmtFull(stats.totalValue), icon: <FileText size={14} />,   color: '#6b1212' },
            { label: 'Valor Total',      value: fmt(stats.totalValue), sub: `${stats.total} proposta${stats.total !== 1 ? 's' : ''}`, icon: <TrendingUp size={14} />, color: '#4d7aa8' },
          ].map((s) => (
            <div key={s.label} style={{
              backgroundColor: cardBg, border: `1px solid ${border}`,
              borderRadius: '10px', padding: '16px',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: muted }}>{s.label}</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 600, color: text, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.04em' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{
          backgroundColor: cardBg, border: `1px solid ${border}`,
          borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
        }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: muted }} />
            <input
              type="text"
              placeholder="Pesquisar empresa, lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', height: '34px', paddingLeft: '32px', paddingRight: '12px',
                backgroundColor: inputBg, border: `1px solid ${border}`,
                borderRadius: '7px', fontSize: '13px', color: text,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {([['date', 'Recentes'], ['value', 'Valor']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setSort(k)} style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                border: `1px solid ${sort === k ? '#6b1212' : border}`,
                backgroundColor: sort === k ? '#6b1212' : 'transparent',
                color: sort === k ? '#fff' : muted, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{
          backgroundColor: cardBg, border: `1px solid ${border}`,
          borderRadius: '10px', overflow: 'hidden',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '10px 20px', borderBottom: `1px solid ${border}`,
            backgroundColor: subtleBg,
          }}>
            {['Empresa / Lead', 'Etapa', 'Valor', 'Data'].map((h) => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: muted, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {h}
              </span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: muted, fontSize: '13px' }}>
              {proposals.length === 0
                ? 'Nenhuma proposta criada ainda. Crie propostas dentro do lead em Documentos.'
                : 'Nenhuma proposta corresponde à pesquisa.'}
            </div>
          ) : (
            filtered.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => navigate(`/deal/${p.dealId}`)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  padding: '14px 20px', width: '100%',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none',
                  backgroundColor: 'transparent', cursor: 'pointer',
                  textAlign: 'left', border: 'none', alignItems: 'center',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = subtleBg }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.companyName || p.dealTitle}
                  </div>
                  {p.companyName && p.companyName !== p.dealTitle && (
                    <div style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.dealTitle}
                    </div>
                  )}
                  {p.ownerName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: p.ownerColor ?? '#6b6560', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {getInitials(p.ownerName)}
                      </div>
                      <span style={{ fontSize: '10px', color: muted }}>{p.ownerName.split(' ')[0]}</span>
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '11px', color: muted }}>{p.stageLabel}</span>

                <div style={{ fontSize: '13px', fontWeight: 600, color: p.value > 0 ? '#15803d' : muted, fontFamily: "'Geist Mono', monospace" }}>
                  {p.value > 0 ? fmt(p.value) : '—'}
                </div>

                <div style={{ fontSize: '12px', color: muted }}>
                  {dateLabel(p.createdAt)}
                </div>
              </button>
            ))
          )}
        </div>

        {filtered.length > 0 && (
          <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: muted }}>
            {filtered.length} documento{filtered.length !== 1 ? 's' : ''} · {fmt(filtered.reduce((s, p) => s + p.value, 0))} total
          </div>
        )}
      </div>
    </div>
  )
}
