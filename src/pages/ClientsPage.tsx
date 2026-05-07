import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2, Search, X, TrendingUp,
  Mail, Phone, Globe, Users, ChevronRight,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { STAGES } from '@/constants/pipeline'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { evaluateDealScore } from '@/lib/dealScore'

const SIZE_LABELS: Record<string, string> = {
  '1-50': '1–50', '51-200': '51–200', '201-1000': '201–1k', '1000+': '1k+',
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtFull(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function hashColor(name: string) {
  const colors = ['#2c5545','#4d7aa8','#8b5e3c','#6b4c8b','#a88030','#3c6b6b','#5a7d4d','#8b4545']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return colors[h % colors.length]
}

function HealthBar({ score, isDark }: { score: number; isDark: boolean }) {
  const color = score >= 70 ? '#2c5545' : score >= 45 ? '#a88030' : '#b83535'
  const trackBg = isDark ? '#242422' : '#e8e5df'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
      <div style={{ flex: 1, height: '4px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, backgroundColor: color, borderRadius: '99px', transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', minWidth: '24px', textAlign: 'right' }}>{score}</span>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

type Company = {
  name: string
  sector?: string
  size?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  deals: ReturnType<typeof useVisibleDeals>
  active: number
  won: number
  winRate: number
  avgHealth: number
  latestStage?: string
  pipeline: number
  revenue: number
}

function DetailPanel({
  company, isDark, onClose, onNavigateDeal,
}: {
  company: Company
  isDark: boolean
  onClose: () => void
  onNavigateDeal: (dealId: string) => void
}) {
  const border   = isDark ? '#242422' : '#e4e0da'
  const text     = isDark ? '#e8e4dc' : '#1a1814'
  const muted    = isDark ? '#6b6560' : '#8a857d'
  const subtleBg = isDark ? '#161614' : '#f7f6f3'
  const cardBg   = isDark ? '#111110' : '#ffffff'

  const avatarColor = hashColor(company.name)
  const initial = company.name.trim().charAt(0).toUpperCase()
  const activeDeals = company.deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
  const wonDeals    = company.deals.filter((d) => d.stage_id === 'closed_won')

  const label: React.CSSProperties = {
    fontSize: '10px', fontWeight: 600, color: muted,
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px',
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', zIndex: 50,
      backgroundColor: isDark ? '#0f0e0c' : '#ffffff',
      borderLeft: `1px solid ${border}`,
      display: 'flex', flexDirection: 'column',
      boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
      animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

      {/* Header */}
      <div style={{ padding: '20px 24px 18px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              backgroundColor: avatarColor + '20', border: `1px solid ${avatarColor}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: 700, color: avatarColor,
            }}>
              {initial}
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: text, letterSpacing: '-0.01em', margin: 0 }}>{company.name}</h2>
              {(company.sector || company.size) && (
                <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>
                  {[company.sector, company.size ? SIZE_LABELS[company.size] ?? company.size : undefined].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', color: muted, flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>

        {/* Métricas rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: border, borderRadius: '10px', overflow: 'hidden' }}>
          {[
            { label: 'Win Rate', value: `${company.winRate}%`, sub: `${company.won} ganho${company.won !== 1 ? 's' : ''}`, color: company.winRate >= 50 ? '#2c5545' : '#a88030' },
            { label: 'Deals',    value: `${company.deals.length}`, sub: `${company.active} activo${company.active !== 1 ? 's' : ''}`, color: text },
          ].map((m) => (
            <div key={m.label} style={{ backgroundColor: subtleBg, padding: '12px 14px' }}>
              <p style={{ ...label, marginBottom: '4px' }}>{m.label}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: m.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{m.value}</p>
              <p style={{ fontSize: '10px', color: muted, marginTop: '3px' }}>{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* Contacto principal */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
          <p style={{ ...label, marginBottom: '12px' }}>Contacto Principal</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {company.contactName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Users size={12} color={muted} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>{company.contactName}</span>
              </div>
            )}
            {company.contactEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Mail size={12} color={muted} style={{ flexShrink: 0 }} />
                <a href={`mailto:${company.contactEmail}`}
                  style={{ fontSize: '12px', color: '#4d7aa8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {company.contactEmail}
                </a>
              </div>
            )}
            {company.contactPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Phone size={12} color={muted} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: text }}>{company.contactPhone}</span>
              </div>
            )}
            {company.website && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Globe size={12} color={muted} style={{ flexShrink: 0 }} />
                <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#4d7aa8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {!company.contactName && !company.contactEmail && !company.contactPhone && !company.website && (
              <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Sem informações de contacto</p>
            )}
          </div>
        </div>

        {/* Saúde por deal activo */}
        {activeDeals.length > 0 && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
            <p style={{ ...label, marginBottom: '12px' }}>Saúde por Deal Activo</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeDeals.map((deal) => {
                const score = evaluateDealScore(deal)
                const stage = STAGES.find((s) => s.id === deal.stage_id)
                return (
                  <div key={deal.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                        {deal.title}
                      </span>
                      {stage && (
                        <span style={{ fontSize: '9px', fontWeight: 700, color: stage.color, backgroundColor: `${stage.color}18`, borderRadius: '4px', padding: '2px 6px', flexShrink: 0 }}>
                          {stage.label}
                        </span>
                      )}
                    </div>
                    <HealthBar score={score} isDark={isDark} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Lista de todos os deals */}
        <div>
          <p style={{ ...label, marginBottom: '10px' }}>Deals ({company.deals.length})</p>
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
            {company.deals.map((deal, i) => {
              const stage  = STAGES.find((s) => s.id === deal.stage_id)
              const isLast = i === company.deals.length - 1
              return (
                <button key={deal.id} type="button"
                  onClick={() => onNavigateDeal(deal.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '11px 14px', textAlign: 'left',
                    backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                    borderBottom: isLast ? 'none' : `1px solid ${border}`,
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = subtleBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {stage && (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: stage.color, backgroundColor: `${stage.color}18`, borderRadius: '4px', padding: '2px 7px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {stage.label}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', fontWeight: 500, color: text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {deal.title}
                  </span>
                  {deal.owner && (
                    <div title={deal.owner.name}
                      style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, backgroundColor: deal.owner.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#fff' }}>
                      {deal.owner.initials}
                    </div>
                  )}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: deal.stage_id === 'closed_won' ? '#2c5545' : text, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {Number(deal.value) > 0 ? fmtFull(Number(deal.value)) : '—'}
                  </span>
                  <ChevronRight size={12} color={muted} style={{ flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Pipeline summary */}
        {(company.pipeline > 0 || wonDeals.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
            {[
              { label: 'Em Pipeline', value: fmt(company.pipeline), color: '#4d7aa8' },
              { label: 'Receita Fechada', value: fmt(company.revenue), color: '#2c5545' },
            ].map((s) => (
              <div key={s.label} style={{ backgroundColor: subtleBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '12px 14px' }}>
                <p style={{ ...label, marginBottom: '4px' }}>{s.label}</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ClientsPage({ embedded = false }: { embedded?: boolean }) {
  const deals          = useVisibleDeals()
  const isDark         = useThemeStore((s) => s.isDark)
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '')
  const [selected, setSelected]       = useState<Company | null>(null)

  useEffect(() => {
    const q = searchParams.get('search')
    if (q) setSearchQuery(q)
  }, [searchParams])

  const pageBg   = isDark ? '#0d0c0a' : '#f5f4f0'
  const subtleBg = isDark ? '#111110' : '#f0eeea'
  const border   = isDark ? '#242422' : '#e8e5df'
  const text     = isDark ? '#e8e4dc' : '#1a1814'
  const muted    = isDark ? '#6b6560' : '#8a857d'
  const inputBg  = isDark ? '#111110' : '#f5f4f0'
  const hoverBg  = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'

  const companies = useMemo<Company[]>(() => {
    const map = new Map<string, Company>()

    for (const deal of deals) {
      const name = deal.company_name ?? ''
      if (!name) continue
      const key = name.toLowerCase()
      if (!map.has(key)) {
        map.set(key, {
          name,
          sector:       deal.company_sector   ?? undefined,
          size:         deal.company_size      ?? undefined,
          contactName:  deal.contact_name      ?? undefined,
          contactEmail: deal.contact_email     ?? undefined,
          contactPhone: deal.contact_phone     ?? undefined,
          website:      deal.company_website   ?? undefined,
          deals: [],
          active: 0, won: 0, winRate: 0, avgHealth: 0,
          latestStage: undefined, pipeline: 0, revenue: 0,
        })
      }
      const entry = map.get(key)!
      if (!entry.contactName  && deal.contact_name)    entry.contactName  = deal.contact_name
      if (!entry.contactEmail && deal.contact_email)   entry.contactEmail = deal.contact_email
      if (!entry.contactPhone && deal.contact_phone)   entry.contactPhone = deal.contact_phone
      if (!entry.website      && deal.company_website) entry.website      = deal.company_website
      entry.deals.push(deal)
    }

    return [...map.values()]
      .map((c) => {
        const active   = c.deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
        const won      = c.deals.filter((d) => d.stage_id === 'closed_won')
        const closed   = c.deals.filter((d) => ['closed_won', 'closed_lost'].includes(d.stage_id))
        const winRate  = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0
        const latestStage = [...active].sort((a, b) =>
          STAGES.findIndex((s) => s.id === b.stage_id) - STAGES.findIndex((s) => s.id === a.stage_id)
        )[0]?.stage_id
        const avgHealth = active.length > 0
          ? Math.round(active.reduce((s, d) => s + evaluateDealScore(d), 0) / active.length) : 0
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

  // Sync selected when data updates
  useEffect(() => {
    if (!selected) return
    const updated = companies.find((c) => c.name === selected.name)
    if (updated) setSelected(updated)
  }, [companies]) // eslint-disable-line

  const GRID = 'minmax(200px, 2.5fr) minmax(110px, 1fr) 90px 72px 64px 36px'
  const HEADER_STYLE: React.CSSProperties = { fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: pageBg, overflow: 'hidden' }}>

      {/* ── Left: list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginRight: selected ? '420px' : 0, transition: 'margin-right 0.22s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Top bar */}
        <div style={{ padding: '0 20px', height: '64px', minHeight: '64px', flexShrink: 0, borderBottom: `1px solid ${border}`, backgroundColor: pageBg, display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!embedded && (
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <Building2 size={18} color={text} />
                <p style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>Clientes</p>
              </div>
              <p style={{ fontSize: '13px', color: muted, margin: 0 }}>{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          )}
          <div style={{ flex: embedded ? 1 : undefined, display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            {!embedded && (
              <button type="button" onClick={() => navigate('/pipeline')}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '30px', padding: '0 12px', backgroundColor: '#6b1212', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
                + Novo Lead
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
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
            const trackBg    = isDark ? '#242422' : '#e8e5df'
            const isActive   = selected?.name === company.name

            return (
              <button
                key={company.name}
                type="button"
                onClick={() => setSelected(isActive ? null : company)}
                style={{
                  display: 'grid', gridTemplateColumns: GRID, gap: '12px',
                  width: '100%', padding: '11px 20px',
                  backgroundColor: isActive ? (isDark ? 'rgba(44,85,69,0.06)' : 'rgba(44,85,69,0.04)') : 'transparent',
                  borderBottom: `1px solid ${border}`,
                  borderLeft: isActive ? '3px solid #2c5545' : '3px solid transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background-color 0.12s ease',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = hoverBg }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = isActive ? (isDark ? 'rgba(44,85,69,0.06)' : 'rgba(44,85,69,0.04)') : 'transparent' }}
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
                    <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</p>
                    {company.contactName && (
                      <p style={{ fontSize: '10px', color: muted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.contactName}</p>
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
                  <p style={{ fontSize: '13px', fontWeight: 600, color: company.winRate >= 50 ? '#2c5545' : '#a88030' }}>{company.winRate}%</p>
                  <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>{company.won} ganhos</p>
                </div>

                {/* Saúde */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {company.active > 0 ? (
                    <>
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
                  <ChevronRight size={14} color={isActive ? '#2c5545' : muted} style={{ transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: detail panel ── */}
      {selected && (
        <DetailPanel
          company={selected}
          isDark={isDark}
          onClose={() => setSelected(null)}
          onNavigateDeal={(id) => navigate(`/deals/${id}`)}
        />
      )}
    </div>
  )
}
