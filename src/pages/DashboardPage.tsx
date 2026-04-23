import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Briefcase, Target, DollarSign, Clock, Award,
  ArrowRight, AlertTriangle, Video, Phone, CheckSquare, Mail,
  GripVertical, Trophy, BarChart2, Percent, Check,
} from 'lucide-react'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTaskStore } from '@/store/useTaskStore'
import { STAGES } from '@/constants/pipeline'

// ─── Constants ────────────────────────────────────────────────────────────────

const KPI_ORDER_KEY     = 'esq_kpi_order'
const DEFAULT_KPI_ORDER = ['pipeline', 'commit', 'coverage', 'winrate', 'ticket', 'cycle']

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
        borderRadius: '8px', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        cursor: 'grab', opacity: isDragging ? 0.45 : 1,
        transition: 'border-color 0.15s ease, opacity 0.15s ease',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.2 }}>
          {label}
        </p>
        <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: '12px', height: '12px', color: accent }} />
        </div>
      </div>
      <div>
        <p style={{ fontSize: '20px', fontWeight: 700, color: text, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: '10px', color: muted, marginTop: '4px', lineHeight: 1.3 }}>{sub}</p>}
      </div>
    </div>
  )
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const deals    = useDealStore((s) => s.deals)
  const isDark   = useThemeStore((s) => s.isDark)
  const navigate = useNavigate()
  const { quarterlyGoal } = useSettingsStore()

  const [loaded, setLoaded]   = useState(false)
  const [activeTab, setActiveTab] = useState<'operacao' | 'resultados'>('operacao')

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 280)
    return () => clearTimeout(t)
  }, [])

  // ── Shared Metrics ─────────────────────────────────────────────────────────

  const activeDeals  = useMemo(() => deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id)), [deals])
  const valueDeals   = useMemo(() => activeDeals.filter((d) => d.value > 0), [activeDeals])
  const closedWon    = useMemo(() => deals.filter((d) => d.stage_id === 'closed_won'), [deals])
  const closedLost   = useMemo(() => deals.filter((d) => d.stage_id === 'closed_lost'), [deals])
  const commitDeals  = useMemo(() => deals.filter((d) => d.stage_id === 'negotiation'), [deals])

  const pipelineTotal    = useMemo(() => valueDeals.reduce((s, d) => s + d.value, 0), [valueDeals])
  const commitTotal      = useMemo(() => commitDeals.reduce((s, d) => s + d.value, 0), [commitDeals])
  const weightedPipeline = useMemo(() => valueDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0), [valueDeals])
  const wonTotal         = useMemo(() => closedWon.reduce((s, d) => s + Number(d.value), 0), [closedWon])
  const lostTotal        = useMemo(() => closedLost.reduce((s, d) => s + Number(d.value), 0), [closedLost])
  const coverage         = quarterlyGoal > 0 ? (commitTotal / quarterlyGoal) * 100 : 0
  const winRate          = closedWon.length + closedLost.length > 0
    ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100) : 0
  const avgTicket        = valueDeals.length > 0 ? pipelineTotal / valueDeals.length : 0
  const avgCycle         = valueDeals.length > 0
    ? Math.round(valueDeals.reduce((s, d) => s + d.days_in_stage, 0) / valueDeals.length) : 0

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
    pipeline: { label: 'Pipeline Total',    value: fmt(pipelineTotal), sub: `${valueDeals.length} deals ativos`, icon: TrendingUp, accent: '#2c5545' },
    commit:   { label: 'Commit Trimestral', value: fmt(commitTotal),   sub: `${commitDeals.length} em fechamento`, icon: Briefcase, accent: '#4a7c8a' },
    coverage: { label: 'Cobertura de Meta', value: `${coverage.toFixed(0)}%`, sub: `Meta Q: ${fmt(quarterlyGoal)}`, icon: Target, accent: coverageAccent },
    winrate:  { label: 'Win Rate',          value: `${winRate}%`, sub: `${closedWon.length} ganhos · ${closedLost.length} perdidos`, icon: Award, accent: '#2d9e6b' },
    ticket:   { label: 'Ticket Médio',      value: fmt(avgTicket), sub: 'média dos ativos com valor', icon: DollarSign, accent: '#8b6914' },
    cycle:    { label: 'Ciclo Médio',       value: `${avgCycle}d`, sub: 'dias no estágio atual', icon: Clock, accent: '#78909c' },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pipelineTotal, commitTotal, coverage, winRate, avgTicket, avgCycle])

  function handleDragStart(id: string, idx: number, e: React.DragEvent) {
    dragIdx.current = idx; setDraggingId(id); e.dataTransfer.effectAllowed = 'move'
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
  const funnelData = useMemo(() => activeStages.map((stage, i) => {
    const sd        = activeDeals.filter((d) => d.stage_id === stage.id)
    const val       = sd.reduce((s, d) => s + d.value, 0)
    const prevStage = i > 0 ? activeStages[i - 1] : null
    const prevCount = prevStage ? activeDeals.filter((d) => d.stage_id === prevStage.id).length : sd.length
    const convRate  = prevCount > 0 && i > 0 ? Math.round((sd.length / prevCount) * 100) : null
    return { stage, count: sd.length, value: val, convRate }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [activeDeals])

  const maxFunnelVal  = Math.max(...funnelData.map((f) => f.value), 1)
  const forecastPct   = Math.min((weightedPipeline / quarterlyGoal) * 100, 100)

  // ── Aging ─────────────────────────────────────────────────────────────────

  const aging = useMemo(() => [...valueDeals].sort((a, b) => b.days_in_stage - a.days_in_stage).slice(0, 5), [valueDeals])

  // ── Monthly pipeline created ───────────────────────────────────────────────

  const monthlyPipeline = useMemo(() => {
    const map: Record<string, number> = {}
    deals.forEach((d) => {
      if (d.value <= 0) return
      const key = d.created_at.slice(0, 7)
      map[key] = (map[key] ?? 0) + d.value
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => ({
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${key}-01`)),
      value: val, key,
    }))
  }, [deals])

  // ── Monthly closed won ─────────────────────────────────────────────────────

  const monthlyWon = useMemo(() => {
    const map: Record<string, number> = {}
    closedWon.forEach((d) => {
      const key = d.updated_at.slice(0, 7)
      map[key] = (map[key] ?? 0) + Number(d.value)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => ({
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${key}-01`)),
      value: val, key,
    }))
  }, [closedWon])

  // ── Risks ──────────────────────────────────────────────────────────────────

  const risks = useMemo(() => deals.filter((d) => {
    if (['closed_won', 'closed_lost'].includes(d.stage_id)) return false
    const overdueActivity = d.next_activity && daysDiff(d.next_activity.due_date) < 0
    const stuckLate       = ['negotiation', 'proposal'].includes(d.stage_id) && d.days_in_stage > 60
    return overdueActivity || stuckLate
  }).slice(0, 5), [deals])

  // ── Upcoming ───────────────────────────────────────────────────────────────

  const upcoming = useMemo(() => deals
    .filter((d) => d.next_activity)
    .map((d) => ({ deal: d, activity: d.next_activity! }))
    .sort((a, b) => a.activity.due_date.localeCompare(b.activity.due_date))
    .slice(0, 6),
  [deals])

  // ── Resultados metrics ─────────────────────────────────────────────────────

  const avgTicketWon = closedWon.length > 0 ? wonTotal / closedWon.length : 0
  const goalPct      = quarterlyGoal > 0 ? Math.min((wonTotal / quarterlyGoal) * 100, 999) : 0
  const roiPipeline  = pipelineTotal > 0 ? ((wonTotal / (pipelineTotal + wonTotal)) * 100) : 0



  // ── Stage conversion rates ─────────────────────────────────────────────────

  const stageConversion = useMemo(() => {
    const total = deals.length
    return STAGES.filter((s) => !s.is_closed).map((stage) => {
      const count = deals.filter((d) => d.stage_id === stage.id || ['closed_won', 'closed_lost'].includes(d.stage_id) ? false : d.stage_id === stage.id).length
      const pct   = total > 0 ? Math.round((activeDeals.filter((d) => d.stage_id === stage.id).length / Math.max(activeDeals.length, 1)) * 100) : 0
      return { stage, count, pct }
    })
  }, [deals, activeDeals])

  // ── Avg days per stage (P5.2) ──────────────────────────────────────────────

  const avgDaysPerStage = useMemo(() => STAGES.filter((s) => !s.is_closed).map((stage) => {
    const sd = activeDeals.filter((d) => d.stage_id === stage.id)
    const avg = sd.length > 0 ? Math.round(sd.reduce((s, d) => s + d.days_in_stage, 0) / sd.length) : null
    return { stage, avg, count: sd.length }
  }), [activeDeals])

  // ── Inactive leads — no activity for 21+ days (P5.4) ──────────────────────

  const inactiveDeals = useMemo(() => {
    const cutoff = new Date(Date.now() - 21 * 86_400_000).toISOString()
    return activeDeals
      .filter((d) => !d.last_activity_at || d.last_activity_at < cutoff)
      .sort((a, b) => {
        if (!a.last_activity_at) return -1
        if (!b.last_activity_at) return 1
        return a.last_activity_at.localeCompare(b.last_activity_at)
      })
      .slice(0, 6)
  }, [activeDeals])

  // ── Active leads per owner + conversion rate (P5.3) ───────────────────────

  const ownerStats = useMemo(() => {
    const map = new Map<string, {
      name: string; color: string; initials: string
      active: number; wonCount: number; lostCount: number; wonValue: number
    }>()
    deals.forEach((d) => {
      const key = d.owner_id
      if (!map.has(key)) map.set(key, { name: d.owner?.name ?? '—', color: d.owner?.avatar_color ?? '#888', initials: d.owner?.initials ?? '?', active: 0, wonCount: 0, lostCount: 0, wonValue: 0 })
      const e = map.get(key)!
      if (d.stage_id === 'closed_won')       { e.wonCount++; e.wonValue += Number(d.value) }
      else if (d.stage_id === 'closed_lost') { e.lostCount++ }
      else                                   { e.active++ }
    })
    return [...map.entries()]
      .map(([id, v]) => ({
        id, ...v,
        convRate: v.wonCount + v.lostCount > 0 ? Math.round((v.wonCount / (v.wonCount + v.lostCount)) * 100) : null,
      }))
      .sort((a, b) => b.active - a.active)
  }, [deals])

  // ── Theme ──────────────────────────────────────────────────────────────────

  const cardBg  = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const trackBg = isDark ? '#1e1e1c' : '#eeece8'
  const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'

  // ─── Tab pill ────────────────────────────────────────────────────────────

  function TabPill({ id, label }: { id: 'operacao' | 'resultados'; label: string }) {
    const active = activeTab === id
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        style={{
          padding: '5px 14px', borderRadius: '6px',
          fontSize: '12px', fontWeight: active ? 700 : 500,
          color: active ? (isDark ? '#e8e4dc' : '#1a1814') : muted,
          backgroundColor: active ? (isDark ? '#1e1e1c' : '#edecea') : 'transparent',
          border: 'none', cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: pageBg }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: '56px', minHeight: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: `1px solid ${border}`,
        backgroundColor: cardBg, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Dashboard</p>
            <p style={{ fontSize: '10px', color: muted, marginTop: '1px', textTransform: 'capitalize' }}>
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            </p>
          </div>

          {/* Tab pills */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            backgroundColor: isDark ? '#111110' : '#f0eeea',
            borderRadius: '8px', padding: '3px',
          }}>
            <TabPill id="operacao"   label="Operação" />
            <TabPill id="resultados" label="Resultados" />
          </div>
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ════════════════════════ TAB 1 — OPERAÇÃO ════════════════════════ */}
        {activeTab === 'operacao' && (
          <>
            {/* KPIs */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <GripVertical style={{ width: '11px', height: '11px', color: muted }} />
                <span style={{ fontSize: '10px', color: muted, fontWeight: 500 }}>Arraste os cards para reorganizar</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
                {!loaded
                  ? DEFAULT_KPI_ORDER.map((id) => <KpiSkeleton key={id} isDark={isDark} />)
                  : kpiOrder.map((id, idx) => {
                      const kpi = kpiDefs[id]
                      if (!kpi) return null
                      return (
                        <KpiCard
                          key={id} {...kpi} isDark={isDark}
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

            {/* Funil & Forecast */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '12px' }}>
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '14px' }}>Funil por Estágio</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {funnelData.map(({ stage, count, value, convRate }) => (
                    <div key={stage.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stage.color, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', fontWeight: 500, color: text }}>{stage.label}</span>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: muted, backgroundColor: trackBg, borderRadius: '3px', padding: '1px 5px' }}>{count}</span>
                          {convRate !== null && (
                            <span style={{ fontSize: '10px', fontWeight: 600, color: convRate > 60 ? '#2d9e6b' : convRate > 30 ? '#b45309' : (isDark ? '#fc8181' : '#c53030') }}>
                              {convRate}% conv.
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: value > 0 ? text : muted, fontVariantNumeric: 'tabular-nums' }}>
                          {value > 0 ? fmt(value) : '—'}
                        </span>
                      </div>
                      <div style={{ height: '4px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '99px', width: `${value > 0 ? Math.round((value / maxFunnelVal) * 100) : (count > 0 ? 6 : 0)}%`, backgroundColor: stage.color, opacity: 0.85, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${border}`, display: 'flex', gap: '24px' }}>
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
                <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '16px' }}>Forecast Q2 · 2026</p>
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <span style={{ fontSize: '11px', color: muted }}>Pipeline ponderado</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: text, fontVariantNumeric: 'tabular-nums' }}>{fmt(weightedPipeline)}</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', width: `${forecastPct}%`, background: 'linear-gradient(90deg, #2c5545, #4a9080)', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                    <span style={{ fontSize: '10px', color: muted }}>{forecastPct.toFixed(0)}% da meta</span>
                    <span style={{ fontSize: '10px', color: muted }}>Meta: {fmt(quarterlyGoal)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {funnelData.filter((f) => f.value > 0).map(({ stage, count }) => {
                    const stageDeals = valueDeals.filter((d) => d.stage_id === stage.id)
                    const weighted   = stageDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0)
                    const pct        = Math.round((weighted / quarterlyGoal) * 100)
                    return (
                      <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stage.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', color: muted, flex: 1 }}>{stage.label} ({count})</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: text, fontVariantNumeric: 'tabular-nums', minWidth: '56px', textAlign: 'right' }}>{fmt(weighted)}</span>
                        <span style={{ fontSize: '10px', color: muted, minWidth: '28px', textAlign: 'right' }}>{pct}%</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gap para meta</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: weightedPipeline >= quarterlyGoal ? '#2d9e6b' : (isDark ? '#fc8181' : '#c53030'), fontVariantNumeric: 'tabular-nums' }}>
                      {weightedPipeline >= quarterlyGoal ? '+' : ''}{fmt(weightedPipeline - quarterlyGoal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Aging & Evolução mensal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Aging */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '12px' }}>Aging — Top 5 Paralisados</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {aging.map((deal) => {
                    const stage = STAGES.find((s) => s.id === deal.stage_id)
                    const agingColor = deal.days_in_stage > 60 ? (isDark ? '#fc8181' : '#c53030') : deal.days_in_stage > 30 ? '#b45309' : muted
                    return (
                      <button key={deal.id} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.1s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trackBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span style={{ width: '3px', height: '32px', borderRadius: '99px', backgroundColor: stage?.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.company_name}</p>
                          <p style={{ fontSize: '10px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.title}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: agingColor }}>{deal.days_in_stage}d</p>
                          <p style={{ fontSize: '10px', color: muted }}>{stage?.label}</p>
                        </div>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: deal.owner.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '7px', fontWeight: 700, flexShrink: 0 }}>
                          {deal.owner.initials}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Evolução mensal */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '12px' }}>Evolução Mensal — Pipeline Criado</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '108px' }}>
                  {monthlyPipeline.map(({ label, value, key }) => {
                    const maxV = Math.max(...monthlyPipeline.map((m) => m.value), 1)
                    const barH = Math.max(Math.round((value / maxV) * 80), 3)
                    const isCurrent = key === new Date().toISOString().slice(0, 7)
                    return (
                      <div key={key} title={`${label}: ${fmt(value)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '100%', height: `${barH}px`, backgroundColor: isCurrent ? '#4a9080' : '#2c5545', borderRadius: '3px 3px 0 0', opacity: isCurrent ? 1 : 0.7, transition: 'height 0.4s ease' }} />
                        <span style={{ fontSize: '9px', color: isCurrent ? text : muted, fontWeight: isCurrent ? 600 : 400, textTransform: 'capitalize' }}>{label}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', color: muted }}>{monthlyPipeline.length} meses analisados</span>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: text, fontVariantNumeric: 'tabular-nums' }}>Total {fmt(monthlyPipeline.reduce((s, m) => s + m.value, 0))}</span>
                </div>
              </div>
            </div>

            {/* Riscos & Próximas ações */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <AlertTriangle style={{ width: '12px', height: '12px', color: isDark ? '#fc8181' : '#c53030' }} />
                  <p style={{ fontSize: '11px', fontWeight: 700, color: text }}>Riscos da Semana</p>
                  {risks.length > 0 && <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', backgroundColor: '#c53030', borderRadius: '99px', padding: '1px 6px', marginLeft: 'auto' }}>{risks.length}</span>}
                </div>
                {risks.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: muted }}>Nenhum risco identificado</p>
                  </div>
                ) : risks.map((deal, i) => {
                  const stage     = STAGES.find((s) => s.id === deal.stage_id)
                  const isOverdue = deal.next_activity && daysDiff(deal.next_activity.due_date) < 0
                  const reason    = isOverdue ? `Atividade vencida há ${Math.abs(daysDiff(deal.next_activity!.due_date))}d` : `${deal.days_in_stage}d em ${stage?.label ?? ''} sem avançar`
                  return (
                    <button key={deal.id} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 18px', borderBottom: i < risks.length - 1 ? `1px solid ${border}` : 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', border: 'none', transition: 'background-color 0.1s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trackBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span style={{ width: '3px', height: '28px', borderRadius: '99px', backgroundColor: isDark ? '#fc8181' : '#c53030', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.company_name}</p>
                        <p style={{ fontSize: '10px', color: muted }}>{reason}</p>
                      </div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: text, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(deal.value)}</p>
                    </button>
                  )
                })}
              </div>

              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: text }}>Próximas Ações</p>
                  <button type="button" onClick={() => navigate('/pipeline')}
                    style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 600, color: muted, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#2c5545')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                  >
                    Ver pipeline <ArrowRight style={{ width: '10px', height: '10px' }} />
                  </button>
                </div>
                {upcoming.map(({ deal, activity }, i) => {
                  const diff = daysDiff(activity.due_date)
                  const Icon = ACT_ICONS[activity.type] ?? CheckSquare
                  const urgent = diff < 0; const today = diff === 0
                  const dateColor = urgent ? (isDark ? '#fc8181' : '#c53030') : today ? '#b45309' : muted
                  return (
                    <button key={deal.id} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 18px', borderBottom: i < upcoming.length - 1 ? `1px solid ${border}` : 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', border: 'none', transition: 'background-color 0.1s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trackBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: `${deal.owner.avatar_color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon style={{ width: '11px', height: '11px', color: deal.owner.avatar_color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.company_name}</p>
                        <p style={{ fontSize: '10px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.label}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: '10px', fontWeight: 600, color: dateColor }}>{urgent ? `${Math.abs(diff)}d atrás` : today ? 'Hoje' : diff === 1 ? 'Amanhã' : fmtDate(activity.due_date)}</p>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: deal.owner.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '6px', fontWeight: 700, marginTop: '3px', marginLeft: 'auto' }}>
                          {deal.owner.initials}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Leads sem atividade recente */}
            {inactiveDeals.length > 0 && (
              <div style={{ backgroundColor: cardBg, border: `1px solid ${isDark ? '#4a2a1a' : '#fed7aa'}`, borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle style={{ width: '12px', height: '12px', color: '#b45309' }} />
                    <p style={{ fontSize: '11px', fontWeight: 700, color: text }}>Leads Sem Atividade</p>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#b45309', backgroundColor: isDark ? '#2a1a0a' : '#fef3c7', borderRadius: '4px', padding: '1px 5px' }}>
                      +21 dias
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: muted }}>{inactiveDeals.length} leads</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {inactiveDeals.map((deal, i) => {
                    const daysSince = deal.last_activity_at
                      ? Math.round((Date.now() - new Date(deal.last_activity_at).getTime()) / 86_400_000)
                      : null
                    const stage = STAGES.find((s) => s.id === deal.stage_id)
                    const isLast = i >= inactiveDeals.length - 2
                    return (
                      <button key={deal.id} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 18px', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', border: 'none', borderBottom: isLast ? 'none' : `1px solid ${border}`, borderRight: i % 2 === 0 ? `1px solid ${border}` : 'none', transition: 'background-color 0.1s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trackBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.company_name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                            {stage && <span style={{ fontSize: '9px', fontWeight: 600, color: stage.color }}>{stage.label}</span>}
                            <span style={{ fontSize: '9px', color: muted }}>·</span>
                            <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                              {daysSince === null ? 'nunca' : `${daysSince}d sem atividade`}
                            </span>
                          </div>
                        </div>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: deal.owner.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '7px', fontWeight: 700, flexShrink: 0 }} title={deal.owner.name}>
                          {deal.owner.initials}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════ TAB 2 — RESULTADOS ══════════════════════ */}
        {activeTab === 'resultados' && (
          <>
            {/* KPIs de Resultados */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
              {[
                {
                  label: 'Ganhos Totais',
                  value: fmtFull(wonTotal),
                  sub: `${closedWon.length} deals fechados`,
                  icon: Trophy,
                  accent: '#2d9e6b',
                },
                {
                  label: 'Meta Atingida',
                  value: `${goalPct.toFixed(1)}%`,
                  sub: `Meta: ${fmt(quarterlyGoal)}`,
                  icon: Target,
                  accent: goalPct >= 100 ? '#2d9e6b' : goalPct >= 70 ? '#b45309' : (isDark ? '#fc8181' : '#c53030'),
                },
                {
                  label: 'Ticket Médio Fechado',
                  value: fmtFull(avgTicketWon),
                  sub: closedWon.length > 0 ? `${closedWon.length} deals base` : 'Sem dados',
                  icon: DollarSign,
                  accent: '#8b6914',
                },
                {
                  label: 'Conv. Pipeline → Won',
                  value: `${roiPipeline.toFixed(1)}%`,
                  sub: `${fmt(wonTotal)} ganhos de ${fmt(pipelineTotal + wonTotal)}`,
                  icon: Percent,
                  accent: '#4a7c8a',
                },
              ].map(({ label, value, sub, icon: Icon, accent }) => (
                <div key={label} style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.2 }}>{label}</p>
                    <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: '12px', height: '12px', color: accent }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: text, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                    {sub && <p style={{ fontSize: '10px', color: muted, marginTop: '4px', lineHeight: 1.3 }}>{sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Ranking + Histórico de Won */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

              {/* Performance por Operador */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Trophy style={{ width: '13px', height: '13px', color: '#b45309' }} />
                  <p style={{ fontSize: '11px', fontWeight: 700, color: text }}>Performance por Operador</p>
                </div>
                {ownerStats.length === 0 ? (
                  <p style={{ fontSize: '12px', color: muted, textAlign: 'center', padding: '20px 0' }}>Sem dados ainda</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ownerStats.map((o) => {
                      const maxActive = Math.max(...ownerStats.map((x) => x.active), 1)
                      const barW = Math.round((o.active / maxActive) * 100)
                      return (
                        <div key={o.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '7px', fontWeight: 700, flexShrink: 0 }}>
                              {o.initials}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {o.name.split(' ')[0]}
                            </span>
                            <span style={{ fontSize: '10px', color: muted, flexShrink: 0 }} title="Leads ativos">{o.active} ativos</span>
                            {o.convRate !== null && (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: o.convRate >= 50 ? '#2d9e6b' : '#b45309', flexShrink: 0 }} title="Taxa de conversão">
                                {o.convRate}% conv.
                              </span>
                            )}
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#2d9e6b', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(o.wonValue)}</span>
                          </div>
                          <div style={{ height: '3px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '99px', width: `${barW}%`, backgroundColor: '#4a7c8a', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Histórico de Won por mês */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <BarChart2 style={{ width: '13px', height: '13px', color: '#2d9e6b' }} />
                  <p style={{ fontSize: '11px', fontWeight: 700, color: text }}>Histórico de Vendas por Mês</p>
                </div>
                {monthlyWon.length === 0 ? (
                  <p style={{ fontSize: '12px', color: muted, textAlign: 'center', padding: '20px 0' }}>Sem histórico de vendas</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px' }}>
                      {monthlyWon.map(({ label, value, key }) => {
                        const maxV = Math.max(...monthlyWon.map((m) => m.value), 1)
                        const barH = Math.max(Math.round((value / maxV) * 80), 3)
                        const isCurrent = key === new Date().toISOString().slice(0, 7)
                        return (
                          <div key={key} title={`${label}: ${fmt(value)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '100%', height: `${barH}px`, backgroundColor: isCurrent ? '#2d9e6b' : '#4a9080', borderRadius: '3px 3px 0 0', opacity: isCurrent ? 1 : 0.75, transition: 'height 0.4s ease' }} />
                            <span style={{ fontSize: '9px', color: isCurrent ? text : muted, fontWeight: isCurrent ? 600 : 400, textTransform: 'capitalize' }}>{label}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10px', color: muted }}>{monthlyWon.length} meses com vendas</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#2d9e6b', fontVariantNumeric: 'tabular-nums' }}>Total {fmtFull(wonTotal)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Taxa de conversão + métricas de ciclo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

              {/* Distribuição do Pipeline Ativo */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '14px' }}>Distribuição do Pipeline Ativo</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stageConversion.map(({ stage, pct }) => {
                    const count = activeDeals.filter((d) => d.stage_id === stage.id).length
                    return (
                      <div key={stage.id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stage.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: text }}>{stage.label}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: muted }}>{count} deal{count !== 1 ? 's' : ''}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: text }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ height: '3px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, backgroundColor: stage.color, opacity: 0.8, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tempo médio por etapa */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '4px' }}>Tempo Médio por Etapa</p>
                <p style={{ fontSize: '10px', color: muted, marginBottom: '14px' }}>Gargalos do pipeline — dias médios na etapa</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {avgDaysPerStage.map(({ stage, avg, count }) => {
                    const maxAvg = Math.max(...avgDaysPerStage.map((x) => x.avg ?? 0), 1)
                    const barW   = avg !== null ? Math.round((avg / maxAvg) * 100) : 0
                    const isHot  = avg !== null && avg > 60
                    return (
                      <div key={stage.id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stage.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: text }}>{stage.label}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: muted }}>{count} lead{count !== 1 ? 's' : ''}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: isHot ? (isDark ? '#fc8181' : '#c53030') : text, fontVariantNumeric: 'tabular-nums' }}>
                              {avg !== null ? `${avg}d` : '—'}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: '3px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '99px', width: `${barW}%`, backgroundColor: isHot ? (isDark ? '#c53030' : '#ef4444') : stage.color, opacity: 0.8, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', color: muted }}>Ciclo médio geral</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: text }}>{avgCycle}d</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Próximas Tarefas ── */}
        <TasksWidget isDark={isDark} border={border} text={text} muted={muted} cardBg={cardBg} navigate={navigate} />

      </div>
    </div>
  )
}

// ─── Tasks Widget ─────────────────────────────────────────────────────────────

function TasksWidget({ isDark, border, text, muted, cardBg, navigate }: {
  isDark: boolean; border: string; text: string; muted: string; cardBg: string
  navigate: ReturnType<typeof useNavigate>
}) {
  const tasks    = useTaskStore((s) => s.tasks)
  const complete = useTaskStore((s) => s.complete)

  const today = new Date().toISOString().slice(0, 10)

  const upcoming = useMemo(() => {
    const pending = tasks.filter((t) => !t.completed_at)
    const overdue = pending.filter((t) => t.due_date && t.due_date < today)
    const todayT  = pending.filter((t) => t.due_date === today)
    const future  = pending.filter((t) => !t.due_date || t.due_date > today)
    return [...overdue, ...todayT, ...future].slice(0, 5)
  }, [tasks, today])

  if (upcoming.length === 0) return null

  const hoverBg = isDark ? '#1c1c1a' : '#f8f7f4'

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Próximas Tarefas
        </p>
        <button
          type="button"
          onClick={() => navigate('/tarefas')}
          style={{ fontSize: '10px', color: muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
        >
          Ver todas <ArrowRight style={{ width: '10px', height: '10px' }} />
        </button>
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
        {upcoming.map((task, i) => {
          const isOverdue = !!task.due_date && task.due_date < today
          const isToday   = task.due_date === today

          return (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 14px',
                borderBottom: i < upcoming.length - 1 ? `1px solid ${border}` : 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <button
                type="button"
                onClick={() => complete(task.id)}
                style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                  border: `2px solid ${border}`, backgroundColor: 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2d9e6b'; e.currentTarget.style.backgroundColor = '#2d9e6b20' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <Check style={{ width: '9px', height: '9px', color: '#2d9e6b', opacity: 0 }}
                  onMouseEnter={(e) => ((e.currentTarget as SVGElement).style.opacity = '1')}
                />
              </button>

              <p style={{
                flex: 1, fontSize: '12px', fontWeight: 500, color: text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {task.title}
              </p>

              {task.deal_title && (
                <span style={{ fontSize: '10px', color: muted, flexShrink: 0, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.deal_title}
                </span>
              )}

              {task.due_date && (
                <span style={{
                  fontSize: '10px', flexShrink: 0, fontWeight: 600,
                  color: isOverdue ? '#dc2626' : isToday ? '#b45309' : muted,
                }}>
                  {isOverdue ? '⚠ ' : ''}{isToday ? 'Hoje' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(task.due_date + 'T12:00:00'))}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
