import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, TrendingUp, X, Zap, LayoutGrid, Users, RefreshCcw } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { useProposalStore } from '@/store/useProposalStore'
import { STAGES } from '@/constants/pipeline'
import { supabase } from '@/lib/supabase'
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
function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProposalRow {
  key: string
  proposalId: string
  proposalStatus: string
  dealId: string
  dealTitle: string
  companyName?: string
  ownerName?: string
  ownerColor?: string
  stageId: string
  stageLabel: string
  value: number
  createdAt: string
  isLatest: boolean
  totalInDeal: number
}

// ─── Funnel ───────────────────────────────────────────────────────────────────

interface FunnelBar {
  stageId: string
  stageLabel: string
  count: number
  value: number
  color: string
}

const STAGE_COLORS: Record<string, string> = {
  leads:         '#4d7aa8',
  prospecting:   '#6b4c8b',
  qualification: '#a88030',
  proposal:      '#c94444',
  negotiation:   '#d4802a',
  closed_won:    '#2c5545',
  closed_lost:   '#6b6560',
}

function ProposalFunnel({
  proposals, activeStage, onSelect, isDark,
}: {
  proposals: ProposalRow[]
  activeStage: string | null
  onSelect: (s: string | null) => void
  isDark: boolean
}) {
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const cardBg = isDark ? '#111110' : '#ffffff'

  const bars = useMemo<FunnelBar[]>(() => {
    const map = new Map<string, { count: number; value: number; label: string }>()
    for (const p of proposals) {
      const existing = map.get(p.stageId)
      if (existing) {
        existing.count++
        existing.value += p.value
      } else {
        map.set(p.stageId, { count: 1, value: p.value, label: p.stageLabel })
      }
    }
    return STAGES
      .filter(s => map.has(s.id))
      .map(s => ({
        stageId: s.id,
        stageLabel: map.get(s.id)!.label,
        count: map.get(s.id)!.count,
        value: map.get(s.id)!.value,
        color: STAGE_COLORS[s.id] ?? '#6b6560',
      }))
      .sort((a, b) => b.value - a.value)
  }, [proposals])

  if (!bars.length) return null

  const maxValue = Math.max(...bars.map(b => b.value), 1)

  return (
    <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px 24px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Funil de Propostas por Etapa</h3>
          <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>Distribuição do valor em pipeline · clica para filtrar</p>
        </div>
        {activeStage && (
          <button type="button" onClick={() => onSelect(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '26px', padding: '0 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted }}>
            <X style={{ width: '10px', height: '10px' }} /> Limpar
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {bars.map(bar => {
          const isActive = activeStage === bar.stageId
          const pct = Math.round((bar.value / maxValue) * 100)
          return (
            <button
              key={bar.stageId}
              type="button"
              onClick={() => onSelect(isActive ? null : bar.stageId)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 12px', borderRadius: '8px',
                border: `1.5px solid ${isActive ? bar.color : (isDark ? '#1e1e1c' : '#eeece8')}`,
                backgroundColor: isActive ? bar.color + '12' : (isDark ? '#161614' : '#faf9f7'),
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = bar.color + '50'; e.currentTarget.style.backgroundColor = bar.color + '08' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = isDark ? '#1e1e1c' : '#eeece8'; e.currentTarget.style.backgroundColor = isDark ? '#161614' : '#faf9f7' } }}
            >
              {/* Color dot */}
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: bar.color, flexShrink: 0 }} />

              {/* Stage name */}
              <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? bar.color : text, width: '110px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bar.stageLabel}</span>

              {/* Bar */}
              <div style={{ flex: 1, height: '5px', borderRadius: '10px', backgroundColor: isDark ? '#242422' : '#e4e0da', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  backgroundColor: bar.color,
                  borderRadius: '10px',
                  transition: 'width 0.5s ease',
                  opacity: isActive ? 1 : 0.65,
                }} />
              </div>

              {/* Count badge */}
              <div style={{
                minWidth: '24px', height: '18px', borderRadius: '4px', flexShrink: 0,
                backgroundColor: isActive ? bar.color + '25' : (isDark ? '#242422' : '#e8e5e0'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: isActive ? bar.color : muted }}>{bar.count}</span>
              </div>

              {/* Value */}
              <span style={{ fontSize: '12px', fontWeight: 700, color: isActive ? bar.color : text, width: '76px', textAlign: 'right', flexShrink: 0, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.02em' }}>
                {fmt(bar.value)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Total row */}
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: muted }}>{proposals.length} proposta{proposals.length !== 1 ? 's' : ''} no total</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: text, fontFamily: "'Geist Mono', monospace" }}>{fmtFull(proposals.reduce((s, p) => s + p.value, 0))}</span>
      </div>
    </div>
  )
}

// ─── Date Presets ─────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  {
    label: 'Hoje',
    apply: () => { const d = toInputDate(new Date()); return { from: d, to: d } },
  },
  {
    label: '7 dias',
    apply: () => {
      const to = new Date()
      const from = new Date(); from.setDate(from.getDate() - 7)
      return { from: toInputDate(from), to: toInputDate(to) }
    },
  },
  {
    label: '30 dias',
    apply: () => {
      const to = new Date()
      const from = new Date(); from.setDate(from.getDate() - 30)
      return { from: toInputDate(from), to: toInputDate(to) }
    },
  },
  {
    label: 'Este mês',
    apply: () => {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: toInputDate(from), to: toInputDate(to) }
    },
  },
]

