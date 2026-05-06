import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, Search, X, ArrowRight, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { STAGES } from '@/constants/pipeline'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { evaluateDealScore } from '@/lib/dealScore'

const SIZE_LABELS: Record<string, string> = {
  '1-50': '1–50', '51-200': '51–200', '201-1000': '201–1k', '1000+': '1k+',
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

function fmtFull(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)
}

function HealthRing({ score, size = 40 }: { score: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (score / 100)
  const color = score >= 70 ? '#2c5545' : score >= 45 ? '#a88030' : '#b83535'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ClientsPage() {
  const deals          = useVisibleDeals()
  const isDark         = useThemeStore((s) => s.isDark)
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const [searchQuery, setSearchQuery]     = useState(searchParams.get('search') ?? '')
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)

  useEffect(() => {
    const q = searchParams.get('search')
    if (q) setSearchQuery(q)
  }, [searchParams])

  const pageBg   = isDark ? '#0d0c0a' : '#f5f4f0'
  const subtleBg = isDark ? '#111110' : '#f0eeea'
  const expandBg = isDark ? '#111110' : '#f5f4f0'
  const border   = isDark ? '#242422' : '#e8e5df'
  const text     = isDark ? '#e8e4dc' : '#1a1814'
  const muted    = isDark ? '#6b6560' : '#8a857d'
  const inputBg  = isDark ? '#111110' : '#f5f4f0'
  const hoverBg  = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
  const trackBg  = isDark ? '#242422' : '#e8e5df'

  const companies = useMemo(() => {
    const map = new Map<string, {
      name: string
      sector?: string
      size?: string
      contactName?: string
      deals: ReturnType<typeof useVisibleDeals>
      active: number
      won: number
      winRate: number
      avgHealth: number
      latestStage?: string
      pipeline: number
      revenue: number
    }>()

    for (const deal of deals) {
      const name = deal.company_name ?? ''
      if (!name) continue
      const key = name.toLowerCase()
      if (!map.has(key)) {
        map.set(key, {
          name,
          sector:      deal.company_sector ?? undefined,
          size:        deal.company_size   ?? undefined,
          contactName: deal.contact_name   ?? undefined,
          deals: [],
          active: 0, won: 0, winRate: 0, avgHealth: 0,
          latestStage: undefined, pipeline: 0, revenue: 0,
        })
      }
      const entry = map.get(key)!
      if (!entry.contactName && deal.contact_name) entry.contactName = deal.contact_name
      entry.deals.push(deal)
    }

    return [...map.values()]
      .map((c) => {
        const active  = c.deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
        const won     = c.deals.filter((d) => d.stage_id === 'closed_won')
        const closed  = c.deals.filter((d) => ['closed_won', 'closed_lost'].includes(d.stage_id))
        const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0
        const latestStage = [...active].sort((a, b) =>
          STAGES.findIndex((s) => s.id === b.stage_id) - STAGES.findIndex((s) => s.id === a.stage_id)
        )[0]?.stage_id
        const avgHealth = active.length > 0
          ? Math.round(active.reduce((s, d) => s + evaluateDealScore(d), 0) / active.length)
          : 0
        const pipeline = active.reduce((s, d) => s + Number(d.value), 0)
        const revenue  = won.reduce((s, d) => s + Number(d.value), 0)
        return { ...c, active: active.length, won: won.length, winRate, latestStage, avgHealth, pipeline, revenue }
      })
      .sort((a, b) => b.active - a.active || b.avgHealth - a.avgHealth)
  }, [deals])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.sector?.toLowerCase().includes(q) ||
      c.deals.some((d) => d.contact_name?.toLowerCase().includes(q))
    )
  }, [companies, searchQuery])

  const GRID = 'minmax(200px, 2.5fr) minmax(110px, 1fr) 90px 72px 64px 36px'
  const HEADER_STYLE: React.CSSProperties = { fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: pageBg, overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{ padding: '0 20px', height: '64px', minHeight: '64px', flexShrink: 0, borderBottom: `1px solid ${border}`, backgroundColor: pageBg, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <Building2 size={18} color={text} />
            <p style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>Clientes</p>
          </div>
          <p style={{ fontSize: '13px', color: muted, margin: 0 }}>{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#2c5545', backgroundColor: '#2c554514', border: '1px solid #2c554530', borderRadius: '6px', padding: '5px 10px' }}>
            <TrendingUp size={12} />
            {filtered.filter((c) => c.active > 0).length} ativos
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: muted, pointerEvents: 'none' }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar empresa ou contacto..."
              style={{ height: '30px', paddingLeft: '28px', paddingRight: searchQuery ? '28px' : '10px', fontSize: '12px', width: '220px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6b1212' }}
              onBlur={(e) =>  { e.currentTarget.style.borderColor = border }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 0 }}>
                <X size={11} />
              </button>
            )}
          </div>
          <button type="button" onClick={() => navigate('/pipeline')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '30px', padding: '0 12px', backgroundColor: '#6b1212', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
            + Novo Lead
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '8px 20px', gap: '12px', borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 5, backgroundColor: subtleBg }}>
          {['Empresa', 'Setor / Porte', 'Win Rate', 'Saúde', 'Deals', ''].map((h) => (
            <span key={h} style={HEADER_STYLE}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '60px 20px' }}>
            <Building2 size={32} color={isDark ? '#2a2a28' : '#d1cdc8'} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: muted }}>{searchQuery ? 'Sem resultados' : 'Nenhum cliente ainda'}</p>
          </div>
        ) : filtered.map((company) => {
          const stage       = STAGES.find((s) => s.id === company.latestStage)
          const initial     = company.name.trim().charAt(0).toUpperCase()
          const healthColor = company.avgHealth >= 70 ? '#2c5545' : company.avgHealth >= 45 ? '#a88030' : company.active === 0 ? muted : '#b83535'
          const isExpanded  = expandedCompany === company.name

          return (
            <div key={company.name}>
              {/* ── Company row ── */}
              <button
                type="button"
                onClick={() => setExpandedCompany(isExpanded ? null : company.name)}
                style={{
                  display: 'grid', gridTemplateColumns: GRID, gap: '12px',
                  width: '100%', padding: '11px 20px',
                  backgroundColor: isExpanded ? expandBg : 'transparent',
                  borderBottom: `1px solid ${isExpanded ? 'transparent' : border}`,
                  borderLeft: '3px solid transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background-color 0.12s ease',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = hoverBg }}
                onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = isExpanded ? expandBg : 'transparent' }}
              >
                {/* Empresa */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                    background: stage ? `linear-gradient(135deg, ${stage.color}22, ${stage.color}0a)` : (isDark ? '#1e1e1c' : '#eeece8'),
                    border: `1px solid ${stage ? `${stage.color}28` : border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: stage?.color ?? muted,
                  }}>
                    {initial}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {company.name}
                    </p>
                    {company.contactName && (
                      <p style={{ fontSize: '10px', color: muted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {company.contactName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Setor / Porte */}
                <div style={{ minWidth: 0 }}>
                  {company.sector && <p style={{ fontSize: '11px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.sector}</p>}
                  {company.size && <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>{SIZE_LABELS[company.size] ?? company.size}</p>}
                  {!company.sector && !company.size && <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic' }}>—</p>}
                </div>

                {/* Win Rate */}
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: company.winRate >= 50 ? '#2c5545' : '#a88030' }}>
                    {company.winRate}%
                  </p>
                  <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>{company.won} ganhos</p>
                </div>

                {/* Saúde */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {company.active > 0 ? (
                    <>
                      <HealthRing score={company.avgHealth} size={28} />
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: healthColor }}>{company.avgHealth}</p>
                        <div style={{ width: '36px', height: '2px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden', marginTop: '2px' }}>
                          <div style={{ height: '100%', width: `${company.avgHealth}%`, backgroundColor: healthColor, borderRadius: '99px' }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic' }}>—</p>
                  )}
                </div>

                {/* Deals */}
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{company.deals.length}</p>
                  <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>
                    {company.active > 0 ? `${company.active} ativo${company.active > 1 ? 's' : ''}` : 'sem ativos'}
                  </p>
                </div>

                {/* Chevron */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {isExpanded
                    ? <ChevronDown size={14} color={muted} />
                    : <ChevronRight size={14} color={muted} />
                  }
                </div>
              </button>

              {/* ── Expanded deals ── */}
              {isExpanded && (
                <div style={{ backgroundColor: expandBg, borderBottom: `1px solid ${border}`, padding: '4px 20px 12px 62px' }}>
                  {company.pipeline > 0 && (
                    <p style={{ fontSize: '10px', color: muted, marginBottom: '6px', paddingLeft: '10px' }}>
                      {fmt(company.pipeline)} em pipeline · {fmt(company.revenue)} fechado
                    </p>
                  )}
                  {company.deals.map((deal) => {
                    const dealStage = STAGES.find((s) => s.id === deal.stage_id)
                    return (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/deals/${deal.id}`) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          width: '100%', padding: '7px 10px', borderRadius: '6px',
                          backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                          textAlign: 'left', marginBottom: '2px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {dealStage && (
                          <span style={{
                            fontSize: '9px', fontWeight: 700, color: dealStage.color,
                            backgroundColor: `${dealStage.color}18`, borderRadius: '4px',
                            padding: '2px 7px', flexShrink: 0, whiteSpace: 'nowrap',
                          }}>
                            {dealStage.label}
                          </span>
                        )}
                        <p style={{ fontSize: '12px', fontWeight: 500, color: text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {deal.title}
                        </p>
                        {deal.owner && (
                          <div
                            title={deal.owner.name}
                            style={{
                              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                              backgroundColor: deal.owner.avatar_color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '8px', fontWeight: 700, color: '#fff',
                            }}
                          >
                            {deal.owner.initials}
                          </div>
                        )}
                        <p style={{ fontSize: '12px', fontWeight: 600, color: deal.stage_id === 'closed_won' ? '#2d9e6b' : text, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                          {Number(deal.value) > 0 ? fmtFull(Number(deal.value)) : '—'}
                        </p>
                        <ArrowRight size={11} color={muted} style={{ flexShrink: 0 }} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
