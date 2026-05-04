import { useState, useEffect, useMemo } from 'react'
import { Search, RefreshCw, ChevronDown, ChevronUp, TrendingUp, Users, Target, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/store/useThemeStore'
import { STAGES } from '@/constants/pipeline'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OwnerStats {
  owner_id: string
  owner_name: string
  avatar_color: string
  initials: string
  // Leads
  leads_total: number
  leads_new: number        // no período
  // Propostas
  propostas_enviadas: number
  em_proposta: number
  // Vendas
  ganhos: number
  perdidos: number
  win_rate: number
  // Receita
  valor_ganho: number
  valor_pipeline: number
  // Pipeline snapshot: count per stage (excluindo closed)
  por_etapa: Record<string, number>
}

type Period = '7d' | '30d' | '90d' | 'total'
type SortKey = keyof Omit<OwnerStats, 'owner_id' | 'owner_name' | 'avatar_color' | 'initials' | 'por_etapa'>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue}, 38%, 44%)`
}

function cutoff(p: Period): string | null {
  if (p === 'total') return null
  const d = new Date()
  d.setDate(d.getDate() - (p === '7d' ? 7 : p === '30d' ? 30 : 90))
  return d.toISOString()
}

// Etapas activas (não fechadas) para o mini-pipeline
const ACTIVE_STAGES = STAGES.filter((s) => !s.is_closed)

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminDesempenhoPage() {
  const isDark = useThemeStore((s) => s.isDark)

  const border   = isDark ? '#242422' : '#e4e0da'
  const text      = isDark ? '#e8e4dc' : '#1a1814'
  const muted     = isDark ? '#6b6560' : '#8a857d'
  const faint     = isDark ? '#2a2a28' : '#eeece8'
  const cardBg    = isDark ? '#111110' : '#ffffff'
  const pageBg    = isDark ? '#0d0c0a' : '#f5f4f0'
  const inputBg   = isDark ? '#161614' : '#f8f7f4'
  const headBg    = isDark ? '#0f0e0d' : '#faf9f7'
  const groupLine = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  const [stats, setStats]     = useState<OwnerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<Period>('30d')
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('valor_ganho')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)

    // All deals (no period filter for pipeline snapshot)
    const { data: allDeals } = await supabase
      .from('deals')
      .select('owner_id, owner, stage_id, value, created_at')
      .is('deleted_at', null)

    // Deals within period for "new leads" count
    const since = cutoff(period)
    const periodDeals = since
      ? (allDeals ?? []).filter((d) => d.created_at >= since)
      : (allDeals ?? [])

    // Renewal proposals per deal → map to owner
    const { data: renewals } = await supabase
      .from('renewal_proposals')
      .select('deal_id, deals(owner_id)')

    const renewalsByOwner: Record<string, number> = {}
    renewals?.forEach((r) => {
      const oid = (r.deals as { owner_id?: string } | null)?.owner_id
      if (oid) renewalsByOwner[oid] = (renewalsByOwner[oid] ?? 0) + 1
    })

    const map: Record<string, OwnerStats> = {}

    const ensure = (d: { owner_id?: string | null; owner?: unknown }) => {
      const owner = d.owner as { id?: string; name?: string; avatar_color?: string } | null
      const oid  = d.owner_id ?? owner?.id ?? 'unknown'
      const name = owner?.name ?? 'Desconhecido'
      if (!map[oid]) {
        map[oid] = {
          owner_id: oid, owner_name: name,
          avatar_color: owner?.avatar_color ?? hashColor(name),
          initials: name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
          leads_total: 0, leads_new: 0,
          propostas_enviadas: 0, em_proposta: 0,
          ganhos: 0, perdidos: 0, win_rate: 0,
          valor_ganho: 0, valor_pipeline: 0,
          por_etapa: {},
        }
      }
      return map[oid]
    }

    // All deals → pipeline snapshot + totals
    ;(allDeals ?? []).forEach((d) => {
      const s = ensure(d)
      s.leads_total++
      const val = Number(d.value) || 0
      if (d.stage_id === 'closed_won') {
        s.ganhos++; s.valor_ganho += val
      } else if (d.stage_id === 'closed_lost') {
        s.perdidos++
      } else {
        s.valor_pipeline += val
        s.por_etapa[d.stage_id] = (s.por_etapa[d.stage_id] ?? 0) + 1
        if (d.stage_id === 'proposal' || d.stage_id === 'proposal_sent') s.em_proposta++
      }
    })

    // Period deals → new leads
    periodDeals.forEach((d) => {
      const s = ensure(d)
      if (!['closed_won', 'closed_lost'].includes(d.stage_id)) {
        // already counted above, just mark new
      }
      s.leads_new++
    })

    // Enrich
    Object.values(map).forEach((s) => {
      s.propostas_enviadas = renewalsByOwner[s.owner_id] ?? 0
      const closed = s.ganhos + s.perdidos
      s.win_rate = closed > 0 ? Math.round((s.ganhos / closed) * 100) : 0
    })

    setStats(Object.values(map))
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return stats.filter((s) => !q || s.owner_name.toLowerCase().includes(q))
  }, [stats, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as number
      const bv = b[sortKey] as number
      return sortAsc ? av - bv : bv - av
    })
  }, [filtered, sortKey, sortAsc])

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((v) => !v)
    else { setSortKey(k); setSortAsc(false) }
  }

  const totals = useMemo(() => stats.reduce((a, s) => ({
    leads: a.leads + s.leads_total,
    ganhos: a.ganhos + s.ganhos,
    valor: a.valor + s.valor_ganho,
    pipeline: a.pipeline + s.valor_pipeline,
  }), { leads: 0, ganhos: 0, valor: 0, pipeline: 0 }), [stats])

  function SortBtn({ k, children }: { k: SortKey; children: React.ReactNode }) {
    const active = sortKey === k
    return (
      <button type="button" onClick={() => toggleSort(k)} style={{
        display: 'flex', alignItems: 'center', gap: '3px',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
        color: active ? text : muted, whiteSpace: 'nowrap',
      }}>
        {children}
        {active
          ? (sortAsc ? <ChevronUp style={{ width: '9px', height: '9px' }} /> : <ChevronDown style={{ width: '9px', height: '9px' }} />)
          : <ChevronDown style={{ width: '9px', height: '9px', opacity: 0.3 }} />}
      </button>
    )
  }

  const PERIOD_OPTS: { v: Period; l: string }[] = [
    { v: '7d', l: '7 dias' }, { v: '30d', l: '30 dias' },
    { v: '90d', l: '90 dias' }, { v: 'total', l: 'Tudo' },
  ]

  return (
    <div style={{ minHeight: '100%', backgroundColor: pageBg, display: 'flex', flexDirection: 'column' }}>

      {/* ── Top summary bar ── */}
      <div style={{ backgroundColor: cardBg, borderBottom: `1px solid ${border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '0', flexShrink: 0 }}>

        {/* Title */}
        <div style={{ marginRight: '32px' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: text, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Desempenho</p>
          <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>Métricas por responsável</p>
        </div>

        <div style={{ width: '1px', height: '36px', backgroundColor: border, marginRight: '32px', flexShrink: 0 }} />

        {/* KPI pills */}
        {[
          { icon: Users,      color: '#4d7aa8', label: 'Leads activos', value: totals.leads },
          { icon: Target,     color: '#2a9a5a', label: 'Fechados',      value: totals.ganhos },
          { icon: DollarSign, color: '#b83535', label: 'Receita',        value: totals.valor,    fmt: fmtBRL },
          { icon: TrendingUp, color: '#a88030', label: 'Pipeline',       value: totals.pipeline, fmt: fmtBRL },
        ].map(({ icon: Icon, color, label, value, fmt }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '28px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', backgroundColor: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: '14px', height: '14px', color }} />
            </div>
            <div>
              <p style={{ fontSize: '11px', color: muted, lineHeight: 1 }}>{label}</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                {fmt ? fmt(value) : value}
              </p>
            </div>
          </div>
        ))}

        {/* spacer */}
        <div style={{ flex: 1 }} />

        {/* Period selector */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: faint, padding: '3px', borderRadius: '10px', border: `1px solid ${border}` }}>
          {PERIOD_OPTS.map(({ v, l }) => (
            <button key={v} type="button" onClick={() => setPeriod(v)}
              style={{
                height: '26px', padding: '0 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.12s',
                backgroundColor: period === v ? cardBg : 'transparent',
                color: period === v ? text : muted,
                boxShadow: period === v ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button type="button" onClick={load} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', color: muted, marginLeft: '10px' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = text; e.currentTarget.style.color = text }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted }}>
          <RefreshCw style={{ width: '13px', height: '13px' }} />
        </button>
      </div>

      {/* ── Search bar ── */}
      <div style={{ padding: '12px 24px', borderBottom: `1px solid ${border}`, backgroundColor: cardBg, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '34px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: inputBg, padding: '0 12px', maxWidth: '320px' }}>
          <Search style={{ width: '13px', height: '13px', color: muted, flexShrink: 0 }} />
          <input
            type="text" placeholder="Buscar responsável..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '12px', color: text }}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden', minWidth: '900px' }}>

          {/* Column group headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1px 130px 1px 150px 1px 180px 1px 160px', backgroundColor: headBg, borderBottom: `1px solid ${border}` }}>
            {[
              { label: '',            cols: '220px', main: true },
              { label: 'LEADS',       cols: '130px', color: '#4d7aa8' },
              { label: 'PROPOSTAS',   cols: '150px', color: '#a88030' },
              { label: 'VENDAS',      cols: '180px', color: '#2a9a5a' },
              { label: 'RECEITA',     cols: '160px', color: '#b83535' },
            ].map(({ label, color }, i) => (
              <>
                {i > 0 && <div key={`sep-${i}`} style={{ width: '1px', backgroundColor: groupLine, alignSelf: 'stretch' }} />}
                <div key={label || 'resp'} style={{ padding: label ? '8px 14px 6px' : '8px 14px 6px', display: 'flex', alignItems: 'center' }}>
                  {label && (
                    <span style={{
                      fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em',
                      color: color, textTransform: 'uppercase',
                      borderBottom: `2px solid ${color}40`, paddingBottom: '2px',
                    }}>{label}</span>
                  )}
                </div>
              </>
            ))}
          </div>

          {/* Column sub-headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1px 65px 65px 1px 75px 75px 1px 60px 60px 60px 1px 90px 70px', backgroundColor: headBg, borderBottom: `1px solid ${border}` }}>
            <div style={{ padding: '6px 14px 8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Responsável</span>
            </div>
            <div style={{ width: '1px', backgroundColor: groupLine }} />
            {/* Leads */}
            <div style={{ padding: '6px 8px 8px' }}><SortBtn k="leads_total">Total</SortBtn></div>
            <div style={{ padding: '6px 8px 8px' }}><SortBtn k="leads_new">Novos</SortBtn></div>
            <div style={{ width: '1px', backgroundColor: groupLine }} />
            {/* Propostas */}
            <div style={{ padding: '6px 8px 8px' }}><SortBtn k="propostas_enviadas">Enviadas</SortBtn></div>
            <div style={{ padding: '6px 8px 8px' }}><SortBtn k="em_proposta">Abertas</SortBtn></div>
            <div style={{ width: '1px', backgroundColor: groupLine }} />
            {/* Vendas */}
            <div style={{ padding: '6px 8px 8px' }}><SortBtn k="ganhos">Ganhos</SortBtn></div>
            <div style={{ padding: '6px 8px 8px' }}><SortBtn k="perdidos">Perdidos</SortBtn></div>
            <div style={{ padding: '6px 8px 8px' }}><SortBtn k="win_rate">Win %</SortBtn></div>
            <div style={{ width: '1px', backgroundColor: groupLine }} />
            {/* Receita */}
            <div style={{ padding: '6px 8px 8px' }}><SortBtn k="valor_ganho">Ganho</SortBtn></div>
            <div style={{ padding: '6px 8px 8px' }}><SortBtn k="valor_pipeline">Pipeline</SortBtn></div>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: muted }}>Carregando...</p>
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: muted, fontStyle: 'italic' }}>Sem dados para o período</p>
            </div>
          ) : sorted.map((s, i) => {
            const wr      = s.win_rate
            const wrColor = wr >= 60 ? '#2a9a5a' : wr >= 35 ? '#a88030' : '#b83535'
            const isLast  = i === sorted.length - 1
            const rank    = i + 1

            return (
              <div key={s.owner_id}
                style={{ borderBottom: isLast ? 'none' : `1px solid ${border}`, transition: 'background-color 0.1s' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#141412' : '#faf9f7')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1px 65px 65px 1px 75px 75px 1px 60px 60px 60px 1px 90px 70px', alignItems: 'center' }}>

                  {/* Responsável */}
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: s.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                        {s.initials}
                      </div>
                      {rank <= 3 && (
                        <span style={{
                          position: 'absolute', bottom: '-2px', right: '-3px',
                          width: '15px', height: '15px', borderRadius: '50%', fontSize: '8px', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: rank === 1 ? '#c89520' : rank === 2 ? '#8a9098' : '#9a6848',
                          color: '#fff', border: `2px solid ${cardBg}`,
                        }}>{rank}</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.owner_name}</p>
                      {/* Mini pipeline dots */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                        {ACTIVE_STAGES.map((st) => {
                          const count = s.por_etapa[st.id] ?? 0
                          const hasDeals = count > 0
                          return (
                            <div key={st.id} title={`${st.label}: ${count}`}
                              style={{
                                width: hasDeals ? '8px' : '6px',
                                height: hasDeals ? '8px' : '6px',
                                borderRadius: '50%',
                                backgroundColor: hasDeals ? st.color : (isDark ? '#2a2a28' : '#e0dbd4'),
                                flexShrink: 0,
                                transition: 'all 0.15s',
                                boxShadow: hasDeals ? `0 0 0 2px ${st.color}22` : 'none',
                              }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ width: '1px', backgroundColor: groupLine, alignSelf: 'stretch' }} />

                  {/* Leads total */}
                  <div style={{ padding: '12px 8px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>{s.leads_total}</p>
                  </div>
                  {/* Leads novos */}
                  <div style={{ padding: '12px 8px' }}>
                    <p style={{ fontSize: '13px', color: s.leads_new > 0 ? '#4d7aa8' : muted, fontWeight: s.leads_new > 0 ? 600 : 400 }}>
                      {s.leads_new > 0 ? `+${s.leads_new}` : '—'}
                    </p>
                  </div>

                  <div style={{ width: '1px', backgroundColor: groupLine, alignSelf: 'stretch' }} />

                  {/* Propostas enviadas */}
                  <div style={{ padding: '12px 8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: text }}>{s.propostas_enviadas}</p>
                  </div>
                  {/* Em proposta */}
                  <div style={{ padding: '12px 8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: s.em_proposta > 0 ? '#a88030' : muted }}>{s.em_proposta || '—'}</p>
                  </div>

                  <div style={{ width: '1px', backgroundColor: groupLine, alignSelf: 'stretch' }} />

                  {/* Ganhos */}
                  <div style={{ padding: '12px 8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#2a9a5a' }}>{s.ganhos}</p>
                  </div>
                  {/* Perdidos */}
                  <div style={{ padding: '12px 8px' }}>
                    <p style={{ fontSize: '13px', color: s.perdidos > 0 ? '#b83535' : muted }}>{s.perdidos || '—'}</p>
                  </div>
                  {/* Win rate */}
                  <div style={{ padding: '12px 8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: wrColor }}>{s.ganhos + s.perdidos > 0 ? `${wr}%` : '—'}</p>
                    {s.ganhos + s.perdidos > 0 && (
                      <div style={{ height: '2px', borderRadius: '99px', backgroundColor: faint, marginTop: '4px', width: '44px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${wr}%`, backgroundColor: wrColor, borderRadius: '99px' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ width: '1px', backgroundColor: groupLine, alignSelf: 'stretch' }} />

                  {/* Valor ganho */}
                  <div style={{ padding: '12px 8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: s.valor_ganho > 0 ? text : muted }}>{s.valor_ganho > 0 ? fmtBRL(s.valor_ganho) : '—'}</p>
                  </div>
                  {/* Pipeline */}
                  <div style={{ padding: '12px 8px' }}>
                    <p style={{ fontSize: '12px', color: muted }}>{s.valor_pipeline > 0 ? fmtBRL(s.valor_pipeline) : '—'}</p>
                  </div>

                </div>
              </div>
            )
          })}

          {/* Footer total row */}
          {sorted.length > 0 && (
            <div style={{ borderTop: `2px solid ${border}`, backgroundColor: headBg }}>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1px 65px 65px 1px 75px 75px 1px 60px 60px 60px 1px 90px 70px', alignItems: 'center' }}>
                <div style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Total — {sorted.length} responsável{sorted.length !== 1 ? 'is' : ''}
                  </span>
                </div>
                <div style={{ width: '1px', backgroundColor: groupLine, alignSelf: 'stretch' }} />
                <div style={{ padding: '10px 8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>{totals.leads}</p>
                </div>
                <div />
                <div style={{ width: '1px', backgroundColor: groupLine, alignSelf: 'stretch' }} />
                <div style={{ padding: '10px 8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>
                    {stats.reduce((a, s) => a + s.propostas_enviadas, 0)}
                  </p>
                </div>
                <div />
                <div style={{ width: '1px', backgroundColor: groupLine, alignSelf: 'stretch' }} />
                <div style={{ padding: '10px 8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#2a9a5a' }}>{totals.ganhos}</p>
                </div>
                <div />
                <div />
                <div style={{ width: '1px', backgroundColor: groupLine, alignSelf: 'stretch' }} />
                <div style={{ padding: '10px 8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>{fmtBRL(totals.valor)}</p>
                </div>
                <div style={{ padding: '10px 8px' }}>
                  <p style={{ fontSize: '12px', color: muted }}>{fmtBRL(totals.pipeline)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
