import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  TrendingUp, DollarSign, Target, Briefcase, Clock, Award, CheckSquare,
  Users, AlertTriangle, ArrowRight, BarChart2, Activity,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { STAGES } from '@/constants/pipeline'
import { PageHeader } from '@/components/crm/PageHeader'
import { StatCard } from '@/components/crm/StatCard'
import { Timeline, type ActivityItemData } from '@/components/crm/Timeline'
import { EmptyState } from '@/components/crm/EmptyState'
import { CrmAreaChart } from '@/components/crm/charts/CrmAreaChart'
import { CrmBarChart } from '@/components/crm/charts/CrmBarChart'
import { CrmDonutChart } from '@/components/crm/charts/CrmDonutChart'
import { motionPresets } from '@/lib/motion'

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtFull(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}
function fmtPct(v: number) { return `${v.toFixed(1)}%` }
function getInitials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}
function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `${diff}m`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

type Period = '30d' | '90d' | '12m'

// ─── Section Card wrapper ─────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children, action, isDark }: {
  title: string; subtitle?: string; children: React.ReactNode
  action?: React.ReactNode; isDark: boolean
}) {
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const bg     = isDark ? '#111110' : '#ffffff'
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#6b6760' : '#667085'
  const shadow = isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)'

  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: shadow }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: text, margin: 0, letterSpacing: '-0.01em' }}>{title}</p>
          {subtitle && <p style={{ fontSize: '12px', color: muted, marginTop: '2px' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

// ─── WelcomeHero ──────────────────────────────────────────────────────────────

function WelcomeHero({ name, goalPct, isDark }: { name: string; goalPct: number; isDark: boolean }) {
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const bg     = isDark ? '#111110' : '#ffffff'
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#6b6760' : '#667085'
  const shadow = isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)'
  const brand  = isDark ? '#9b2020' : '#6b1212'
  const clamp  = Math.min(Math.max(goalPct, 0), 100)

  return (
    <motion.div
      {...motionPresets.slideUp}
      style={{
        backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '12px',
        padding: '20px 24px', boxShadow: shadow,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', color: muted, margin: 0 }}>{greeting()},</p>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: '2px 0 0' }}>
          {name.split(' ')[0]} 👋
        </h2>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: '180px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: muted }}>Meta do mês</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: text, fontFamily: "'Geist Mono', monospace" }}>
            {clamp}%
          </span>
        </div>
        <div style={{ height: '6px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clamp}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            style={{
              height: '100%', borderRadius: '9999px',
              backgroundColor: clamp >= 100 ? '#15803d' : clamp >= 70 ? brand : '#92400e',
            }}
          />
        </div>
        <p style={{ fontSize: '11px', color: muted, marginTop: '6px' }}>
          {clamp >= 100 ? '🏆 Meta atingida!' : clamp >= 70 ? 'No caminho certo' : 'Abaixo do esperado'}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Team Leaderboard ─────────────────────────────────────────────────────────

function TeamLeaderboard({ owners, isDark }: { owners: { name: string; color: string; won: number; pipeline: number; deals: number }[]; isDark: boolean }) {
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#6b6760' : '#667085'
  const subtleBg = isDark ? '#191917' : '#f9fafb'
  const maxWon = Math.max(...owners.map((o) => o.won), 1)

  if (owners.length === 0) return <EmptyState icon={<Users size={18} />} title="Sem dados de equipa" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {owners.slice(0, 6).map((owner, i) => (
        <motion.div
          key={owner.name}
          {...motionPresets.listItem(i)}
          style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px',
            alignItems: 'center', gap: '12px',
            padding: '10px 12px', borderRadius: '8px',
            backgroundColor: i === 0 ? (isDark ? 'rgba(107,18,18,0.12)' : 'rgba(107,18,18,0.04)') : 'transparent',
          }}
        >
          {/* Rank */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {i === 0
              ? <span style={{ fontSize: '16px' }}>🥇</span>
              : <span style={{ fontSize: '12px', fontWeight: 600, color: muted }}>#{i + 1}</span>
            }
          </div>
          {/* Owner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '7px',
              backgroundColor: owner.color, color: '#fff',
              fontSize: '10px', fontWeight: 700, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {getInitials(owner.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {owner.name.split(' ')[0]}
              </p>
              <p style={{ fontSize: '11px', color: muted }}>{owner.deals} oportunidades</p>
            </div>
          </div>
          {/* Pipeline bar */}
          <div>
            <div style={{ height: '4px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(owner.pipeline / Math.max(...owners.map((o) => o.pipeline), 1)) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', borderRadius: '9999px', backgroundColor: owner.color }}
              />
            </div>
            <p style={{ fontSize: '10px', color: muted, marginTop: '3px' }}>{fmtBRL(owner.pipeline)}</p>
          </div>
          {/* Won */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#15803d', fontFamily: "'Geist Mono', monospace" }}>
              {fmtBRL(owner.won)}
            </p>
            <div style={{ height: '3px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: '9999px', overflow: 'hidden', marginTop: '3px' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(owner.won / maxWon) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', borderRadius: '9999px', backgroundColor: '#15803d' }}
              />
            </div>
          </div>
        </motion.div>
      ))}
      {owners.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: subtleBg }}>
          Sem dados disponíveis
        </div>
      )}
    </div>
  )
}

// ─── Funnel chart section ─────────────────────────────────────────────────────

function PipelineFunnel({ stageData, isDark }: { stageData: { label: string; count: number; value: number; color: string }[]; isDark: boolean }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const max   = Math.max(...stageData.map((s) => s.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {stageData.map((stage, i) => {
        const pct = (stage.count / max) * 100
        const convPct = i > 0 && stageData[i - 1].count > 0
          ? Math.round((stage.count / stageData[i - 1].count) * 100)
          : null

        return (
          <div key={stage.label}>
            {convPct !== null && (
              <div style={{ textAlign: 'center', fontSize: '10px', color: muted, marginBottom: '4px' }}>
                ↓ {convPct}% conversão
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 60px 80px', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: text, fontWeight: 500, textAlign: 'right' }}>{stage.label}</span>
              <div style={{ height: '8px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', borderRadius: '9999px', backgroundColor: stage.color }}
                />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: text, fontFamily: "'Geist Mono', monospace", textAlign: 'right' }}>
                {stage.count}
              </span>
              <span style={{ fontSize: '11px', color: muted, fontFamily: "'Geist Mono', monospace", textAlign: 'right' }}>
                {fmtBRL(stage.value)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, isDark }: { active: string; onChange: (t: string) => void; isDark: boolean }) {
  const tabs = [
    { id: 'operacao', label: 'Operação' },
    { id: 'resultados', label: 'Resultados' },
  ]
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#6b6760' : '#667085'

  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, marginBottom: '24px' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            height: '40px', padding: '0 20px', fontSize: '13px',
            fontWeight: active === tab.id ? 600 : 400,
            color: active === tab.id ? text : muted,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${active === tab.id ? '#6b1212' : 'transparent'}`,
            marginBottom: '-1px', transition: 'all 0.15s ease',
            letterSpacing: '-0.01em',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Period selector ──────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange, isDark }: { value: Period; onChange: (p: Period) => void; isDark: boolean }) {
  const options: { key: Period; label: string }[] = [
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
    { key: '12m', label: '12m' },
  ]
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#eaecf0'
  const bg     = isDark ? '#1c1c1a' : '#f3f4f6'

  return (
    <div style={{ display: 'flex', backgroundColor: bg, borderRadius: '8px', padding: '2px', gap: '1px' }}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          style={{
            height: '28px', padding: '0 12px', fontSize: '12px', fontWeight: 500,
            borderRadius: '6px', border: 'none', cursor: 'pointer',
            backgroundColor: value === o.key ? (isDark ? '#2a2a28' : '#ffffff') : 'transparent',
            color: value === o.key ? (isDark ? '#edeae4' : '#101828') : (isDark ? '#6b6760' : '#667085'),
            boxShadow: value === o.key ? (isDark ? 'none' : `0 1px 3px rgba(16,24,40,0.08), 0 0 0 1px ${border}`) : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const profile  = useAuthStore((s) => s.profile)
  const deals    = useVisibleDeals()
  const tasks    = useTaskStore((s) => s.tasks)
  const { settings } = useSettingsStore()
  const navigate = useNavigate()

  const [tab, setTab]       = useState<'operacao' | 'resultados'>('operacao')
  const [period, setPeriod] = useState<Period>('90d')

  const pageBg  = isDark ? '#0a0a08' : '#f9fafb'
  const border  = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const text    = isDark ? '#edeae4' : '#101828'
  const muted   = isDark ? '#6b6760' : '#667085'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const shadow  = isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)'
  const brand   = isDark ? '#9b2020' : '#6b1212'

  // ── Period filter ──
  const cutoff = useMemo(() => {
    const now = new Date()
    if (period === '30d') return new Date(now.getTime() - 30 * 86400000).toISOString()
    if (period === '90d') return new Date(now.getTime() - 90 * 86400000).toISOString()
    return new Date(now.getTime() - 365 * 86400000).toISOString()
  }, [period])

  const filteredDeals = useMemo(() =>
    deals.filter((d) => d.created_at >= cutoff),
    [deals, cutoff],
  )

  // ── Core KPIs ──
  const kpis = useMemo(() => {
    const active = filteredDeals.filter((d) => d.stage !== 'won' && d.stage !== 'lost')
    const won    = filteredDeals.filter((d) => d.stage === 'won')
    const pipeline = active.reduce((s, d) => s + (d.value ?? 0), 0)
    const revenue  = won.reduce((s, d) => s + (d.value ?? 0), 0)
    const winRate  = filteredDeals.length > 0 ? (won.length / filteredDeals.length) * 100 : 0
    const ticket   = won.length > 0 ? revenue / won.length : 0
    const today    = new Date().toISOString().slice(0, 10)
    const overdue  = tasks.filter((t) => !t.completed_at && !!t.due_date && t.due_date < today).length
    const pending  = tasks.filter((t) => !t.completed_at).length

    const meta = settings?.monthly_target ?? 0
    const goalPct = meta > 0 ? Math.round((revenue / meta) * 100) : 0

    return { active: active.length, won: won.length, pipeline, revenue, winRate, ticket, overdue, pending, goalPct, total: filteredDeals.length }
  }, [filteredDeals, tasks, settings])

  // ── Monthly bars for area chart ──
  const monthlyData = useMemo(() => {
    const months: Record<string, { label: string; value: number; value2: number }> = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      months[key] = { label, value: 0, value2: 0 }
    }
    for (const deal of deals) {
      const key = deal.created_at?.slice(0, 7)
      if (key && months[key]) months[key].value += deal.value ?? 0
      if (deal.stage === 'won') {
        const wk = (deal.updated_at ?? deal.created_at)?.slice(0, 7)
        if (wk && months[wk]) months[wk].value2 += deal.value ?? 0
      }
    }
    return Object.values(months)
  }, [deals])

  // ── Stage funnel ──
  const stageData = useMemo(() => {
    return STAGES.filter((s) => s.id !== 'won' && s.id !== 'lost').map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage.id)
      return {
        label: stage.label,
        color: stage.color,
        count: stageDeals.length,
        value: stageDeals.reduce((s, d) => s + (d.value ?? 0), 0),
      }
    })
  }, [deals])

  // ── Donut — por fase ──
  const donutData = useMemo(() =>
    stageData.filter((s) => s.value > 0).map((s) => ({ label: s.label, value: s.value })),
    [stageData],
  )

  // ── Owner leaderboard ──
  const owners = useMemo(() => {
    const map = new Map<string, { name: string; color: string; won: number; pipeline: number; deals: number }>()
    for (const deal of deals) {
      const name  = deal.owner_name ?? 'Sem responsável'
      const color = deal.owner_avatar_color ?? '#667085'
      if (!map.has(name)) map.set(name, { name, color, won: 0, pipeline: 0, deals: 0 })
      const e = map.get(name)!
      e.deals++
      if (deal.stage === 'won') e.won += deal.value ?? 0
      else e.pipeline += deal.value ?? 0
    }
    return [...map.values()].sort((a, b) => (b.won + b.pipeline) - (a.won + a.pipeline))
  }, [deals])

  // ── Recent activity timeline ──
  const recentActivity = useMemo<ActivityItemData[]>(() => {
    return [...deals]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .map((d) => ({
        id: d.id,
        title: d.name,
        description: `${d.company_name ?? ''} ${d.stage === 'won' ? '· Ganho 🎉' : `· ${STAGES.find((s) => s.id === d.stage)?.label ?? ''}`}`.trim(),
        timestamp: timeAgo(d.created_at),
        color: d.stage === 'won' ? 'success' as const : d.stage === 'lost' ? 'danger' as const : 'accent' as const,
      }))
  }, [deals])

  // ── Tasks section ──
  const today = new Date().toISOString().slice(0, 10)
  const upcomingTasks = useMemo(() =>
    tasks.filter((t) => !t.completed_at).sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    }).slice(0, 6),
    [tasks],
  )

  // ── Bar chart data — monthly deals ──
  const barData = useMemo(() => {
    return monthlyData.slice(-6).map((m, i) => ({
      label: m.label,
      value: m.value,
      highlight: i === 5,
    }))
  }, [monthlyData])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: pageBg }}>

      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        subtitle={`${kpis.total} oportunidades`}
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <PeriodSelector value={period} onChange={setPeriod} isDark={isDark} />
            <button
              type="button"
              onClick={() => navigate('/pipeline')}
              style={{
                height: '32px', padding: '0 14px', borderRadius: '7px',
                backgroundColor: brand, color: '#fff', border: 'none',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#7a1818' : '#520e0e' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = brand }}
            >
              + Oportunidade
            </button>
          </div>
        }
      />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Welcome hero */}
          <WelcomeHero
            name={profile?.full_name ?? 'Utilizador'}
            goalPct={kpis.goalPct}
            isDark={isDark}
          />

          {/* Tab bar */}
          <TabBar active={tab} onChange={(t) => setTab(t as 'operacao' | 'resultados')} isDark={isDark} />

          <AnimatePresence mode="wait">

            {/* ── TAB OPERAÇÃO ── */}
            {tab === 'operacao' && (
              <motion.div
                key="operacao"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >

                {/* KPIs — 6 StatCards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <StatCard
                    icon={<Briefcase size={16} />} color="accent"
                    label="Pipeline Total" value={fmtBRL(kpis.pipeline)}
                    delta={`${kpis.active} ativos`} deltaType="neutral" index={0}
                    sparklineData={monthlyData.slice(-8).map((m) => m.value)}
                  />
                  <StatCard
                    icon={<Target size={16} />} color="success"
                    label="Receita Ganha" value={fmtBRL(kpis.revenue)}
                    delta={`${kpis.won} fechados`} deltaType="positive" index={1}
                    sparklineData={monthlyData.slice(-8).map((m) => m.value2)}
                  />
                  <StatCard
                    icon={<Award size={16} />} color="info"
                    label="Win Rate" value={fmtPct(kpis.winRate)}
                    delta={kpis.winRate >= 30 ? 'Saudável' : 'A melhorar'} deltaType={kpis.winRate >= 30 ? 'positive' : 'negative'} index={2}
                  />
                  <StatCard
                    icon={<DollarSign size={16} />} color="warning"
                    label="Ticket Médio" value={fmtBRL(kpis.ticket)}
                    delta="por fechamento" deltaType="neutral" index={3}
                  />
                  <StatCard
                    icon={<CheckSquare size={16} />} color={kpis.overdue > 0 ? 'danger' : 'success'}
                    label="Tarefas" value={String(kpis.pending)}
                    delta={kpis.overdue > 0 ? `${kpis.overdue} em atraso` : 'Em dia'} deltaType={kpis.overdue > 0 ? 'negative' : 'positive'} index={4}
                    onClick={() => navigate('/tarefas')}
                  />
                  <StatCard
                    icon={<TrendingUp size={16} />} color="neutral"
                    label="Total Oportunidades" value={String(kpis.total)}
                    delta={`${period} selecionado`} deltaType="neutral" index={5}
                  />
                </div>

                {/* Pipeline + Funil */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <SectionCard title="Pipeline Mensal" subtitle="Criado vs Fechado" isDark={isDark}>
                    <CrmAreaChart
                      data={monthlyData.slice(-8)}
                      color={brand}
                      color2="#15803d"
                      height={180}
                      formatY={fmtBRL}
                      formatTooltip={fmtFull}
                    />
                  </SectionCard>

                  <SectionCard title="Funil de Conversão" subtitle="Por fase" isDark={isDark}>
                    <PipelineFunnel stageData={stageData} isDark={isDark} />
                  </SectionCard>
                </div>

                {/* Team + Activity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <SectionCard
                    title="Performance da Equipa" subtitle="Ranking por receita"
                    isDark={isDark}
                    action={
                      <button
                        type="button" onClick={() => navigate('/teams')}
                        style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Ver tudo <ArrowRight size={12} />
                      </button>
                    }
                  >
                    <TeamLeaderboard owners={owners} isDark={isDark} />
                  </SectionCard>

                  <SectionCard
                    title="Atividade Recente" subtitle="Últimas oportunidades"
                    isDark={isDark}
                    action={
                      <button
                        type="button" onClick={() => navigate('/atividades')}
                        style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Ver feed <ArrowRight size={12} />
                      </button>
                    }
                  >
                    <Timeline items={recentActivity} />
                  </SectionCard>
                </div>

                {/* Tasks section */}
                <SectionCard
                  title="Próximas Tarefas" subtitle={`${kpis.pending} pendentes · ${kpis.overdue} em atraso`}
                  isDark={isDark}
                  action={
                    <button
                      type="button" onClick={() => navigate('/tarefas')}
                      style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Ver todas <ArrowRight size={12} />
                    </button>
                  }
                >
                  {upcomingTasks.length === 0 ? (
                    <EmptyState icon={<CheckSquare size={18} />} title="Nenhuma tarefa pendente" description="Está tudo em dia." />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {upcomingTasks.map((task, i) => {
                        const isOverdue = !!task.due_date && task.due_date < today
                        return (
                          <motion.div
                            key={task.id}
                            {...motionPresets.listItem(i)}
                            style={{
                              padding: '12px 14px', borderRadius: '8px',
                              border: `1px solid ${isOverdue ? 'rgba(155,28,28,0.25)' : border}`,
                              backgroundColor: isOverdue ? (isDark ? 'rgba(155,28,28,0.08)' : '#fff5f5') : (isDark ? '#191917' : '#f9fafb'),
                            }}
                          >
                            <p style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.title}
                            </p>
                            <p style={{ fontSize: '11px', color: isOverdue ? '#9b1c1c' : muted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {isOverdue && <AlertTriangle size={10} />}
                              {task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Sem prazo'}
                            </p>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </SectionCard>

              </motion.div>
            )}

            {/* ── TAB RESULTADOS ── */}
            {tab === 'resultados' && (
              <motion.div
                key="resultados"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >

                {/* KPIs resultado */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                  <StatCard
                    icon={<DollarSign size={16} />} color="success"
                    label="Receita Fechada" value={fmtBRL(kpis.revenue)}
                    delta={`${kpis.won} oportunidades`} deltaType="positive" index={0}
                    sparklineData={monthlyData.slice(-6).map((m) => m.value2)}
                  />
                  <StatCard
                    icon={<Target size={16} />} color={kpis.goalPct >= 100 ? 'success' : kpis.goalPct >= 70 ? 'warning' : 'danger'}
                    label="Meta Atingida" value={`${kpis.goalPct}%`}
                    delta={kpis.goalPct >= 100 ? 'Superada!' : `Faltam ${fmtBRL(Math.max(0, (settings?.monthly_target ?? 0) - kpis.revenue))}`}
                    deltaType={kpis.goalPct >= 100 ? 'positive' : kpis.goalPct >= 70 ? 'neutral' : 'negative'} index={1}
                  />
                  <StatCard
                    icon={<Award size={16} />} color="info"
                    label="Win Rate" value={fmtPct(kpis.winRate)}
                    delta={`${kpis.total} oportunidades`} deltaType={kpis.winRate >= 30 ? 'positive' : 'negative'} index={2}
                  />
                  <StatCard
                    icon={<BarChart2 size={16} />} color="accent"
                    label="Ticket Médio" value={fmtBRL(kpis.ticket)}
                    delta="por negócio ganho" deltaType="neutral" index={3}
                  />
                </div>

                {/* Revenue chart + donut */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                  <SectionCard title="Receita Mensal" subtitle="Criado vs Fechado (12 meses)" isDark={isDark}>
                    <CrmBarChart
                      data={barData}
                      color={brand}
                      highlightColor="#15803d"
                      height={200}
                      formatY={fmtBRL}
                      formatTooltip={fmtFull}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: muted }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: brand }} />
                        Pipeline criado
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: muted }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#15803d' }} />
                        Mês atual (destaque)
                      </span>
                    </div>
                  </SectionCard>

                  <SectionCard title="Por Fase" subtitle="Distribuição do pipeline" isDark={isDark}>
                    <CrmDonutChart
                      data={donutData}
                      centerValue={fmtBRL(kpis.pipeline)}
                      centerLabel="pipeline total"
                      height={160}
                      formatTooltip={fmtFull}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                      {donutData.slice(0, 4).map((d, i) => {
                        const COLORS = [brand, '#15803d', '#92400e', '#1e40af']
                        return (
                          <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: COLORS[i] }} />
                              <span style={{ fontSize: '12px', color: muted }}>{d.label}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: text, fontFamily: "'Geist Mono', monospace" }}>
                              {fmtBRL(d.value)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </SectionCard>
                </div>

                {/* Team performance (results view) */}
                <SectionCard title="Performance da Equipa" subtitle="Receita fechada por Account Executive" isDark={isDark}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {owners.slice(0, 6).map((owner, i) => (
                      <motion.div
                        key={owner.name}
                        {...motionPresets.listItem(i)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 14px', borderRadius: '8px',
                          border: `1px solid ${border}`,
                          backgroundColor: isDark ? '#191917' : '#f9fafb',
                        }}
                      >
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '9px',
                          backgroundColor: owner.color, color: '#fff',
                          fontSize: '12px', fontWeight: 700, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {getInitials(owner.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {owner.name}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', fontFamily: "'Geist Mono', monospace" }}>
                              {fmtBRL(owner.won)}
                            </span>
                            <span style={{ fontSize: '11px', color: muted }}>ganho</span>
                            <span style={{ fontSize: '11px', color: muted }}>·</span>
                            <span style={{ fontSize: '11px', color: muted }}>{fmtBRL(owner.pipeline)} pipeline</span>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '12px', fontWeight: 600,
                          color: brand, backgroundColor: isDark ? 'rgba(107,18,18,0.12)' : 'rgba(107,18,18,0.06)',
                          borderRadius: '5px', padding: '3px 8px',
                        }}>
                          {owner.deals} deals
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {owners.length === 0 && <EmptyState icon={<Users size={18} />} title="Sem dados de equipa" />}
                </SectionCard>

                {/* Top 5 deals */}
                <SectionCard
                  title="Top Oportunidades" subtitle="Por valor"
                  isDark={isDark}
                  action={
                    <button
                      type="button" onClick={() => navigate('/pipeline')}
                      style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Ver pipeline <ArrowRight size={12} />
                    </button>
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {[...filteredDeals].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 5).map((deal, i) => {
                      const stage = STAGES.find((s) => s.id === deal.stage)
                      return (
                        <motion.button
                          key={deal.id}
                          {...motionPresets.listItem(i)}
                          type="button"
                          onClick={() => navigate(`/deal/${deal.id}`)}
                          style={{
                            display: 'grid', gridTemplateColumns: '24px 1fr 100px 90px',
                            alignItems: 'center', gap: '12px',
                            padding: '10px 12px', borderRadius: '7px',
                            backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                            textAlign: 'left', transition: 'background-color 0.1s ease',
                          }}
                          whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }}
                        >
                          <span style={{ fontSize: '13px', color: muted, fontWeight: 500 }}>#{i + 1}</span>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {deal.name}
                            </p>
                            {deal.company_name && (
                              <p style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {deal.company_name}
                              </p>
                            )}
                          </div>
                          {stage && (
                            <span style={{
                              fontSize: '10px', fontWeight: 600,
                              color: stage.color, backgroundColor: `${stage.color}14`,
                              borderRadius: '5px', padding: '3px 8px',
                              textAlign: 'center', whiteSpace: 'nowrap',
                            }}>
                              {stage.label}
                            </span>
                          )}
                          <span style={{
                            fontSize: '13px', fontWeight: 600, color: deal.stage === 'won' ? '#15803d' : text,
                            fontFamily: "'Geist Mono', monospace", textAlign: 'right',
                          }}>
                            {fmtBRL(deal.value ?? 0)}
                          </span>
                        </motion.button>
                      )
                    })}
                    {filteredDeals.length === 0 && (
                      <EmptyState icon={<Activity size={18} />} title="Sem oportunidades no período" />
                    )}
                  </div>
                </SectionCard>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
