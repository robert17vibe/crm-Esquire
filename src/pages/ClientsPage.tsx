import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2, Search, X,
  Mail, Globe, ArrowRight, ExternalLink, Users, Pencil, Check, Zap,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useDealStore } from '@/store/useDealStore'
import { STAGES } from '@/constants/pipeline'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { evaluateDealScore } from '@/lib/dealScore'


const SIZE_LABELS: Record<string, string> = {
  '1-50': '1–50', '51-200': '51–200', '201-1000': '201–1k', '1000+': '1k+',
}

// ─── Side Panel ───────────────────────────────────────────────────────────────

type Company = {
  name: string
  sector?: string
  size?: string
  website?: string
  contactEmail?: string
  contactName?: string
  contactPhone?: string
  deals: ReturnType<typeof useVisibleDeals>
  active: number
  won: number
  pipeline: number
  revenue: number
  winRate: number
  avgHealth: number
  latestStage?: string
}

function HealthRing({ score, size = 40 }: { score: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (score / 100)
  const color = score >= 70 ? '#2a9a5a' : score >= 45 ? '#a88030' : '#b83535'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

function HealthRingDark({ score, size = 40, isDark }: { score: number; size?: number; isDark: boolean }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (score / 100)
  const color = score >= 70 ? '#2a9a5a' : score >= 45 ? '#a88030' : '#b83535'
  const trackColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

function SidePanel({ company, isDark, onClose }: {
  company: Company
  isDark: boolean
  onClose: () => void
}) {
  const navigate    = useNavigate()
  const updateDeal  = useDealStore((s) => s.updateDeal)
  const border      = isDark ? '#242422' : '#e8e5df'
  const bg          = isDark ? '#111110' : '#ffffff'
  const subtleBg    = isDark ? '#161614' : '#fafaf8'
  const inputBg     = isDark ? '#0d0c0a' : '#f5f4f0'
  const text        = isDark ? '#e8e4dc' : '#1a1814'
  const muted       = isDark ? '#6b6560' : '#8a857d'
  const stage       = STAGES.find((s) => s.id === company.latestStage)

  const [isEditing, setIsEditing] = useState(false)
  const [editName,  setEditName]  = useState(company.contactName  ?? '')
  const [editEmail, setEditEmail] = useState(company.contactEmail ?? '')
  const [editPhone, setEditPhone] = useState(company.contactPhone ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved,     setSaved]     = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await Promise.all(company.deals.map((d) =>
        updateDeal(d.id, {
          contact_name:  editName  || d.contact_name  || '',
          contact_email: editEmail || d.contact_email || '',
          contact_phone: editPhone || d.contact_phone || '',
          company_name:  d.company_name ?? '',
          stage_id:      d.stage_id as 'leads',
        })
      ))
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  const activeDeals = company.deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
  const sortedDeals = [...company.deals].sort((a, b) =>
    STAGES.findIndex((s) => s.id === b.stage_id) - STAGES.findIndex((s) => s.id === a.stage_id)
  )

  const healthScore = company.avgHealth
  const healthColor = healthScore >= 70 ? '#2a9a5a' : healthScore >= 45 ? '#a88030' : '#b83535'
  const healthLabel = healthScore >= 70 ? 'Saudável' : healthScore >= 45 ? 'Atenção' : 'Crítico'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.22)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '400px', zIndex: 50,
        backgroundColor: bg,
        borderLeft: `1px solid ${border}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.14)',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                background: stage
                  ? `linear-gradient(135deg, ${stage.color}22, ${stage.color}0a)`
                  : (isDark ? '#1e1e1c' : '#f3f4f6'),
                border: `1px solid ${stage ? `${stage.color}30` : border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '17px', fontWeight: 700,
                color: stage?.color ?? muted,
              }}>
                {company.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
                  {company.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                  {company.sector && <span style={{ fontSize: '11px', color: muted }}>{company.sector}</span>}
                  {company.sector && company.size && <span style={{ fontSize: '11px', color: isDark ? '#2a2a28' : '#d1d5db' }}>·</span>}
                  {company.size && <span style={{ fontSize: '11px', color: muted }}>{SIZE_LABELS[company.size] ?? company.size} func.</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
              <button type="button" onClick={() => setIsEditing((v) => !v)}
                style={{ width: '28px', height: '28px', borderRadius: '8px', border: `1px solid ${isEditing ? '#6b1212' : border}`, backgroundColor: isEditing ? 'rgba(107,18,18,0.08)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isEditing ? '#6b1212' : muted, transition: 'all 0.15s ease' }}>
                <Pencil size={12} />
              </button>
              <button type="button" onClick={onClose}
                style={{ width: '28px', height: '28px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted }}>
                <X size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Health + Stats row */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          {/* Health score block */}
          <div style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderRight: `1px solid ${border}` }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <HealthRingDark score={healthScore} size={44} isDark={isDark} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: healthColor, fontFamily: "'Geist Mono', monospace" }}>{healthScore}</span>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Saúde</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: healthColor, marginTop: '1px' }}>{healthLabel}</p>
            </div>
          </div>
          {/* Stats */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: border }}>
            {[
              { label: 'Win Rate', value: `${company.winRate}%`, color: company.winRate >= 50 ? '#2a9a5a' : '#a88030' },
              { label: 'Deals', value: String(company.deals.length), color: text },
            ].map((s) => (
              <div key={s.label} style={{ backgroundColor: subtleBg, padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>{s.label}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: s.color, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.03em' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact view */}
        {!isEditing && (company.contactEmail || company.contactName || company.contactPhone || company.website) && (
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              Contacto Principal
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {company.contactName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={11} color={muted} />
                  <span style={{ fontSize: '12px', color: text }}>{company.contactName}</span>
                </div>
              )}
              {company.contactEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={11} color={muted} />
                  <button type="button" onClick={() => navigate(`/email?to=${encodeURIComponent(company.contactEmail!)}`)}
                    style={{ fontSize: '12px', color: '#6b1212', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    {company.contactEmail}
                  </button>
                </div>
              )}
              {company.contactPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: muted, width: '11px', textAlign: 'center', flexShrink: 0 }}>☎</span>
                  <span style={{ fontSize: '12px', color: text }}>{company.contactPhone}</span>
                </div>
              )}
              {company.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={11} color={muted} />
                  <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#6b1212', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {company.website.replace(/^https?:\/\//, '')}
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit form */}
        {isEditing && (
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0, backgroundColor: isDark ? '#0d0c0b' : '#fafaf9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b1212', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Editar contacto
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button type="button" onClick={() => setIsEditing(false)}
                  style={{ height: '26px', padding: '0 10px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', fontSize: '11px', color: muted, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="button" onClick={handleSave} disabled={saving}
                  style={{ height: '26px', padding: '0 12px', borderRadius: '7px', border: 'none', backgroundColor: saving ? '#a0403e' : '#6b1212', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Check size={11} />
                  {saving ? 'A guardar…' : 'Guardar'}
                </button>
              </div>
            </div>
            {saved && (
              <p style={{ fontSize: '11px', color: '#2a9a5a', marginBottom: '8px' }}>✓ Contacto guardado com sucesso</p>
            )}
            {saveError && (
              <p style={{ fontSize: '11px', color: '#b83535', marginBottom: '8px' }}>Erro: {saveError}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Nome do contacto', value: editName,  onChange: setEditName,  placeholder: 'Ex: João Silva' },
                { label: 'Email',            value: editEmail, onChange: setEditEmail, placeholder: 'email@empresa.com' },
                { label: 'Telefone',         value: editPhone, onChange: setEditPhone, placeholder: '+55 11 99999-9999' },
              ].map(({ label, value, onChange, placeholder }) => (
                <div key={label}>
                  <div style={{ fontSize: '10px', color: muted, marginBottom: '4px' }}>{label}</div>
                  <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', height: '32px', padding: '0 10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#6b1212' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = border }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active deals health */}
        {activeDeals.length > 0 && (
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
              <Zap size={10} color="#6b1212" />
              <span style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Saúde por deal ativo
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {activeDeals.map((deal) => {
                const ds = STAGES.find((s) => s.id === deal.stage_id)
                const sc = evaluateDealScore(deal)
                const sc_color = sc >= 70 ? '#2a9a5a' : sc >= 45 ? '#a88030' : '#b83535'
                const trackBg = isDark ? '#1e1e1c' : '#f0eeea'
                return (
                  <div key={deal.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: ds?.color ?? muted, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{deal.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <div style={{ width: '48px', height: '3px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${sc}%`, backgroundColor: sc_color, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: sc_color, fontFamily: "'Geist Mono', monospace", minWidth: '22px', textAlign: 'right' }}>{sc}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Deals list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
            Deals ({company.deals.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {sortedDeals.map((deal) => {
              const ds = STAGES.find((s) => s.id === deal.stage_id)
              const sc = evaluateDealScore(deal)
              const sc_color = sc >= 70 ? '#2a9a5a' : sc >= 45 ? '#a88030' : '#b83535'
              return (
                <button key={deal.id} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '10px', backgroundColor: isDark ? '#161614' : '#fafaf8', border: `1px solid ${border}`, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'border-color 0.12s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6b1212' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = border }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ds?.color ?? '#94a3b8', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deal.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      {ds && <span style={{ fontSize: '10px', color: ds.color, fontWeight: 500 }}>{ds.label}</span>}
                      {deal.owner?.name && <span style={{ fontSize: '10px', color: muted }}>· {deal.owner.name.split(' ')[0]}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: sc_color, fontFamily: "'Geist Mono', monospace" }}>{sc}</span>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sc_color }} />
                  </div>
                  <ArrowRight size={11} color={muted} style={{ flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ClientsPage() {
  const deals         = useVisibleDeals()
  const isDark        = useThemeStore((s) => s.isDark)
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()

  const [searchQuery, setSearchQuery]         = useState(searchParams.get('search') ?? '')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

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
  const companies = useMemo<Company[]>(() => {
    const map = new Map<string, Company>()

    for (const deal of deals) {
      const name = deal.company_name ?? ''
      if (!name) continue
      const key = name.toLowerCase()
      if (!map.has(key)) {
        map.set(key, {
          name,
          sector: deal.company_sector ?? undefined,
          size: deal.company_size ?? undefined,
          website: deal.company_website ?? undefined,
          contactEmail: deal.contact_email ?? undefined,
          contactName: deal.contact_name ?? undefined,
          contactPhone: deal.contact_phone ?? undefined,
          deals: [],
          active: 0, won: 0, pipeline: 0, revenue: 0, winRate: 0, avgHealth: 0,
          latestStage: undefined,
        })
      }
      const entry = map.get(key)!
      if (!entry.contactEmail && deal.contact_email) entry.contactEmail = deal.contact_email
      if (!entry.contactName && deal.contact_name) entry.contactName = deal.contact_name
      if (!entry.contactPhone && deal.contact_phone) entry.contactPhone = deal.contact_phone
      entry.deals.push(deal)
    }

    return [...map.values()]
      .map((c) => {
        const active  = c.deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
        const won     = c.deals.filter((d) => d.stage_id === 'closed_won')
        const closed  = c.deals.filter((d) => ['closed_won', 'closed_lost'].includes(d.stage_id))
        const pipeline = active.reduce((s, d) => s + Number(d.value), 0)
        const revenue  = won.reduce((s, d) => s + Number(d.value), 0)
        const winRate  = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0
        const latestStage = active.sort((a, b) =>
          STAGES.findIndex((s) => s.id === b.stage_id) - STAGES.findIndex((s) => s.id === a.stage_id)
        )[0]?.stage_id
        const avgHealth = active.length > 0
          ? Math.round(active.reduce((s, d) => s + evaluateDealScore(d), 0) / active.length)
          : 0
        return { ...c, active: active.length, won: won.length, pipeline, revenue, winRate, latestStage, avgHealth }
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

  const trackBg = isDark ? '#242422' : '#e8e5df'
  const GRID = 'minmax(200px, 2.5fr) minmax(110px, 1fr) 90px 72px 64px 40px'
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
        <div style={{ position: 'relative' }}>
          <Search size={11} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: muted, pointerEvents: 'none' }} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar empresa ou contacto..."
            style={{ height: '30px', paddingLeft: '28px', paddingRight: searchQuery ? '28px' : '10px', fontSize: '12px', width: '220px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#6b1212' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = border }}
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

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: GRID,
          padding: '8px 20px', gap: '12px',
          borderBottom: `1px solid ${border}`,
          position: 'sticky', top: 0, zIndex: 5,
          backgroundColor: subtleBg,
        }}>
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
          const stage = STAGES.find((s) => s.id === company.latestStage)
          const initial = company.name.trim().charAt(0).toUpperCase()
          const healthColor = company.avgHealth >= 70 ? '#2a9a5a' : company.avgHealth >= 45 ? '#a88030' : company.active === 0 ? muted : '#b83535'
          const isSelected = selectedCompany?.name === company.name
          return (
            <button
              key={company.name}
              type="button"
              onClick={() => setSelectedCompany(isSelected ? null : company)}
              style={{
                display: 'grid', gridTemplateColumns: GRID, gap: '12px',
                width: '100%', padding: '11px 20px',
                backgroundColor: isSelected ? (isDark ? 'rgba(107,18,18,0.12)' : 'rgba(107,18,18,0.05)') : 'transparent',
                borderBottom: `1px solid ${border}`,
                borderLeft: isSelected ? '3px solid #6b1212' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background-color 0.12s ease, border-left-color 0.12s ease',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
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
                <p style={{ fontSize: '13px', fontWeight: 600, color: company.winRate >= 50 ? '#2a9a5a' : '#a88030', fontFamily: "'Geist Mono', monospace" }}>
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
                      <p style={{ fontSize: '12px', fontWeight: 700, color: healthColor, fontFamily: "'Geist Mono', monospace" }}>{company.avgHealth}</p>
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
                <p style={{ fontSize: '13px', fontWeight: 600, color: text, fontFamily: "'Geist Mono', monospace" }}>{company.deals.length}</p>
                <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>
                  {company.active > 0 ? `${company.active} ativo${company.active > 1 ? 's' : ''}` : 'sem ativos'}
                </p>
              </div>

              {/* Arrow */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ArrowRight size={13} color={isSelected ? '#6b1212' : muted} />
              </div>
            </button>
          )
        })}
      </div>

      {selectedCompany && (
        <SidePanel company={selectedCompany} isDark={isDark} onClose={() => setSelectedCompany(null)} />
      )}
    </div>
  )
}
