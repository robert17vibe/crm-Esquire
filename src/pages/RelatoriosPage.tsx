import { useMemo, useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Target, Award, BarChart2, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { STAGES } from '@/constants/pipeline'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtFull(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

// ─── AreaChart ─────────────────────────────────────────────────────────────────

function AreaChart({ data, color, height = 120, isDark }: { data: { label: string; value: number }[]; color: string; height?: number; isDark: boolean }) {
  const [progress, setProgress] = useState(0)
  useEffect(() => { const t = setTimeout(() => setProgress(100), 80); return () => clearTimeout(t) }, [])
  if (data.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: '12px', color: isDark ? '#667085' : '#98a2b3' }}>Sem dados suficientes</p></div>
  const max = Math.max(...data.map((d) => d.value), 1)
  const W = 100, H = 80
  const pts = data.map((d, i) => ({ x: (i / (data.length - 1)) * W, y: H - 4 - ((d.value / max) * (H - 10)) }))
  const linePath = pts.reduce((p, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
    const prev = pts[i - 1]; const cpx = ((prev.x + pt.x) / 2).toFixed(1)
    return `${p} C ${cpx},${prev.y.toFixed(1)} ${cpx},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
  }, '')
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${H} L 0,${H} Z`
  const gId = `rg${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={isDark ? '0.20' : '0.12'} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <clipPath id={`clip-${gId}`}>
            <rect x="0" y="-10" width={`${progress}%`} height="110" style={{ transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={H - f * (H - 10)} x2={W} y2={H - f * (H - 10)} stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'} strokeWidth="0.5" />
        ))}
        <path d={areaPath} fill={`url(#${gId})`} clipPath={`url(#clip-${gId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#clip-${gId})`} />
        {pts.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r="2.5" fill={color} clipPath={`url(#clip-${gId})`} />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        {data.map((d) => <span key={d.label} style={{ fontSize: '10px', color: isDark ? '#667085' : '#98a2b3' }}>{d.label}</span>)}
      </div>
    </div>
  )
}

// ─── AnimatedBar ───────────────────────────────────────────────────────────────

function AnimatedBars({ data, color, isDark, height = 100 }: { data: { label: string; value: number }[]; color: string; isDark: boolean; height?: number }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(t) }, [])
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height }}>
        {data.map(({ label, value }, i) => {
          const h = animated ? Math.max((value / max) * height, value > 0 ? 4 : 0) : 0
          const isCurrent = i === data.length - 1
          return (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }} title={value > 0 ? fmtFull(value) : '—'}>
              <div style={{ width: '100%', height: `${h}px`, backgroundColor: isCurrent ? '#15803d' : color, borderRadius: '3px 3px 0 0', transition: `height 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms`, opacity: isCurrent ? 1 : 0.7 }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        {data.map(({ label }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: '9px', color: isDark ? '#667085' : '#98a2b3' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent, trend, isDark }: {
  label: string; value: string; sub?: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  accent: string; trend?: { dir: 'up' | 'down' | 'flat'; pct: number }; isDark: boolean
}) {
  const bg = isDark ? '#111110' : '#ffffff'
  const bd = isDark ? 'rgba(255,255,255,0.08)' : '#eaecf0'
  const tx = isDark ? '#e8e4dc' : '#101828'
  const mt = '#667085'
  const trendColor = !trend ? mt : trend.dir === 'up' ? '#15803d' : trend.dir === 'down' ? '#b91c1c' : mt
  const trendBg    = !trend ? 'transparent' : trend.dir === 'up' ? 'rgba(21,128,61,0.08)' : trend.dir === 'down' ? 'rgba(185,28,28,0.08)' : 'rgba(102,112,133,0.08)'
  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${bd}`, borderRadius: '12px', padding: '20px', boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: '16px', height: '16px', color: accent }} />
        </div>
        {trend && <span style={{ fontSize: '11px', fontWeight: 600, color: trendColor, backgroundColor: trendBg, borderRadius: '6px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          {trend.dir === 'up' ? <ArrowUpRight style={{ width: '11px', height: '11px' }} /> : trend.dir === 'down' ? <ArrowDownRight style={{ width: '11px', height: '11px' }} /> : null}
          {trend.pct}%
        </span>}
      </div>
      <p style={{ fontSize: '26px', fontWeight: 600, color: tx, letterSpacing: '-0.03em', lineHeight: 1, fontFamily: "'Geist Mono', ui-monospace, monospace", fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: '12px', fontWeight: 500, color: mt, marginTop: '6px' }}>{label}</p>
      {sub && <p style={{ fontSize: '11px', color: isDark ? '#4a5568' : '#98a2b3', marginTop: '2px' }}>{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RelatoriosPage() {
  const isDark = useThemeStore((s) => s.isDark)
  const { quarterlyGoal } = useSettingsStore()
  const deals = useVisibleDeals()
  const [period, setPeriod] = useState<'30d' | '90d' | '12m'>('90d')

  const bg     = isDark ? '#0a0a08' : '#f9fafb'
  const card   = isDark ? '#111110' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#eaecf0'
  const text   = isDark ? '#e8e4dc' : '#101828'
  const muted  = '#667085'
  const shadow = isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)'
  const track  = isDark ? '#1e1e1c' : '#f3f4f6'

  // period filter
  const periodMs = period === '30d' ? 30 : period === '90d' ? 90 : 365
  const cutoff   = useMemo(() => new Date(Date.now() - periodMs * 86400000).toISOString(), [periodMs])

  const periodDeals  = useMemo(() => deals.filter((d) => d.created_at >= cutoff || d.updated_at >= cutoff), [deals, cutoff])
  const closedWon    = useMemo(() => periodDeals.filter((d) => d.stage_id === 'closed_won'), [periodDeals])
  const closedLost   = useMemo(() => periodDeals.filter((d) => d.stage_id === 'closed_lost'), [periodDeals])
  const activeDeals  = useMemo(() => periodDeals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id)), [periodDeals])

  const wonTotal      = useMemo(() => closedWon.reduce((s, d) => s + Number(d.value), 0), [closedWon])
  const lostTotal     = useMemo(() => closedLost.reduce((s, d) => s + Number(d.value), 0), [closedLost])
  const pipelineTotal = useMemo(() => activeDeals.filter((d) => d.value > 0).reduce((s, d) => s + d.value, 0), [activeDeals])
  const winRate       = closedWon.length + closedLost.length > 0 ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100) : 0
  const avgTicketWon  = closedWon.length > 0 ? wonTotal / closedWon.length : 0
  const goalPct       = quarterlyGoal > 0 ? Math.min((wonTotal / quarterlyGoal) * 100, 999) : 0
  const avgCycle      = activeDeals.length > 0 ? Math.round(activeDeals.reduce((s, d) => s + d.days_in_stage, 0) / activeDeals.length) : 0

  // Monthly series
  const months = useMemo(() => {
    const n = period === '30d' ? 4 : period === '90d' ? 6 : 12
    const now = new Date()
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (n - 1) + i, 1)
      return { key: d.toISOString().slice(0, 7), label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d) }
    })
  }, [period])

  const monthlyWon = useMemo(() => months.map(({ key, label }) => ({
    label, key,
    value: closedWon.filter((d) => d.updated_at.slice(0, 7) === key).reduce((s, d) => s + Number(d.value), 0),
  })), [months, closedWon])

  const monthlyPipeline = useMemo(() => months.map(({ key, label }) => ({
    label, key,
    value: deals.filter((d) => d.created_at.slice(0, 7) === key && d.value > 0).reduce((s, d) => s + d.value, 0),
  })), [months, deals])

  // Funnel by stage
  const funnelData = useMemo(() => STAGES.filter((s) => !s.is_closed).map((stage) => {
    const sd  = activeDeals.filter((d) => d.stage_id === stage.id)
    const val = sd.reduce((s, d) => s + d.value, 0)
    return { stage, count: sd.length, value: val }
  }), [activeDeals])
  const maxFunnel = Math.max(...funnelData.map((f) => f.value), 1)

  // Owner ranking
  const ownerRanking = useMemo(() => {
    const map = new Map<string, { name: string; color: string; initials: string; wonCount: number; wonValue: number; active: number }>()
    periodDeals.forEach((d) => {
      const key = d.owner_id
      if (!map.has(key)) map.set(key, { name: d.owner?.name ?? '—', color: d.owner?.avatar_color ?? '#888', initials: d.owner?.initials ?? '?', wonCount: 0, wonValue: 0, active: 0 })
      const e = map.get(key)!
      if (d.stage_id === 'closed_won') { e.wonCount++; e.wonValue += Number(d.value) }
      else if (!['closed_lost'].includes(d.stage_id)) e.active++
    })
    return [...map.values()].sort((a, b) => b.wonValue - a.wonValue)
  }, [periodDeals])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: bg }}>
      {/* Header */}
      <div style={{ flexShrink: 0, backgroundColor: card, borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0' }}>
          <div>
            <p style={{ fontSize: '18px', fontWeight: 700, color: text, letterSpacing: '-0.03em' }}>Relatórios</p>
            <p style={{ fontSize: '12px', color: muted, marginTop: '2px' }}>Análise de performance e resultados</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', border: `1px solid ${border}`, borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {(['30d', '90d', '12m'] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)} style={{ height: '26px', padding: '0 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: period === p ? 600 : 400, color: period === p ? (isDark ? '#fff' : '#101828') : muted, backgroundColor: period === p ? (isDark ? 'rgba(255,255,255,0.12)' : '#ffffff') : 'transparent', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: period === p && !isDark ? '0 1px 3px rgba(16,24,40,0.08)' : 'none' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: '1px', margin: '14px 0 0' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
          <StatCard label="Ganhos no Período" value={fmtFull(wonTotal)} sub={`${closedWon.length} deals fechados`} icon={DollarSign} accent="#15803d" trend={{ dir: wonTotal > 0 ? 'up' : 'flat', pct: Math.round(goalPct) }} isDark={isDark} />
          <StatCard label="Meta Atingida" value={`${goalPct.toFixed(1)}%`} sub={`Meta: ${fmt(quarterlyGoal)}`} icon={Target} accent={goalPct >= 100 ? '#15803d' : goalPct >= 60 ? '#b45309' : 'var(--brand)'} trend={{ dir: goalPct >= 100 ? 'up' : goalPct >= 60 ? 'flat' : 'down', pct: Math.round(goalPct) }} isDark={isDark} />
          <StatCard label="Win Rate" value={`${winRate}%`} sub={`${closedWon.length} ganhos · ${closedLost.length} perdidos`} icon={Award} accent={winRate >= 40 ? '#15803d' : 'var(--brand)'} trend={{ dir: winRate >= 40 ? 'up' : 'down', pct: winRate }} isDark={isDark} />
          <StatCard label="Ticket Médio" value={avgTicketWon > 0 ? fmtFull(avgTicketWon) : '—'} sub="média dos deals ganhos" icon={TrendingUp} accent="#334155" isDark={isDark} />
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ backgroundColor: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px', boxShadow: shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>Receita Fechada por Mês</p>
                <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Total ganho no período</p>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>{fmtFull(wonTotal)}</span>
            </div>
            <AnimatedBars data={monthlyWon} color="#15803d" isDark={isDark} height={110} />
          </div>
          <div style={{ backgroundColor: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px', boxShadow: shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>Pipeline Criado por Mês</p>
                <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Volume de oportunidades abertas</p>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: text, fontVariantNumeric: 'tabular-nums' }}>{fmt(pipelineTotal)}</span>
            </div>
            <AreaChart data={monthlyPipeline} color="var(--brand)" height={120} isDark={isDark} />
          </div>
        </div>

        {/* Funil + Ranking */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Funil */}
          <div style={{ backgroundColor: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px', boxShadow: shadow }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: text, marginBottom: '16px' }}>Distribuição do Pipeline</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {funnelData.map(({ stage, count, value }) => (
                <div key={stage.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: stage.color }} />
                      <span style={{ fontSize: '12px', color: text }}>{stage.label}</span>
                      <span style={{ fontSize: '10px', color: muted, backgroundColor: track, border: `1px solid ${border}`, borderRadius: '4px', padding: '0 5px' }}>{count}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: value > 0 ? text : muted, fontVariantNumeric: 'tabular-nums' }}>{value > 0 ? fmt(value) : '—'}</span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '99px', backgroundColor: track, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', width: `${value > 0 ? Math.round((value / maxFunnel) * 100) : (count > 0 ? 4 : 0)}%`, backgroundColor: stage.color, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${border}`, display: 'flex', gap: '20px' }}>
              {[{ label: 'Pipeline', v: fmt(pipelineTotal), c: text }, { label: 'Ganhos', v: fmtFull(wonTotal), c: '#15803d' }, { label: 'Perdidos', v: fmt(lostTotal), c: 'var(--brand)' }].map(({ label, v, c }) => (
                <div key={label}>
                  <p style={{ fontSize: '10px', color: muted, marginBottom: '2px' }}>{label}</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking */}
          <div style={{ backgroundColor: card, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: shadow }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 style={{ width: '14px', height: '14px', color: muted }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>Ranking por Operador</p>
            </div>
            {ownerRanking.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: muted }}>Sem dados no período</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 64px 76px', gap: '8px', padding: '8px 20px', borderBottom: `1px solid ${border}` }}>
                  {['Operador', 'Ativos', 'Ganhos', 'Receita'].map((h) => (
                    <span key={h} style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Operador' ? 'left' : 'right' }}>{h}</span>
                  ))}
                </div>
                {ownerRanking.map((o, rank) => {
                  const maxWon = Math.max(...ownerRanking.map((x) => x.wonValue), 1)
                  return (
                    <div key={o.name} style={{ padding: '10px 20px', borderBottom: rank < ownerRanking.length - 1 ? `1px solid ${border}` : 'none' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 64px 76px', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: rank === 0 ? '#b45309' : muted, minWidth: '14px' }}>#{rank + 1}</span>
                          <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 700 }}>{o.initials}</div>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name.split(' ')[0]}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: text, textAlign: 'right' }}>{o.active}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', textAlign: 'right' }}>{o.wonCount}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(o.wonValue)}</span>
                      </div>
                      <div style={{ height: '3px', borderRadius: '99px', backgroundColor: track }}>
                        <div style={{ height: '100%', borderRadius: '99px', width: `${Math.round((o.wonValue / maxWon) * 100)}%`, backgroundColor: o.color, opacity: 0.6, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ciclo médio por etapa */}
        <div style={{ backgroundColor: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px', boxShadow: shadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>Velocidade do Pipeline</p>
              <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Dias médios por etapa — identifique gargalos</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '11px', color: muted }}>Ciclo médio geral</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: text }}>{avgCycle}d</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {STAGES.filter((s) => !s.is_closed).map((stage) => {
              const sd  = activeDeals.filter((d) => d.stage_id === stage.id)
              const avg = sd.length > 0 ? Math.round(sd.reduce((s, d) => s + d.days_in_stage, 0) / sd.length) : null
              const isHot = avg !== null && avg > 60
              return (
                <div key={stage.id} style={{ backgroundColor: track, borderRadius: '10px', padding: '14px', border: `1px solid ${border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: stage.color }} />
                    <span style={{ fontSize: '11px', color: muted, fontWeight: 500 }}>{stage.label}</span>
                  </div>
                  <p style={{ fontSize: '22px', fontWeight: 700, color: isHot ? 'var(--brand)' : text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{avg !== null ? `${avg}d` : '—'}</p>
                  <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>{sd.length} deal{sd.length !== 1 ? 's' : ''}</p>
                  {isHot && <p style={{ fontSize: '9px', fontWeight: 600, color: 'var(--brand)', marginTop: '4px' }}>⚠ Atenção</p>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
