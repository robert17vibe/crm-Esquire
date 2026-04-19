import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Briefcase, Target, DollarSign, Clock, Award,
  ArrowRight, AlertTriangle, Video, Phone, CheckSquare, Mail,
  GripVertical,
} from 'lucide-react'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { STAGES } from '@/constants/pipeline'

// ─── Constants ────────────────────────────────────────────────────────────────

const QUARTERLY_GOAL    = 15_000_000
const KPI_ORDER_KEY     = 'esq_kpi_order'
const DEFAULT_KPI_ORDER = ['pipeline', 'commit', 'coverage', 'winrate', 'ticket', 'cycle']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso))
}

function daysDiff(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(iso); d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

const ACT_ICONS: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  meeting: Video, call: Phone, task: CheckSquare, email: Mail,
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  accent: string
  isDark: boolean
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function KpiCard({
  label, value, sub, icon: Icon, accent, isDark,
  isDragging, onDragStart, onDragOver, onDrop, onDragEnd,
}: KpiCardProps) {
  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      title="Arraste para reorganizar"
      style={{
        backgroundColor: bg,
        border: `1px solid ${isDragging ? accent : border}`,
        borderRadius: '8px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: 'grab',
        opacity: isDragging ? 0.45 : 1,
        transition: 'border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{
          fontSize: '10px', fontWeight: 600, color: muted,
          textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.2,
        }}>
          {label}
        </p>
        <div style={{
          width: '26px', height: '26px', borderRadius: '6px',
          backgroundColor: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon style={{ width: '12px', height: '12px', color: accent }} />
        </div>
      </div>
      <div>
        <p style={{
          fontSize: '20px', fontWeight: 700, color: text,
          letterSpacing: '-0.02em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </p>
        {sub && (
          <p style={{ fontSize: '10px', color: muted, marginTop: '4px', lineHeight: 1.3 }}>{sub}</p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function KpiSkeleton({ isDark }: { isDark: boolean }) {
  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#242422' : '#e4e0da'
  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ height: '10px', width: '80px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ width: '26px', height: '26px', borderRadius: '6px' }} />
      </div>
      <div>
        <div className="skeleton" style={{ height: '22px', width: '100px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '9px', width: '70px', borderRadius: '4px', marginTop: '6px' }} />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const deals    = useDealStore((s) => s.deals)
  const isDark   = useThemeStore((s) => s.isDark)
  const navigate = useNavigate()

  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 280)
    return () => clearTimeout(t)
  }, [])

  // ── Metrics ────────────────────────────────────────────────────────────────

  const activeDeals  = useMemo(() => deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id)), [deals])
  const valueDeals   = useMemo(() => activeDeals.filter((d) => d.value > 0), [activeDeals])
  const closedWon    = useMemo(() => deals.filter((d) => d.stage_id === 'closed_won'), [deals])
  const closedLost   = useMemo(() => deals.filter((d) => d.stage_id === 'closed_lost'), [deals])
  const commitDeals  = useMemo(() => deals.filter((d) => d.stage_id === 'negotiation'), [deals])

  const pipelineTotal    = useMemo(() => valueDeals.reduce((s, d) => s + d.value, 0), [valueDeals])
  const commitTotal      = useMemo(() => commitDeals.reduce((s, d) => s + d.value, 0), [commitDeals])
  const weightedPipeline = useMemo(() => valueDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0), [valueDeals])
  const coverage         = QUARTERLY_GOAL > 0 ? (commitTotal / QUARTERLY_GOAL) * 100 : 0
  const winRate          = closedWon.length + closedLost.length > 0
    ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100)
    : 0
  const avgTicket = valueDeals.length > 0 ? pipelineTotal / valueDeals.length : 0
  const avgCycle  = valueDeals.length > 0
    ? Math.round(valueDeals.reduce((s, d) => s + d.days_in_stage, 0) / valueDeals.length)
    : 0

  const wonTotal  = useMemo(() => closedWon.reduce((s, d) => s + d.value, 0), [closedWon])
  const lostTotal = useMemo(() => closedLost.reduce((s, d) => s + d.value, 0), [closedLost])

  // ── KPI drag-and-drop ─────────────────────────────────────────────────────

  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(KPI_ORDER_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        if (Array.isArray(parsed) && parsed.length === DEFAULT_KPI_ORDER.length) return parsed
      }
    } catch { /* ignore */ }
    return DEFAULT_KPI_ORDER
  })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragIdx = useRef<number | null>(null)

  const coverageAccent = coverage >= 100 ? '#2d9e6b' : coverage >= 70 ? '#b45309' : (isDark ? '#fc8181' : '#c53030')

  const kpiDefs: Record<string, { label: string; value: string; sub?: string; icon: typeof TrendingUp; accent: string }> = useMemo(() => ({
    pipeline: { label: 'Pipeline Total',    value: fmt(pipelineTotal), sub: `${valueDeals.length} deals ativos`,                icon: TrendingUp, accent: '#2c5545'      },
    commit:   { label: 'Commit Trimestral', value: fmt(commitTotal),   sub: `${commitDeals.length} em fechamento`,              icon: Briefcase,  accent: '#4a7c8a'      },
    coverage: { label: 'Cobertura de Meta', value: `${coverage.toFixed(0)}%`, sub: `Meta Q2: ${fmt(QUARTERLY_GOAL)}`,           icon: Target,     accent: coverageAccent },
    winrate:  { label: 'Win Rate',          value: `${winRate}%`,      sub: `${closedWon.length} ganhos · ${closedLost.length} perdidos`, icon: Award, accent: '#2d9e6b' },
    ticket:   { label: 'Ticket Médio',      value: fmt(avgTicket),     sub: 'média dos ativos com valor',                       icon: DollarSign, accent: '#8b6914'      },
    cycle:    { label: 'Ciclo Médio',       value: `${avgCycle}d`,     sub: 'dias no estágio atual',                            icon: Clock,      accent: '#78909c'      },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pipelineTotal, commitTotal, coverage, winRate, avgTicket, avgCycle])

  function handleDragStart(id: string, idx: number, e: React.DragEvent) {
    dragIdx.current = idx
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(targetIdx: number) {
    if (dragIdx.current === null || dragIdx.current === targetIdx) return
    const next = [...kpiOrder]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(targetIdx, 0, moved)
    setKpiOrder(next)
    localStorage.setItem(KPI_ORDER_KEY, JSON.stringify(next))
  }

  // ── Funnel ────────────────────────────────────────────────────────────────

  const activeStages = STAGES.filter((s) => !s.is_closed)
  const funnelData = useMemo(() => {
    return activeStages.map((stage, i) => {
      const sd       = activeDeals.filter((d) => d.stage_id === stage.id)
      const val      = sd.reduce((s, d) => s + d.value, 0)
      const prevStage = i > 0 ? activeStages[i - 1] : null
      const prevCount = prevStage ? activeDeals.filter((d) => d.stage_id === prevStage.id).length : sd.length
      const convRate  = prevCount > 0 && i > 0 ? Math.round((sd.length / prevCount) * 100) : null
      return { stage, count: sd.length, value: val, convRate }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeals])

  const maxFunnelVal = Math.max(...funnelData.map((f) => f.value), 1)
  const forecastPct  = Math.min((weightedPipeline / QUARTERLY_GOAL) * 100, 100)

  // ── Aging ─────────────────────────────────────────────────────────────────

  const aging = useMemo(
    () => [...valueDeals].sort((a, b) => b.days_in_stage - a.days_in_stage).slice(0, 5),
    [valueDeals],
  )

  // ── Monthly evolution ──────────────────────────────────────────────────────

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {}
    deals.forEach((d) => {
      if (d.value <= 0) return
      const key = d.created_at.slice(0, 7)
      map[key] = (map[key] ?? 0) + d.value
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${key}-01`)),
        value: val,
        key,
      }))
  }, [deals])

  const maxMonthVal    = Math.max(...monthlyData.map((m) => m.value), 1)
  const currentMonthKey = new Date().toISOString().slice(0, 7)

  // ── Risks ──────────────────────────────────────────────────────────────────

  const risks = useMemo(() =>
    deals
      .filter((d) => {
        if (['closed_won', 'closed_lost'].includes(d.stage_id)) return false
        const overdueActivity = d.next_activity && daysDiff(d.next_activity.due_date) < 0
        const stuckLate       = ['negotiation', 'proposal'].includes(d.stage_id) && d.days_in_stage > 60
        return overdueActivity || stuckLate
      })
      .slice(0, 5),
  [deals])

  // ── Upcoming actions ───────────────────────────────────────────────────────

  const upcoming = useMemo(() =>
    deals
      .filter((d) => d.next_activity)
      .map((d) => ({ deal: d, activity: d.next_activity! }))
      .sort((a, b) => a.activity.due_date.localeCompare(b.activity.due_date))
      .slice(0, 6),
  [deals])

  // ── Theme ──────────────────────────────────────────────────────────────────

  const cardBg  = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const trackBg = isDark ? '#1e1e1c' : '#eeece8'
  const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: pageBg }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: '56px', minHeight: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: `1px solid ${border}`,
        backgroundColor: cardBg,
        flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>
            Dashboard Executivo
          </p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '1px', textTransform: 'capitalize' }}>
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
          </p>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 700, color: '#2c5545',
          backgroundColor: isDark ? '#1a2e22' : '#e6f2ee',
          border: `1px solid ${isDark ? '#2c5545' : '#b8d9ce'}`,
          borderRadius: '4px', padding: '3px 10px',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Q2 · 2026
        </span>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>

        {/* Section 1 — KPIs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <GripVertical style={{ width: '11px', height: '11px', color: muted }} />
            <span style={{ fontSize: '10px', color: muted, fontWeight: 500 }}>
              Arraste os cards para reorganizar
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
            {!loaded
              ? DEFAULT_KPI_ORDER.map((id) => <KpiSkeleton key={id} isDark={isDark} />)
              : kpiOrder.map((id, idx) => {
                  const kpi = kpiDefs[id]
                  if (!kpi) return null
                  return (
                    <KpiCard
                      key={id}
                      {...kpi}
                      isDark={isDark}
                      isDragging={draggingId === id}
                      onDragStart={(e) => handleDragStart(id, idx, e)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={() => { dragIdx.current = null; setDraggingId(null) }}
                    />
                  )
                })
            }
          </div>
        </div>

        {/* Section 2 — Funil & Forecast */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '12px' }}>

          {/* Funil */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '14px' }}>
              Funil por Estágio
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {funnelData.map(({ stage, count, value, convRate }) => (
                <div key={stage.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        backgroundColor: stage.color, display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: text }}>{stage.label}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, color: muted,
                        backgroundColor: trackBg, borderRadius: '3px', padding: '1px 5px',
                      }}>
                        {count}
                      </span>
                      {convRate !== null && (
                        <span style={{
                          fontSize: '10px', fontWeight: 600,
                          color: convRate > 60 ? '#2d9e6b' : convRate > 30 ? '#b45309' : (isDark ? '#fc8181' : '#c53030'),
                        }}>
                          {convRate}% conv.
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      color: value > 0 ? text : muted,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {value > 0 ? fmt(value) : '—'}
                    </span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px',
                      width: `${value > 0 ? Math.round((value / maxFunnelVal) * 100) : (count > 0 ? 6 : 0)}%`,
                      backgroundColor: stage.color, opacity: 0.85,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '16px', paddingTop: '14px',
              borderTop: `1px solid ${border}`,
              display: 'flex', gap: '24px',
            }}>
              {[
                { label: 'Total Pipeline', value: fmt(pipelineTotal), color: text },
                { label: 'Ganhos',         value: fmt(wonTotal),      color: '#2d9e6b' },
                { label: 'Perdidos',       value: fmt(lostTotal),     color: isDark ? '#fc8181' : '#c53030' },
                { label: 'Win Rate',       value: `${winRate}%`,      color: text },
              ].map(({ label, value: v, color }) => (
                <div key={label}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>{label}</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Forecast */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '16px' }}>
              Forecast Q2 · 2026
            </p>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                <span style={{ fontSize: '11px', color: muted }}>Pipeline ponderado</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: text, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(weightedPipeline)}
                </span>
              </div>
              <div style={{ height: '8px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  width: `${forecastPct}%`,
                  background: 'linear-gradient(90deg, #2c5545, #4a9080)',
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                <span style={{ fontSize: '10px', color: muted }}>{forecastPct.toFixed(0)}% da meta</span>
                <span style={{ fontSize: '10px', color: muted }}>Meta: {fmt(QUARTERLY_GOAL)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {funnelData.filter((f) => f.value > 0).map(({ stage, count }) => {
                const stageDeals = valueDeals.filter((d) => d.stage_id === stage.id)
                const weighted   = stageDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0)
                const pct        = Math.round((weighted / QUARTERLY_GOAL) * 100)
                return (
                  <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stage.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: muted, flex: 1 }}>{stage.label} ({count})</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: text, fontVariantNumeric: 'tabular-nums', minWidth: '56px', textAlign: 'right' }}>
                      {fmt(weighted)}
                    </span>
                    <span style={{ fontSize: '10px', color: muted, minWidth: '28px', textAlign: 'right' }}>
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Gap para meta
                </span>
                <span style={{
                  fontSize: '13px', fontWeight: 700,
                  color: weightedPipeline >= QUARTERLY_GOAL ? '#2d9e6b' : (isDark ? '#fc8181' : '#c53030'),
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {weightedPipeline >= QUARTERLY_GOAL ? '+' : ''}{fmt(weightedPipeline - QUARTERLY_GOAL)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 — Aging & Evolução mensal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

          {/* Aging */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '12px' }}>
              Aging — Top 5 Paralisados
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {aging.map((deal) => {
                const stage      = STAGES.find((s) => s.id === deal.stage_id)
                const agingColor = deal.days_in_stage > 60 ? (isDark ? '#fc8181' : '#c53030')
                                 : deal.days_in_stage > 30 ? '#b45309' : muted
                return (
                  <button
                    key={deal.id}
                    type="button"
                    onClick={() => navigate(`/deal/${deal.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '8px', borderRadius: '6px',
                      border: 'none', backgroundColor: 'transparent',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trackBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{ width: '3px', height: '32px', borderRadius: '99px', backgroundColor: stage?.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.company_name}
                      </p>
                      <p style={{ fontSize: '10px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.title}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: agingColor }}>{deal.days_in_stage}d</p>
                      <p style={{ fontSize: '10px', color: muted }}>{stage?.label}</p>
                    </div>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      backgroundColor: deal.owner.avatar_color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '7px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {deal.owner.initials}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Evolução mensal */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '12px' }}>
              Evolução Mensal — Pipeline Criado
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '108px' }}>
              {monthlyData.map(({ label, value, key }) => {
                const barH      = Math.max(Math.round((value / maxMonthVal) * 80), 3)
                const isCurrent = key === currentMonthKey
                return (
                  <div
                    key={key}
                    title={`${label}: ${fmt(value)}`}
                    style={{
                      flex: 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                    }}
                  >
                    <div style={{
                      width: '100%',
                      height: `${barH}px`,
                      backgroundColor: isCurrent ? '#4a9080' : '#2c5545',
                      borderRadius: '3px 3px 0 0',
                      opacity: isCurrent ? 1 : 0.7,
                      transition: 'height 0.4s ease',
                    }} />
                    <span style={{
                      fontSize: '9px', color: isCurrent ? text : muted,
                      fontWeight: isCurrent ? 600 : 400, textTransform: 'capitalize',
                    }}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{
              marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${border}`,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '10px', color: muted }}>
                {monthlyData.length} meses analisados
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: text, fontVariantNumeric: 'tabular-nums' }}>
                Total {fmt(monthlyData.reduce((s, m) => s + m.value, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4 — Listas operacionais */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

          {/* Riscos da semana */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{
              padding: '12px 18px', borderBottom: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', gap: '7px',
            }}>
              <AlertTriangle style={{ width: '12px', height: '12px', color: isDark ? '#fc8181' : '#c53030' }} />
              <p style={{ fontSize: '11px', fontWeight: 700, color: text }}>Riscos da Semana</p>
              {risks.length > 0 && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, color: '#fff',
                  backgroundColor: isDark ? '#c53030' : '#c53030',
                  borderRadius: '99px', padding: '1px 6px', marginLeft: 'auto',
                }}>
                  {risks.length}
                </span>
              )}
            </div>
            {risks.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: muted }}>Nenhum risco identificado</p>
              </div>
            ) : (
              risks.map((deal, i) => {
                const stage     = STAGES.find((s) => s.id === deal.stage_id)
                const isOverdue = deal.next_activity && daysDiff(deal.next_activity.due_date) < 0
                const reason    = isOverdue
                  ? `Atividade vencida há ${Math.abs(daysDiff(deal.next_activity!.due_date))}d`
                  : `${deal.days_in_stage}d em ${stage?.label ?? ''} sem avançar`
                return (
                  <button
                    key={deal.id}
                    type="button"
                    onClick={() => navigate(`/deal/${deal.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '10px 18px',
                      borderBottom: i < risks.length - 1 ? `1px solid ${border}` : 'none',
                      backgroundColor: 'transparent', cursor: 'pointer',
                      textAlign: 'left', border: 'none',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trackBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{ width: '3px', height: '28px', borderRadius: '99px', backgroundColor: isDark ? '#fc8181' : '#c53030', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.company_name}
                      </p>
                      <p style={{ fontSize: '10px', color: muted }}>{reason}</p>
                    </div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: text, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(deal.value)}
                    </p>
                  </button>
                )
              })
            )}
          </div>

          {/* Próximas ações */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{
              padding: '12px 18px', borderBottom: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: text }}>Próximas Ações</p>
              <button
                type="button"
                onClick={() => navigate('/pipeline')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  fontSize: '10px', fontWeight: 600, color: muted,
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#2c5545')}
                onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
              >
                Ver pipeline <ArrowRight style={{ width: '10px', height: '10px' }} />
              </button>
            </div>
            {upcoming.map(({ deal, activity }, i) => {
              const diff      = daysDiff(activity.due_date)
              const Icon      = ACT_ICONS[activity.type] ?? CheckSquare
              const urgent    = diff < 0
              const today     = diff === 0
              const dateColor = urgent ? (isDark ? '#fc8181' : '#c53030') : today ? '#b45309' : muted
              return (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => navigate(`/deal/${deal.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 18px',
                    borderBottom: i < upcoming.length - 1 ? `1px solid ${border}` : 'none',
                    backgroundColor: 'transparent', cursor: 'pointer',
                    textAlign: 'left', border: 'none',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trackBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '6px',
                    backgroundColor: `${deal.owner.avatar_color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon style={{ width: '11px', height: '11px', color: deal.owner.avatar_color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deal.company_name}
                    </p>
                    <p style={{ fontSize: '10px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activity.label}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: dateColor }}>
                      {urgent ? `${Math.abs(diff)}d atrás` : today ? 'Hoje' : diff === 1 ? 'Amanhã' : fmtDate(activity.due_date)}
                    </p>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      backgroundColor: deal.owner.avatar_color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '6px', fontWeight: 700,
                      marginTop: '3px', marginLeft: 'auto',
                    }}>
                      {deal.owner.initials}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
