import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, TrendingUp, CheckCircle2, Clock, XCircle, ArrowRight, DollarSign } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'

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

type ProposalStatus = 'em_negociacao' | 'proposta_enviada' | 'won' | 'lost'

const STATUS_CFG: Record<ProposalStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  em_negociacao:   { label: 'Em Negociação', color: '#b45309', bg: '#b4530918', icon: <Clock size={11} /> },
  proposta_enviada:{ label: 'Proposta Enviada', color: '#2563eb', bg: '#2563eb18', icon: <FileText size={11} /> },
  won:             { label: 'Ganho',          color: '#15803d', bg: '#15803d18', icon: <CheckCircle2 size={11} /> },
  lost:            { label: 'Perdido',         color: 'var(--brand)', bg: 'var(--brand)18', icon: <XCircle size={11} /> },
}

const PROPOSAL_STAGES = new Set(['proposta_enviada', 'em_negociacao', 'won', 'lost'])

export function PropostasPage() {
  const isDark = useThemeStore((s) => s.isDark)
  const deals = useVisibleDeals()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all')
  const [sort, setSort] = useState<'value' | 'date'>('date')

  const border = isDark ? '#242422' : '#eaecf0'
  const text = isDark ? '#e8e4dc' : '#101828'
  const muted = isDark ? '#6b6560' : '#667085'
  const cardBg = isDark ? '#161614' : '#ffffff'
  const pageBg = isDark ? '#0d0c0a' : '#f9fafb'
  const subtleBg = isDark ? '#111110' : '#f3f4f6'
  const inputBg = isDark ? '#111111' : '#f3f4f6'

  const proposals = useMemo(() => {
    return deals
      .filter((d) => PROPOSAL_STAGES.has(d.stage))
      .map((d) => ({
        ...d,
        status: d.stage as ProposalStatus,
      }))
  }, [deals])

  const filtered = useMemo(() => {
    let list = proposals
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.company_name ?? '').toLowerCase().includes(q) ||
        (p.owner_name ?? '').toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => {
      if (sort === 'value') return (b.value ?? 0) - (a.value ?? 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [proposals, statusFilter, search, sort])

  const stats = useMemo(() => ({
    total: proposals.length,
    totalValue: proposals.reduce((s, p) => s + (p.value ?? 0), 0),
    won: proposals.filter((p) => p.status === 'won').length,
    wonValue: proposals.filter((p) => p.status === 'won').reduce((s, p) => s + (p.value ?? 0), 0),
    pending: proposals.filter((p) => p.status === 'proposta_enviada').length,
    negociacao: proposals.filter((p) => p.status === 'em_negociacao').length,
  }), [proposals])

  const winRate = stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0

  function getInitials(name?: string | null) {
    if (!name) return '?'
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  }

  const STATUS_KEYS = Object.keys(STATUS_CFG) as ProposalStatus[]

  return (
    <div style={{ backgroundColor: pageBg, minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <FileText size={18} color={isDark ? '#fff' : '#101828'} />
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>
              Propostas
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: muted, margin: 0 }}>
            Gestão de propostas comerciais em curso e histórico
          </p>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Propostas', value: stats.total, sub: fmtFull(stats.totalValue), icon: <FileText size={14} />, color: '#667085' },
            { label: 'Enviadas', value: stats.pending, sub: 'aguardando resposta', icon: <ArrowRight size={14} />, color: '#2563eb' },
            { label: 'Negociação', value: stats.negociacao, sub: 'em curso', icon: <TrendingUp size={14} />, color: '#b45309' },
            { label: 'Win Rate', value: `${winRate}%`, sub: `${stats.won} ganhos · ${fmt(stats.wonValue)}`, icon: <CheckCircle2 size={14} />, color: '#15803d' },
          ].map((s) => (
            <div key={s.label} style={{
              backgroundColor: cardBg,
              border: `1px solid ${border}`,
              borderRadius: '10px', padding: '16px',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: s.color }}>
                {s.icon}
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
          backgroundColor: cardBg,
          border: `1px solid ${border}`,
          borderRadius: '10px', padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: muted }} />
            <input
              type="text"
              placeholder="Pesquisar proposta, empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', height: '34px',
                paddingLeft: '32px', paddingRight: '12px',
                backgroundColor: inputBg,
                border: `1px solid ${border}`,
                borderRadius: '7px', fontSize: '13px', color: text,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Status filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                border: `1px solid ${statusFilter === 'all' ? '#101828' : border}`,
                backgroundColor: statusFilter === 'all' ? (isDark ? '#fff' : '#101828') : 'transparent',
                color: statusFilter === 'all' ? (isDark ? '#000' : '#fff') : muted,
                cursor: 'pointer',
              }}
            >Todas</button>
            {STATUS_KEYS.map((k) => {
              const cfg = STATUS_CFG[k]
              const active = statusFilter === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setStatusFilter(k)}
                  style={{
                    padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                    border: `1px solid ${active ? cfg.color : border}`,
                    backgroundColor: active ? cfg.bg : 'transparent',
                    color: active ? cfg.color : muted,
                    cursor: 'pointer',
                  }}
                >{cfg.label}</button>
              )
            })}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {([['date', 'Recentes'], ['value', 'Valor']] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                  border: `1px solid ${sort === k ? '#101828' : border}`,
                  backgroundColor: sort === k ? (isDark ? '#fff' : '#101828') : 'transparent',
                  color: sort === k ? (isDark ? '#000' : '#fff') : muted,
                  cursor: 'pointer',
                }}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{
          backgroundColor: cardBg,
          border: `1px solid ${border}`,
          borderRadius: '10px', overflow: 'hidden',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
            padding: '10px 20px',
            borderBottom: `1px solid ${border}`,
            backgroundColor: subtleBg,
          }}>
            {['Proposta / Empresa', 'Responsável', 'Valor', 'Data', 'Estado'].map((h) => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: muted, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {h}
              </span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: muted, fontSize: '13px' }}>
              Nenhuma proposta encontrada
            </div>
          ) : (
            filtered.map((p, i) => {
              const cfg = STATUS_CFG[p.status]
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/deal/${p.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
                    padding: '14px 20px', width: '100%',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none',
                    backgroundColor: 'transparent', cursor: 'pointer',
                    textAlign: 'left', border: 'none',
                    transition: 'background-color 0.1s ease',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = subtleBg }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {/* Name / company */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    {p.company_name && (
                      <div style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.company_name}
                      </div>
                    )}
                  </div>

                  {/* Owner */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    {p.owner_name ? (
                      <>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '5px', flexShrink: 0,
                          backgroundColor: (p as any).owner_avatar_color ?? '#667085',
                          color: '#fff', fontSize: '9px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {getInitials(p.owner_name)}
                        </div>
                        <span style={{ fontSize: '12px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.owner_name.split(' ')[0]}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', color: muted }}>—</span>
                    )}
                  </div>

                  {/* Value */}
                  <div style={{ fontSize: '13px', fontWeight: 600, color: p.value ? '#15803d' : muted, fontFamily: "'Geist Mono', monospace" }}>
                    {p.value ? fmt(p.value) : '—'}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: '12px', color: muted }}>
                    {dateLabel(p.created_at)}
                  </div>

                  {/* Status badge */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '10px', fontWeight: 600,
                      color: cfg.color, backgroundColor: cfg.bg,
                      borderRadius: '5px', padding: '3px 8px',
                      letterSpacing: '0.02em',
                    }}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {filtered.length > 0 && (
          <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: muted }}>
            {filtered.length} proposta{filtered.length !== 1 ? 's' : ''} · {fmt(filtered.reduce((s, p) => s + (p.value ?? 0), 0))} total
          </div>
        )}
      </div>
    </div>
  )
}