// ─── DateRangePicker ──────────────────────────────────────────────────────────

function DateRangePicker({ dateFrom, dateTo, onChange, onClear, border, text, muted, inputBg, isDark, isPresetActive }: {
  dateFrom: string; dateTo: string
  onChange: (from: string, to: string) => void
  onClear: () => void
  border: string; text: string; muted: string; inputBg: string; isDark: boolean
  isPresetActive?: boolean
}) {
  const [open, setOpen] = useState(false)
  const hasCustom = !!(dateFrom || dateTo) && !isPresetActive

  function fmt(iso: string) {
    if (!iso) return ''
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }

  const label = hasCustom
    ? `${fmt(dateFrom) || '?'} – ${fmt(dateTo) || '?'}`
    : '···'

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          height: '26px', padding: '0 10px',
          fontSize: '11px', fontWeight: hasCustom ? 700 : 500,
          border: 'none',
          backgroundColor: hasCustom ? '#2c5545' : 'transparent',
          color: hasCustom ? '#fff' : muted,
          cursor: 'pointer', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: '3px',
        }}
        onMouseEnter={e => { if (!hasCustom) e.currentTarget.style.color = text }}
        onMouseLeave={e => { if (!hasCustom) e.currentTarget.style.color = muted }}
      >
        {label}
        {hasCustom && (
          <span
            onClick={e => { e.stopPropagation(); onClear(); setOpen(false) }}
            style={{ display: 'flex', alignItems: 'center', marginLeft: '1px', opacity: 0.8 }}
          >
            <X style={{ width: '9px', height: '9px' }} />
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div style={{
            position: 'absolute', top: '34px', left: 0, zIndex: 100,
            backgroundColor: isDark ? '#111110' : '#ffffff',
            border: `1px solid ${border}`, borderRadius: '10px',
            padding: '14px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '220px',
          }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Intervalo personalizado</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: muted, display: 'block', marginBottom: '4px' }}>De</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => onChange(e.target.value, dateTo)}
                  style={{ width: '100%', height: '30px', padding: '0 8px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: inputBg, fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: muted, display: 'block', marginBottom: '4px' }}>Até</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => onChange(dateFrom, e.target.value)}
                  style={{ width: '100%', height: '30px', padding: '0 8px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: inputBg, fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
              {(dateFrom || dateTo) && (
                <button type="button" onClick={() => { onClear(); setOpen(false) }}
                  style={{ flex: 1, height: '28px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted }}>
                  Limpar
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)}
                style={{ flex: 1, height: '28px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#2c5545', color: '#fff' }}>
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PropostasPage() {
  const isDark = useThemeStore((s) => s.isDark)
  const deals  = useVisibleDeals()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort]     = useState<'value' | 'date'>('date')
  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [realtimePulse, setRealtimePulse] = useState(false)

  const border   = isDark ? '#242422' : '#eaecf0'
  const text     = isDark ? '#e8e4dc' : '#101828'
  const muted    = isDark ? '#6b6560' : '#667085'
  const cardBg   = isDark ? '#161614' : '#ffffff'
  const pageBg   = isDark ? '#0d0c0a' : '#f9fafb'
  const subtleBg = isDark ? '#111110' : '#f3f4f6'
  const inputBg  = isDark ? '#111111' : '#f3f4f6'

  const { byDeal, loadForDeals } = useProposalStore()


  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('proposals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals' },
        (payload) => {
          // Reload the affected deal's proposals
          const dealId = (payload.new as { deal_id?: string })?.deal_id
            ?? (payload.old as { deal_id?: string })?.deal_id
          if (dealId) {
            // Invalidate cache for this deal and reload
            useProposalStore.setState((s) => ({
              byDeal: { ...s.byDeal, [dealId]: undefined as unknown as never[] },
            }))
            loadForDeals([dealId])
          }
          // Visual pulse indicator
          setRealtimePulse(true)
          setTimeout(() => setRealtimePulse(false), 1500)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadForDeals])

  const proposals = useMemo<ProposalRow[]>(() => {
    const rows: ProposalRow[] = []
    for (const deal of deals) {
      const list = byDeal[deal.id] ?? []
      const stage = STAGES.find((s) => s.id === deal.stage_id)

      // Proposta mais recente = actual; restantes = histórico
      const latestId = list.length > 0
        ? list.reduce((a, b) =>
            new Date(a.created_at) > new Date(b.created_at) ? a : b
          ).id
        : null

      list.forEach((p, idx) => {
        const sub = p.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
        const value = sub - sub * ((p.discount_pct ?? 0) / 100)
        rows.push({
          key: `${deal.id}-${idx}`,
          proposalId: p.id,
          proposalStatus: p.status,
          dealId: deal.id,
          dealTitle: p.title || deal.title,
          companyName: deal.company_name ?? undefined,
          ownerName: deal.owner?.name ?? undefined,
          ownerColor: deal.owner?.avatar_color ?? undefined,
          stageId: deal.stage_id,
          stageLabel: stage?.label ?? deal.stage_id,
          value,
          createdAt: p.created_at,
          isLatest: p.id === latestId,
          totalInDeal: list.length,
        })
      })
    }
    return rows
  }, [deals, byDeal])

  const filtered = useMemo(() => {
    let list = proposals

    // Stage filter (from funnel)
    if (stageFilter) {
      list = list.filter(p => p.stageId === stageFilter)
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      list = list.filter(p => new Date(p.createdAt).getTime() >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59').getTime()
      list = list.filter(p => new Date(p.createdAt).getTime() <= to)
    }

    // Text search
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
  }, [proposals, stageFilter, dateFrom, dateTo, search, sort])

  const hasDateFilter = !!(dateFrom || dateTo)

  function getInitials(name?: string) {
    if (!name) return '?'
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div style={{ backgroundColor: pageBg, minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={18} color={isDark ? '#e8e4dc' : '#101828'} />
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>
                Arquivo Comercial
              </h1>
            </div>

            {/* Mesmo grupo de toggle da Pipeline */}
            {(() => {
              const filterBg     = isDark ? '#111111' : '#f5f4f1'
              const filterBorder = isDark ? '#2a2a2a' : '#e0ddd8'
              const filterText   = isDark ? '#888888' : '#6b6560'
              const NAV = [
                { id: 'kanban',    icon: <LayoutGrid size={13} />,  label: 'Jornada',   view: 'kanban' },
                { id: 'clientes',  icon: <Users size={13} />,       label: 'Clientes',  view: 'clientes' },
                { id: 'renovacao', icon: <RefreshCcw size={13} />,  label: 'Renovação', view: 'renovacao' },
                { id: 'propostas', icon: <FileText size={13} />,    label: 'Propostas', view: 'propostas' },
              ]
              return (
                <div style={{ display: 'flex', backgroundColor: filterBg, border: `1px solid ${filterBorder}`, borderRadius: '9px', padding: '3px', gap: '1px' }}>
                  {NAV.map(({ id, icon, label, view }) => {
                    const active = id === 'propostas'
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (view !== 'propostas') {
                            localStorage.setItem('esq_pipeline_view', view)
                            navigate('/pipeline')
                          }
                        }}
                        title={label}
                        style={{
                          width: '32px', height: '28px', borderRadius: '7px', cursor: 'pointer',
                          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: active ? (isDark ? '#2a2a28' : '#fff') : 'transparent',
                          color: active ? (isDark ? '#e8e4dc' : '#101828') : filterText,
                          boxShadow: active ? (isDark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 3px rgba(16,24,40,0.12)') : 'none',
                          opacity: active ? 1 : 0.6,
                          transform: active ? 'scale(1)' : 'scale(0.95)',
                          transition: 'background-color 0.15s, color 0.15s, opacity 0.15s, transform 0.15s',
                        }}
                        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)' } }}
                        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(0.95)' } }}
                      >
                        {icon}
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            {/* Realtime indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '4px' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: realtimePulse ? '#f59e0b' : '#2c5545',
                boxShadow: realtimePulse ? '0 0 0 3px rgba(245,158,11,0.3)' : '0 0 0 3px rgba(44,85,69,0.2)',
                transition: 'all 0.3s',
              }} />
              <span style={{ fontSize: '10px', color: muted, fontWeight: 500 }}>
                {realtimePulse ? 'actualizando...' : 'em directo'}
              </span>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: muted, margin: 0 }}>
            Todos os documentos comerciais criados nos leads
          </p>
        </div>

        {/* KPI cards — compactos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Total Documentos',  value: String(proposals.length), icon: <FileText size={11} />,   color: '#c94444' },
            { label: 'Valor em Pipeline', value: fmt(proposals.filter(p => !['closed_won','closed_lost'].includes(p.stageId)).reduce((s,p) => s+p.value,0)), icon: <TrendingUp size={11} />, color: '#4d7aa8' },
            { label: 'Valor Total',       value: fmt(proposals.reduce((s,p) => s+p.value,0)), icon: <Zap size={11} />, color: '#2c5545' },
          ].map((s) => (
            <div key={s.label} style={{
              backgroundColor: cardBg, border: `1px solid ${border}`,
              borderRadius: '8px', padding: '9px 12px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: text, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '10px', color: muted, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Funnel */}
        <ProposalFunnel
          proposals={proposals}
          activeStage={stageFilter}
          onSelect={setStageFilter}
          isDark={isDark}
        />

        {/* Toolbar */}
        <div style={{
          backgroundColor: cardBg, border: `1px solid ${border}`,
          borderRadius: '10px', padding: '10px 14px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '150px', flexShrink: 0 }}>
            <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: muted }} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', height: '28px', paddingLeft: '25px', paddingRight: '8px',
                backgroundColor: inputBg, border: `1px solid ${border}`,
                borderRadius: '6px', fontSize: '11px', color: text,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Divisor */}
          <div style={{ width: '1px', height: '16px', backgroundColor: border, flexShrink: 0 }} />

          {/* Presets + Período agrupados numa cápsula */}
          <div style={{
            display: 'flex', alignItems: 'center',
            border: `1px solid ${border}`, borderRadius: '20px',
            overflow: 'hidden', flexShrink: 0,
            backgroundColor: isDark ? '#161614' : '#f5f4f0',
          }}>
            {DATE_PRESETS.map((preset) => {
              const isActive = (() => {
                const r = preset.apply()
                return dateFrom === r.from && dateTo === r.to
              })()
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    if (isActive) { setDateFrom(''); setDateTo('') }
                    else { const r = preset.apply(); setDateFrom(r.from); setDateTo(r.to) }
                  }}
                  style={{
                    height: '26px', padding: '0 9px',
                    fontSize: '11px', fontWeight: isActive ? 700 : 500,
                    borderRight: `1px solid ${border}`,
                    borderLeft: 'none', borderTop: 'none', borderBottom: 'none',
                    backgroundColor: isActive ? '#2c5545' : 'transparent',
                    color: isActive ? '#fff' : muted,
                    cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = text }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = muted }}
                >
                  {preset.label}
                </button>
              )
            })}

            {/* Período custom */}
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(from, to) => { setDateFrom(from); setDateTo(to) }}
              onClear={() => { setDateFrom(''); setDateTo('') }}
              border={border}
              text={text}
              muted={muted}
              inputBg={inputBg}
              isDark={isDark}
              isPresetActive={DATE_PRESETS.some(p => { const r = p.apply(); return dateFrom === r.from && dateTo === r.to })}
            />
          </div>

          {/* Sort — push to right */}
          <div style={{ display: 'flex', gap: '3px', marginLeft: 'auto', flexShrink: 0 }}>
            {([['date', 'Recentes'], ['value', 'Valor']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setSort(k)} style={{
                height: '26px', padding: '0 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                border: `1px solid ${sort === k ? '#6b1212' : border}`,
                backgroundColor: sort === k ? '#6b1212' : 'transparent',
                color: sort === k ? '#fff' : muted, cursor: 'pointer', transition: 'all 0.12s',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Chip de etapa activa */}
        {stageFilter && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '22px', padding: '0 10px', borderRadius: '20px', backgroundColor: (STAGE_COLORS[stageFilter] ?? '#6b6560') + '15', border: `1px solid ${(STAGE_COLORS[stageFilter] ?? '#6b6560') + '40'}` }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: STAGE_COLORS[stageFilter] ?? '#6b6560' }} />
              <span style={{ fontSize: '10px', fontWeight: 600, color: STAGE_COLORS[stageFilter] ?? '#6b6560' }}>
                {STAGES.find(s => s.id === stageFilter)?.label ?? stageFilter}
              </span>
              <button type="button" onClick={() => setStageFilter(null)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', color: STAGE_COLORS[stageFilter] ?? '#6b6560', padding: 0 }}>
                <X style={{ width: '9px', height: '9px' }} />
              </button>
            </div>
          </div>
        )}

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
                : 'Nenhuma proposta corresponde aos filtros activos.'}
            </div>
          ) : (
            filtered.map((p, i) => {
              const stageColor = STAGE_COLORS[p.stageId] ?? '#6b6560'
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => navigate(`/deal/${p.dealId}`, { state: { tab: 'proposal', proposalId: p.proposalId } })}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.companyName || p.dealTitle}
                      </div>
                      {p.isLatest && p.totalInDeal > 1 && (
                        <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 700, color: '#ffffff', backgroundColor: '#2c5545', border: '1px solid rgba(44,85,69,0.50)', borderRadius: '999px', padding: '1px 7px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Actual
                        </span>
                      )}
                      {!p.isLatest && (
                        <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 600, color: isDark ? '#5a5550' : '#9a9590', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '999px', padding: '1px 7px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Histórico
                        </span>
                      )}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: stageColor, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: muted }}>{p.stageLabel}</span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 600, color: p.value > 0 ? '#2c5545' : muted, fontFamily: "'Geist Mono', monospace" }}>
                    {p.value > 0 ? fmt(p.value) : '—'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: muted }}>{dateLabel(p.createdAt)}</span>
                    {p.isLatest && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          const { data } = await supabase
                            .from('contracts')
                            .select('signing_token')
                            .eq('deal_id', p.dealId)
                            .eq('status', 'active')
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .single()
                          if (data?.signing_token) {
                            window.open(`/assinar/${data.signing_token}`, '_blank')
                          } else {
                            alert('Contrato ainda não gerado. Mova o deal para "Fechado Ganho" para criar o contrato.')
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          height: '24px', padding: '0 10px', borderRadius: '6px',
                          fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                          border: 'none', backgroundColor: '#2c5545', color: '#fff',
                          flexShrink: 0, whiteSpace: 'nowrap',
                        }}
                      >
                        ↓ Baixar
                      </button>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {filtered.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: muted }}>
              {filtered.length} documento{filtered.length !== 1 ? 's' : ''}
              {(stageFilter || hasDateFilter) && ` filtrado${filtered.length !== 1 ? 's' : ''}`}
            </span>
            <span style={{ fontSize: '12px', color: muted, fontFamily: "'Geist Mono', monospace" }}>
              {fmt(filtered.reduce((s, p) => s + p.value, 0))} total
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
