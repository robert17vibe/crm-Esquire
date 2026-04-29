import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  TrendingUp, DollarSign, Target, Briefcase, Clock, Award, CheckSquare,
  Users, AlertTriangle, ArrowRight, BarChart2, Activity, Settings2,
  X, Calendar, Zap, CheckCircle2, GripVertical, RefreshCw, Bell,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useDealStore } from '@/store/useDealStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { STAGES } from '@/constants/pipeline'
import { PageHeader } from '@/components/crm/PageHeader'
import { StatCard } from '@/components/crm/StatCard'
import { EmptyState } from '@/components/crm/EmptyState'
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

// ─── Palette vivid (charts) ───────────────────────────────────────────────────

const VIVID = ['#6b1212', '#15803d', '#92400e', '#1e40af', '#6d28d9', '#0e7490']
const STAGE_COLORS = ['#94a3b8', '#6366f1', '#8b5cf6', '#f59e0b', '#22c55e']

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, isDark, fmt: fmtFn }: any) {
  if (!active || !payload?.length) return null
  const bg     = isDark ? '#1c1c1a' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#eaecf0'
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#98a2b3' : '#667085'
  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '10px 14px', boxShadow: '0 4px 12px rgba(16,24,40,0.12)', minWidth: '120px' }}>
      <p style={{ fontSize: '11px', color: muted, marginBottom: '6px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: '13px', fontWeight: 600, color: p.color ?? text, fontFamily: "'Geist Mono', monospace" }}>
          {fmtFn ? fmtFn(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function Card({ title, subtitle, children, action, isDark, noPadding }: {
  title: string; subtitle?: string; children: React.ReactNode
  action?: React.ReactNode; isDark: boolean; noPadding?: boolean
}) {
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const bg     = isDark ? '#111110' : '#ffffff'
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#6b6760' : '#667085'
  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: isDark ? 'none' : '0 1px 4px rgba(16,24,40,0.07)' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: text, margin: 0, letterSpacing: '-0.01em' }}>{title}</p>
          {subtitle && <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={noPadding ? {} : { padding: '16px 18px' }}>{children}</div>
    </div>
  )
}

// ─── Renewal Alert ────────────────────────────────────────────────────────────

function RenovacaoAlert({ deals, isDark, navigate }: { deals: any[]; isDark: boolean; navigate: (p: string) => void }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'

  if (deals.length === 0) return (
    <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: muted }}>
      Nenhuma renovação nos próximos 60 dias
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {deals.slice(0, 5).map((deal, i) => {
        const daysLeft = deal.expected_close
          ? Math.ceil((new Date(deal.expected_close).getTime() - Date.now()) / 86400000)
          : null
        const urgency = daysLeft !== null && daysLeft <= 14 ? '#9b1c1c' : daysLeft !== null && daysLeft <= 30 ? '#92400e' : '#1e40af'
        return (
          <motion.button
            key={deal.id}
            {...motionPresets.listItem(i)}
            type="button" onClick={() => navigate(`/deal/${deal.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', borderRadius: '12px',
              backgroundColor: `${urgency}0a`, border: `1px solid ${urgency}28`,
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'opacity 0.15s ease',
            }}
            whileHover={{ opacity: 0.82 }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: urgency, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deal.name ?? deal.title}
              </p>
              <p style={{ fontSize: '11px', color: muted }}>{deal.company_name ?? '—'}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', fontFamily: "'Geist Mono', monospace" }}>
                {fmtBRL(deal.value ?? 0)}
              </p>
              <span style={{ fontSize: '10px', fontWeight: 600, color: urgency, backgroundColor: `${urgency}18`, borderRadius: '5px', padding: '2px 6px' }}>
                {daysLeft !== null ? (daysLeft <= 0 ? 'Hoje!' : `${daysLeft}d`) : '—'}
              </span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── Mudanças Recentes (feed with who + what) ─────────────────────────────────

function MudancasFeed({ deals, isDark, navigate, isAdmin }: { deals: any[]; isDark: boolean; navigate: (p: string) => void; isAdmin: boolean }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const border = isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'

  const STAGE_COLORS_MAP: Record<string, { color: string; bg: string; label: string }> = {
    novo_lead:        { color: '#1e40af', bg: '#1e40af18', label: 'Novo Lead' },
    qualificado:      { color: '#7c3aed', bg: '#7c3aed18', label: 'Qualificado' },
    proposta_enviada: { color: '#92400e', bg: '#92400e18', label: 'Proposta' },
    em_negociacao:    { color: '#b45309', bg: '#b4530918', label: 'Negociação' },
    won:              { color: '#15803d', bg: '#15803d18', label: 'Ganho ✓' },
    lost:             { color: '#9b1c1c', bg: '#9b1c1c18', label: 'Perdido' },
  }

  const sorted = useMemo(() =>
    [...deals]
      .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())
      .slice(0, 12),
    [deals]
  )

  if (sorted.length === 0) return (
    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: muted }}>
      Sem atividade recente
    </div>
  )

  return (
    <div>
      {!isAdmin && (
        <div style={{ padding: '8px 0 12px', fontSize: '11px', color: muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#1e40af' }} />
          Mostrando apenas as suas oportunidades
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sorted.map((deal, i) => {
          const stageKey = deal.stage ?? deal.stage_id ?? 'novo_lead'
          const cfg = STAGE_COLORS_MAP[stageKey] ?? { color: '#667085', bg: '#66708518', label: stageKey }
          const ownerInitials = (deal.owner_name ?? deal.owner?.name ?? '?')
            .split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
          const ownerColor = deal.owner_avatar_color ?? deal.owner?.avatar_color ?? '#667085'
          const ownerFirstName = (deal.owner_name ?? deal.owner?.name ?? 'Sem dono').split(' ')[0]
          return (
            <motion.button
              key={deal.id}
              {...motionPresets.listItem(i)}
              type="button"
              onClick={() => navigate(`/deal/${deal.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 0',
                borderBottom: i < sorted.length - 1 ? `1px solid ${border}` : 'none',
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'opacity 0.15s ease',
              }}
              whileHover={{ opacity: 0.75 }}
            >
              {/* Owner avatar */}
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                backgroundColor: ownerColor, color: '#fff',
                fontSize: '10px', fontWeight: 700, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {ownerInitials}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                    {deal.name ?? deal.title}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: cfg.color,
                    backgroundColor: cfg.bg, borderRadius: '5px', padding: '2px 7px',
                    letterSpacing: '0.02em', flexShrink: 0,
                  }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', color: muted }}>{ownerFirstName}</span>
                  {deal.company_name && <span style={{ fontSize: '11px', color: muted }}>· {deal.company_name}</span>}
                </div>
              </div>

              {/* Right: value + time */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {deal.value ? (
                  <p style={{ fontSize: '12px', fontWeight: 600, color: stageKey === 'won' ? '#15803d' : (isDark ? '#edeae4' : '#101828'), fontFamily: "'Geist Mono', monospace" }}>
                    {fmtBRL(deal.value)}
                  </p>
                ) : <p style={{ fontSize: '12px', color: muted }}>—</p>}
                <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>
                  {timeAgo(deal.updated_at ?? deal.created_at)}
                </p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Grupos Performance ───────────────────────────────────────────────────────

type GroupStat = {
  id: string
  name: string
  members: { id: string; name: string; initials: string; color: string }[]
  pipeline: number
  revenue: number
  deals: number
  winRate: number
  rank: number
}

function GruposPerformance({ groups, isDark, navigate }: { groups: GroupStat[]; isDark: boolean; navigate: (p: string) => void }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const border = isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'

  if (groups.length === 0) return (
    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: muted }}>
      Nenhum grupo criado ainda
    </div>
  )

  const maxRevenue = Math.max(...groups.map((g) => g.revenue + g.pipeline), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {groups.map((group, i) => {
        const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
        const barPct = ((group.revenue + group.pipeline) / maxRevenue) * 100
        const wonBarPct = (group.revenue / Math.max(group.revenue + group.pipeline, 1)) * 100

        return (
          <motion.button
            key={group.id}
            {...motionPresets.listItem(i)}
            type="button"
            onClick={() => navigate('/teams')}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 0',
              borderBottom: i < groups.length - 1 ? `1px solid ${border}` : 'none',
              backgroundColor: 'transparent', border: 'none',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'opacity 0.15s ease',
            }}
            whileHover={{ opacity: 0.75 }}
          >
            {/* Rank */}
            <div style={{ width: '28px', textAlign: 'center', flexShrink: 0 }}>
              {rankEmoji
                ? <span style={{ fontSize: '16px' }}>{rankEmoji}</span>
                : <span style={{ fontSize: '12px', fontWeight: 700, color: muted }}>#{i + 1}</span>}
            </div>

            {/* Name + members */}
            <div style={{ width: '130px', flexShrink: 0, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {group.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                {group.members.slice(0, 4).map((m) => (
                  <div key={m.id} title={m.name} style={{
                    width: '18px', height: '18px', borderRadius: '5px',
                    backgroundColor: m.color, color: '#fff',
                    fontSize: '8px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {m.initials.slice(0, 1)}
                  </div>
                ))}
                {group.members.length > 4 && (
                  <span style={{ fontSize: '9px', color: muted, fontWeight: 600 }}>+{group.members.length - 4}</span>
                )}
                {group.members.length === 0 && (
                  <span style={{ fontSize: '10px', color: muted, fontStyle: 'italic' }}>Sem membros</span>
                )}
              </div>
            </div>

            {/* Bar chart */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ height: '8px', borderRadius: '99px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', overflow: 'hidden', position: 'relative' }}>
                {/* Total pipeline bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  style={{ position: 'absolute', height: '100%', borderRadius: '99px', backgroundColor: isDark ? 'rgba(107,18,18,0.35)' : 'rgba(107,18,18,0.12)' }}
                />
                {/* Won revenue bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct * wonBarPct / 100}%` }}
                  transition={{ duration: 0.9, delay: i * 0.07 + 0.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ position: 'absolute', height: '100%', borderRadius: '99px', backgroundColor: '#6b1212' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 600, fontFamily: "'Geist Mono', monospace" }}>
                  {fmtBRL(group.revenue)}
                </span>
                <span style={{ fontSize: '10px', color: muted }}>
                  · {group.deals} deals · {group.winRate.toFixed(0)}% WR
                </span>
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── WelcomeHero ──────────────────────────────────────────────────────────────

function WelcomeHero({ name, goalPct, isDark }: { name: string; goalPct: number; isDark: boolean }) {
  const bg    = isDark ? '#111110' : '#ffffff'
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const brand = isDark ? '#9b2020' : '#6b1212'
  const clamp = Math.min(Math.max(goalPct, 0), 100)
  return (
    <motion.div {...motionPresets.slideUp} style={{
      backgroundColor: bg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'}`,
      borderRadius: '18px', padding: '18px 22px',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
    }}>
      <div>
        <p style={{ fontSize: '12px', color: muted, margin: 0 }}>{greeting()},</p>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: '2px 0 0' }}>
          {name.split(' ')[0]} 👋
        </h2>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: '200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: muted }}>Meta do mês</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: text, fontFamily: "'Geist Mono', monospace" }}>{clamp}%</span>
        </div>
        <div style={{ height: '6px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${clamp}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            style={{ height: '100%', borderRadius: '9999px', backgroundColor: clamp >= 100 ? '#15803d' : clamp >= 70 ? brand : '#92400e' }}
          />
        </div>
        <p style={{ fontSize: '11px', color: muted, marginTop: '5px' }}>
          {clamp >= 100 ? '🏆 Meta superada!' : clamp >= 70 ? '✅ No caminho certo' : '⚠️ Abaixo do esperado'}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Atenção Imediata ─────────────────────────────────────────────────────────

function AtencaoImediata({ deals, isDark, navigate }: { deals: any[]; isDark: boolean; navigate: (p: string) => void }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const subtleBg = isDark ? '#191917' : '#f9fafb'

  if (deals.length === 0) return <EmptyState icon={<Zap size={16} />} title="Nenhum deal urgente" description="Sem fechamentos nos próximos 7 dias." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {deals.slice(0, 4).map((deal, i) => {
        const daysLeft = deal.expected_close
          ? Math.ceil((new Date(deal.expected_close).getTime() - Date.now()) / 86400000)
          : null
        const urgency = daysLeft !== null && daysLeft <= 0 ? 'danger' : daysLeft !== null && daysLeft <= 2 ? 'warning' : 'info'
        const urgencyColors = {
          danger:  { bg: isDark ? 'rgba(155,28,28,0.12)' : '#fff1f2', border: 'rgba(155,28,28,0.25)', badge: '#9b1c1c', text: 'Vence hoje!' },
          warning: { bg: isDark ? 'rgba(146,64,14,0.12)' : '#fffbeb', border: 'rgba(146,64,14,0.25)', badge: '#92400e', text: `Vence em ${daysLeft}d` },
          info:    { bg: isDark ? 'rgba(30,64,175,0.08)' : '#eff6ff', border: 'rgba(30,64,175,0.20)', badge: '#1e40af', text: `${daysLeft}d restantes` },
        }
        const uc = urgencyColors[urgency]
        return (
          <motion.button
            key={deal.id}
            {...motionPresets.listItem(i)}
            type="button" onClick={() => navigate(`/deal/${deal.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px', borderRadius: '12px',
              backgroundColor: uc.bg, border: `1px solid ${uc.border}`,
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'opacity 0.15s ease',
            }}
            whileHover={{ opacity: 0.85 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deal.name ?? deal.title}
              </p>
              <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{deal.company_name ?? '—'}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#15803d', fontFamily: "'Geist Mono', monospace" }}>
                {fmtBRL(deal.value ?? 0)}
              </p>
              <span style={{
                fontSize: '10px', fontWeight: 600, color: uc.badge,
                backgroundColor: `${uc.badge}18`, borderRadius: '4px', padding: '2px 6px',
              }}>
                {uc.text}
              </span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

function ActivityHeatmap({ deals, isDark }: { deals: any[]; isDark: boolean }) {
  const muted = isDark ? '#6b6760' : '#98a2b3'
  const brand = isDark ? '#9b2020' : '#6b1212'

  const heatmap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const deal of deals) {
      const day = deal.created_at?.slice(0, 10)
      if (day) map[day] = (map[day] ?? 0) + 1
    }
    const weeks: { date: string; count: number }[][] = []
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 7 * 12 + 1)
    let week: { date: string; count: number }[] = []
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      week.push({ date: key, count: map[key] ?? 0 })
      if (week.length === 7) { weeks.push(week); week = [] }
    }
    if (week.length > 0) weeks.push(week)
    return weeks
  }, [deals])

  const maxCount = Math.max(...heatmap.flat().map((c) => c.count), 1)

  return (
    <div>
      <div style={{ display: 'flex', gap: '3px', overflowX: 'auto' }}>
        {heatmap.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {week.map((day) => {
              const intensity = day.count / maxCount
              const bg = day.count === 0
                ? (isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6')
                : `rgba(107,18,18,${0.15 + intensity * 0.85})`
              return (
                <motion.div
                  key={day.date}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: wi * 0.01, duration: 0.15 }}
                  title={`${day.date}: ${day.count} atividade(s)`}
                  style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: bg, cursor: 'default' }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
        <span style={{ fontSize: '10px', color: muted }}>Menos</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
          <div key={v} style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: `rgba(107,18,18,${v})` }} />
        ))}
        <span style={{ fontSize: '10px', color: muted }}>Mais</span>
      </div>
    </div>
  )
}

// ─── Por que perdemos ─────────────────────────────────────────────────────────

function LossReasons({ deals, isDark }: { deals: any[]; isDark: boolean }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'

  const reasons = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of deals) {
      if (d.stage === 'lost' || d.stage_id === 'closed_lost') {
        const r = d.loss_reason ?? 'Não especificado'
        map[r] = (map[r] ?? 0) + 1
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [deals])

  if (reasons.length === 0) return <EmptyState icon={<Target size={16} />} title="Sem dados de perda" description="Nenhum deal perdido no período." />

  const max = Math.max(...reasons.map((r) => r[1]), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {reasons.map(([reason, count], i) => (
        <motion.div key={reason} {...motionPresets.listItem(i)} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: muted, width: '140px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reason}
          </span>
          <div style={{ flex: 1, height: '8px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(count / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', borderRadius: '9999px', backgroundColor: VIVID[i % VIVID.length] }}
            />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: text, fontFamily: "'Geist Mono', monospace", width: '20px', textAlign: 'right', flexShrink: 0 }}>
            {count}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Agenda de Hoje ───────────────────────────────────────────────────────────

function AgendaHoje({ meetings, isDark, navigate }: { meetings: any[]; isDark: boolean; navigate: (p: string) => void }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const subtleBg = isDark ? '#191917' : '#f9fafb'
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'

  if (meetings.length === 0) return (
    <EmptyState icon={<Calendar size={16} />} title="Sem reuniões hoje" description="Nenhuma reunião agendada para hoje." />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {meetings.slice(0, 4).map((m, i) => {
        const time = m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'
        const end  = m.scheduled_at && m.duration_minutes
          ? new Date(new Date(m.scheduled_at).getTime() + m.duration_minutes * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : null
        return (
          <motion.button
            key={m.id}
            {...motionPresets.listItem(i)}
            type="button"
            onClick={() => navigate('/calendar')}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '10px 12px', borderRadius: '12px',
              backgroundColor: 'transparent', border: `1px solid ${border}`,
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'background-color 0.1s ease',
            }}
            whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}
          >
            <div style={{
              flexShrink: 0, width: '36px', textAlign: 'center',
              borderRight: `2px solid ${VIVID[i % VIVID.length]}`,
              paddingRight: '10px',
            }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: VIVID[i % VIVID.length], lineHeight: 1.2 }}>{time}</p>
              {end && <p style={{ fontSize: '10px', color: muted }}>{end}</p>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.title}
              </p>
              {m.meeting_link && (
                <p style={{ fontSize: '11px', color: VIVID[2], marginTop: '2px' }}>🔗 Link disponível</p>
              )}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── Tarefas de Hoje ──────────────────────────────────────────────────────────

function TarefasHoje({ tasks, isDark, navigate }: { tasks: any[]; isDark: boolean; navigate: (p: string) => void }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'

  const PRIORITY_COLORS: Record<string, string> = {
    high: '#9b1c1c', medium: '#92400e', low: '#15803d', urgent: '#7c0000',
  }

  if (tasks.length === 0) return <EmptyState icon={<CheckSquare size={16} />} title="Nenhuma tarefa para hoje" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {tasks.map((task, i) => {
        const today = new Date().toISOString().slice(0, 10)
        const isOverdue = !!task.due_date && task.due_date < today
        const pColor = PRIORITY_COLORS[task.priority ?? 'medium']
        return (
          <motion.button
            key={task.id}
            {...motionPresets.listItem(i)}
            type="button"
            onClick={() => navigate('/tarefas')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '7px',
              backgroundColor: isOverdue ? (isDark ? 'rgba(155,28,28,0.08)' : '#fff5f5') : 'transparent',
              border: `1px solid ${isOverdue ? 'rgba(155,28,28,0.25)' : border}`,
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'background-color 0.1s ease',
            }}
            whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }}
          >
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: pColor, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '13px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {isOverdue && <AlertTriangle size={11} color="#9b1c1c" />}
              <span style={{
                fontSize: '10px', fontWeight: 600, color: pColor,
                backgroundColor: `${pColor}14`, borderRadius: '4px', padding: '1px 6px',
              }}>
                {task.priority ?? 'Média'}
              </span>
              {task.due_date && (
                <span style={{ fontSize: '10px', color: muted }}>
                  {new Date(task.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              )}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── O que fazer hoje ─────────────────────────────────────────────────────────

function OQueFazerHoje({ actions, isDark, navigate }: { actions: { text: string; sub: string; href: string; color: string }[]; isDark: boolean; navigate: (p: string) => void }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {actions.map((a, i) => (
        <motion.button
          key={i}
          {...motionPresets.listItem(i)}
          type="button"
          onClick={() => navigate(a.href)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
            borderRadius: '8px', border: `1px solid ${a.color}25`,
            backgroundColor: `${a.color}08`,
            cursor: 'pointer', textAlign: 'left', width: '100%',
            transition: 'opacity 0.15s ease',
          }}
          whileHover={{ opacity: 0.8 }}
        >
          <div style={{ width: '4px', height: '36px', borderRadius: '9999px', backgroundColor: a.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.text}
            </p>
            <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{a.sub}</p>
          </div>
          <ArrowRight size={14} color={muted} />
        </motion.button>
      ))}
      {actions.length === 0 && <EmptyState icon={<CheckCircle2 size={16} />} title="Tudo em dia!" description="Nenhuma ação urgente hoje." />}
    </div>
  )
}

// ─── Personalizar Drawer ──────────────────────────────────────────────────────

const SECTIONS_CONFIG = [
  { id: 'hero',         label: 'Boas vindas + Meta' },
  { id: 'kpis',         label: 'KPIs Principais' },
  { id: 'pipeline_area',label: 'Gráfico Pipeline + Funil' },
  { id: 'atencao',      label: 'Atenção Imediata' },
  { id: 'tarefas',      label: 'Tarefas de Hoje' },
  { id: 'agenda',       label: 'Agenda de Hoje' },
  { id: 'oq_fazer',     label: 'O que fazer hoje' },
  { id: 'heatmap',      label: 'Atividade do Time' },
  { id: 'loss',         label: 'Por que perdemos?' },
  { id: 'activity',     label: 'Atividade Recente' },
  { id: 'top_deals',    label: 'Top Oportunidades' },
  { id: 'grupos',       label: 'Performance por Grupo' },
  { id: 'renovacao',    label: 'Alertas de Renovação' },
]

const PERSIST_KEY = 'esq_dashboard_sections_v2'

function loadSections(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(PERSIST_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return Object.fromEntries(SECTIONS_CONFIG.map((s) => [s.id, true]))
}

function PersonalizarDrawer({ visible, onClose, sections, onToggle, isDark }: {
  visible: boolean; onClose: () => void
  sections: Record<string, boolean>
  onToggle: (id: string) => void
  isDark: boolean
}) {
  const bg    = isDark ? '#161614' : '#ffffff'
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const border= isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const brand = isDark ? '#9b2020' : '#6b1212'

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40 }}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '320px',
              backgroundColor: bg, borderLeft: `1px solid ${border}`,
              boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
              zIndex: 50, display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: text, margin: 0 }}>Personalizar</p>
                <p style={{ fontSize: '12px', color: muted, marginTop: '2px' }}>Ative ou desative secções</p>
              </div>
              <button type="button" onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {SECTIONS_CONFIG.map((section) => {
                const active = sections[section.id] !== false
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onToggle(section.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '11px 20px',
                      backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                      textAlign: 'left', transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <GripVertical size={14} color={muted} />
                    <span style={{ flex: 1, fontSize: '13px', color: active ? text : muted, fontWeight: active ? 500 : 400 }}>
                      {section.label}
                    </span>
                    <div style={{
                      width: '36px', height: '20px', borderRadius: '10px',
                      backgroundColor: active ? brand : (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'),
                      position: 'relative', transition: 'background-color 0.2s ease', flexShrink: 0,
                    }}>
                      <motion.div
                        animate={{ x: active ? 16 : 2 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          position: 'absolute', top: '2px', width: '16px', height: '16px',
                          borderRadius: '50%', backgroundColor: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${border}` }}>
              <p style={{ fontSize: '11px', color: muted, textAlign: 'center' }}>Preferências guardadas automaticamente</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function Leaderboard({ owners, isDark }: { owners: { name: string; color: string; won: number; pipeline: number; deals: number }[]; isDark: boolean }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const maxPipeline = Math.max(...owners.map((o) => o.pipeline + o.won), 1)

  if (owners.length === 0) return <EmptyState icon={<Users size={16} />} title="Sem dados de equipa" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {owners.slice(0, 6).map((owner, i) => (
        <motion.div key={owner.name} {...motionPresets.listItem(i)} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'center' }}>
            {i === 0 ? <span style={{ fontSize: '14px' }}>🥇</span>
            : i === 1 ? <span style={{ fontSize: '14px' }}>🥈</span>
            : i === 2 ? <span style={{ fontSize: '14px' }}>🥉</span>
            : <span style={{ fontSize: '12px', fontWeight: 600, color: muted }}>#{i + 1}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: owner.color, color: '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getInitials(owner.name)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner.name.split(' ')[0]}</p>
              <div style={{ height: '4px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: '9999px', overflow: 'hidden', marginTop: '3px' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((owner.won + owner.pipeline) / maxPipeline) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', borderRadius: '9999px', background: `linear-gradient(90deg, ${owner.color}, ${owner.color}88)` }}
                />
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(owner.won)}</p>
            <p style={{ fontSize: '10px', color: muted }}>{owner.deals} deals</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Tab + Period ─────────────────────────────────────────────────────────────

function TabBar({ active, onChange, isDark }: { active: string; onChange: (t: string) => void; isDark: boolean }) {
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#6b6760' : '#667085'
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, marginBottom: '20px' }}>
      {['operacao', 'resultados'].map((tab) => (
        <button key={tab} type="button" onClick={() => onChange(tab)} style={{
          height: '40px', padding: '0 18px', fontSize: '13px',
          fontWeight: active === tab ? 600 : 400,
          color: active === tab ? text : muted,
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: `2px solid ${active === tab ? '#6b1212' : 'transparent'}`,
          marginBottom: '-1px', transition: 'all 0.15s ease', letterSpacing: '-0.01em',
        }}>
          {tab === 'operacao' ? 'Operação' : 'Resultados'}
        </button>
      ))}
    </div>
  )
}

function PeriodSelector({ value, onChange, isDark }: { value: Period; onChange: (p: Period) => void; isDark: boolean }) {
  const bg = isDark ? '#1c1c1a' : '#f3f4f6'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#eaecf0'
  return (
    <div style={{ display: 'flex', backgroundColor: bg, borderRadius: '8px', padding: '2px', gap: '1px' }}>
      {(['30d', '90d', '12m'] as Period[]).map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} style={{
          height: '26px', padding: '0 11px', fontSize: '12px', fontWeight: 500,
          borderRadius: '6px', border: 'none', cursor: 'pointer',
          backgroundColor: value === o ? (isDark ? '#2a2a28' : '#ffffff') : 'transparent',
          color: value === o ? (isDark ? '#edeae4' : '#101828') : (isDark ? '#6b6760' : '#667085'),
          boxShadow: value === o ? (isDark ? 'none' : `0 1px 3px rgba(16,24,40,0.08), 0 0 0 1px ${border}`) : 'none',
          transition: 'all 0.15s ease',
        }}>{o}</button>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const profile  = useAuthStore((s) => s.profile)
  const deals    = useVisibleDeals()
  const allDeals = useDealStore((s) => s.deals)
  const tasks    = useTaskStore((s) => s.tasks)
  const meetings = useMeetingStore((s) => s.meetings)
  const { settings } = useSettingsStore()
  const teams  = useTeamStore((s) => s.teams)
  const owners = useOwnerStore((s) => s.owners)
  const navigate = useNavigate()

  const [tab, setTab]           = useState<'operacao' | 'resultados'>('operacao')
  const [period, setPeriod]     = useState<Period>('90d')
  const [showPersonalizar, setShowPersonalizar] = useState(false)
  const [sections, setSections] = useState<Record<string, boolean>>(loadSections)

  const pageBg = isDark ? '#0a0a08' : '#f9fafb'
  const brand  = isDark ? '#9b2020' : '#6b1212'

  const toggleSection = useCallback((id: string) => {
    setSections((prev) => {
      const next = { ...prev, [id]: !(prev[id] !== false) }
      try { localStorage.setItem(PERSIST_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const show = useCallback((id: string) => sections[id] !== false, [sections])

  // ── Cutoff ──
  const cutoff = useMemo(() => {
    const now = new Date()
    if (period === '30d') return new Date(now.getTime() - 30 * 86400000).toISOString()
    if (period === '90d') return new Date(now.getTime() - 90 * 86400000).toISOString()
    return new Date(now.getTime() - 365 * 86400000).toISOString()
  }, [period])

  const filteredDeals = useMemo(() => deals.filter((d) => d.created_at >= cutoff), [deals, cutoff])

  // ── KPIs ──
  const kpis = useMemo(() => {
    const active = filteredDeals.filter((d) => d.stage !== 'won' && d.stage !== 'lost' && d.stage_id !== 'closed_won' && d.stage_id !== 'closed_lost')
    const won    = filteredDeals.filter((d) => d.stage === 'won' || d.stage_id === 'closed_won')
    const pipeline = active.reduce((s, d) => s + (d.value ?? 0), 0)
    const revenue  = won.reduce((s, d) => s + (d.value ?? 0), 0)
    const winRate  = filteredDeals.length > 0 ? (won.length / filteredDeals.length) * 100 : 0
    const ticket   = won.length > 0 ? revenue / won.length : 0
    const today    = new Date().toISOString().slice(0, 10)
    const overdue  = tasks.filter((t) => !t.completed_at && !!t.due_date && t.due_date < today).length
    const pending  = tasks.filter((t) => !t.completed_at).length
    const meta     = settings?.monthly_target ?? 0
    const goalPct  = meta > 0 ? Math.round((revenue / meta) * 100) : 0

    // Cycle time: avg days from created_at to updated_at for won deals
    const wonWithDates = won.filter((d) => d.created_at && d.updated_at)
    const avgCycleDays = wonWithDates.length > 0
      ? Math.round(wonWithDates.reduce((s, d) => {
          return s + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000
        }, 0) / wonWithDates.length)
      : 0

    // Month progress
    const now = new Date()
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const monthPct = Math.round((dayOfMonth / daysInMonth) * 100)

    // Monthly revenue (current month only)
    const thisMonth = now.toISOString().slice(0, 7)
    const thisMonthRevenue = deals
      .filter((d) => (d.stage === 'won' || d.stage_id === 'closed_won') && (d.updated_at ?? d.created_at)?.slice(0, 7) === thisMonth)
      .reduce((s, d) => s + (d.value ?? 0), 0)

    // Meetings this month
    const monthMeetings = meetings.filter((m) => m.scheduled_at?.slice(0, 7) === thisMonth)
    // Expected meetings: rough estimate (e.g., target from settings or 1 per active deal per 2 weeks)
    const expectedMeetings = Math.max(monthMeetings.length, Math.ceil(active.length * 0.3))

    return {
      active: active.length, won: won.length, pipeline, revenue, winRate, ticket,
      overdue, pending, goalPct, total: filteredDeals.length,
      avgCycleDays, dayOfMonth, daysInMonth, monthPct,
      thisMonthRevenue, monthMeetings: monthMeetings.length, expectedMeetings,
    }
  }, [filteredDeals, tasks, settings, deals, meetings])

  // ── Monthly data ──
  const monthlyData = useMemo(() => {
    const months: Record<string, { label: string; created: number; won: number; pipeline: number }> = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      months[key] = { label, created: 0, won: 0, pipeline: 0 }
    }
    for (const deal of deals) {
      const key = deal.created_at?.slice(0, 7)
      if (key && months[key]) {
        months[key].created++
        months[key].pipeline += deal.value ?? 0
      }
      if (deal.stage === 'won' || deal.stage_id === 'closed_won') {
        const wk = (deal.updated_at ?? deal.created_at)?.slice(0, 7)
        if (wk && months[wk]) months[wk].won += deal.value ?? 0
      }
    }
    return Object.values(months)
  }, [deals])

  // ── Stacked by stage ──
  const stackedData = useMemo(() => {
    const months: Record<string, Record<string, number> & { label: string }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      months[key] = { label }
    }
    for (const deal of deals) {
      const key = deal.created_at?.slice(0, 7)
      const stageKey = deal.stage ?? deal.stage_id ?? 'outros'
      if (key && months[key]) months[key][stageKey] = (months[key][stageKey] ?? 0) + (deal.value ?? 0)
    }
    return Object.values(months)
  }, [deals])

  const stageIds = useMemo(() => [...new Set(deals.map((d) => d.stage ?? d.stage_id).filter(Boolean))].slice(0, 5), [deals])

  // ── Stage funnel ──
  const stageData = useMemo(() => STAGES.map((stage) => {
    const sd = deals.filter((d) => d.stage === stage.id || d.stage_id === stage.id)
    return { label: stage.label, color: stage.color, count: sd.length, value: sd.reduce((s, d) => s + (d.value ?? 0), 0) }
  }).filter((s) => s.count > 0), [deals])

  // ── Deal owners (leaderboard) ──
  const dealOwners = useMemo(() => {
    const map = new Map<string, { name: string; color: string; won: number; pipeline: number; deals: number }>()
    for (const deal of deals) {
      const name  = deal.owner_name ?? deal.owner?.name ?? 'Sem responsável'
      const color = deal.owner_avatar_color ?? deal.owner?.avatar_color ?? '#667085'
      if (!map.has(name)) map.set(name, { name, color, won: 0, pipeline: 0, deals: 0 })
      const e = map.get(name)!
      e.deals++
      if (deal.stage === 'won' || deal.stage_id === 'closed_won') e.won += deal.value ?? 0
      else e.pipeline += deal.value ?? 0
    }
    return [...map.values()].sort((a, b) => (b.won + b.pipeline) - (a.won + a.pipeline))
  }, [deals])

  // ── Atenção Imediata ──
  const urgentDeals = useMemo(() => {
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString()
    return deals
      .filter((d) => d.expected_close && d.expected_close <= in7 && d.stage !== 'won' && d.stage_id !== 'closed_won')
      .sort((a, b) => (a.expected_close ?? '').localeCompare(b.expected_close ?? ''))
  }, [deals])

  // ── Admin check ──
  const isAdmin = profile?.is_admin ?? false

  // ── Renovation alerts (expected_close in next 30-60 days for won deals or near-closing) ──
  const renewalDeals = useMemo(() => {
    const in60 = new Date(Date.now() + 60 * 86400000).toISOString()
    const in7  = new Date(Date.now() + 7  * 86400000).toISOString()
    return deals
      .filter((d) => d.expected_close && d.expected_close > in7 && d.expected_close <= in60 && d.stage !== 'lost' && d.stage_id !== 'closed_lost')
      .sort((a, b) => (a.expected_close ?? '').localeCompare(b.expected_close ?? ''))
  }, [deals])

  // ── Group stats ──
  const groupStats = useMemo((): GroupStat[] => {
    return [...teams].map((team) => {
      const teamDeals = allDeals.filter((d) => d.team_id === team.id)
      const won = teamDeals.filter((d) => d.stage === 'won' || d.stage_id === 'closed_won')
      const active = teamDeals.filter((d) => d.stage !== 'won' && d.stage !== 'lost' && d.stage_id !== 'closed_won' && d.stage_id !== 'closed_lost')
      const revenue = won.reduce((s, d) => s + (d.value ?? 0), 0)
      const pipeline = active.reduce((s, d) => s + (d.value ?? 0), 0)
      const winRate = teamDeals.length > 0 ? (won.length / teamDeals.length) * 100 : 0
      const teamMembers = owners
        .filter((o) => o.team_id === team.id)
        .map((o) => ({ id: o.id, name: o.name, initials: o.initials, color: o.avatar_color ?? '#667085' }))
      return { id: team.id, name: team.name, members: teamMembers, pipeline, revenue, deals: teamDeals.length, winRate, rank: 0 }
    })
      .sort((a, b) => (b.revenue + b.pipeline) - (a.revenue + a.pipeline))
      .map((g, i) => ({ ...g, rank: i + 1 }))
  }, [teams, allDeals, owners])

  // ── Meetings hoje ──
  const todayMeetings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return meetings.filter((m) => m.scheduled_at?.slice(0, 10) === today).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
  }, [meetings])

  // ── Tasks hoje ──
  const today = new Date().toISOString().slice(0, 10)
  const todayTasks = useMemo(() => tasks.filter((t) => !t.completed_at && (!t.due_date || t.due_date <= today)).sort((a, b) => {
    if (!a.due_date) return 1; if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  }).slice(0, 8), [tasks, today])

  // ── O que fazer hoje ──
  const actionItems = useMemo(() => {
    const items: { text: string; sub: string; href: string; color: string }[] = []
    if (kpis.overdue > 0) items.push({ text: `${kpis.overdue} tarefa${kpis.overdue > 1 ? 's' : ''} em atraso`, sub: 'Requer atenção imediata', href: '/tarefas', color: '#9b1c1c' })
    if (urgentDeals.length > 0) items.push({ text: `${urgentDeals.length} deal${urgentDeals.length > 1 ? 's' : ''} vence em 7 dias`, sub: fmtBRL(urgentDeals.reduce((s, d) => s + (d.value ?? 0), 0)) + ' em risco', href: '/pipeline', color: '#92400e' })
    if (todayMeetings.length > 0) items.push({ text: `${todayMeetings.length} reunião${todayMeetings.length > 1 ? 'ões' : ''} hoje`, sub: `Primeira às ${new Date(todayMeetings[0].scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, href: '/calendar', color: '#1e40af' })
    const stale = deals.filter((d) => {
      if (d.stage === 'won' || d.stage_id === 'closed_won' || d.stage === 'lost' || d.stage_id === 'closed_lost') return false
      const lastAct = d.last_activity_at ?? d.updated_at
      return !lastAct || (Date.now() - new Date(lastAct).getTime()) > 21 * 86400000
    })
    if (stale.length > 0) items.push({ text: `${stale.length} lead${stale.length > 1 ? 's' : ''} sem atividade há 21+ dias`, sub: 'Risco de perda por inatividade', href: '/pipeline', color: '#6d28d9' })
    return items
  }, [kpis.overdue, urgentDeals, todayMeetings, deals])

  // ── Sparkline data ──
  const spkPipeline = monthlyData.slice(-6).map((m) => m.pipeline)
  const spkWon      = monthlyData.slice(-6).map((m) => m.won)

  // ── Donut data ──
  const donutData = stageData.filter((s) => s.value > 0).map((s) => ({ label: s.label, value: s.value }))

  const tooltipStyle = {
    backgroundColor: isDark ? '#1c1c1a' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#eaecf0'}`,
    borderRadius: '8px', fontSize: '12px',
    boxShadow: '0 4px 12px rgba(16,24,40,0.12)',
    color: isDark ? '#edeae4' : '#101828',
  }
  const axisStyle = { fontSize: 11, fill: isDark ? '#6b6760' : '#98a2b3' }
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: pageBg }}>

      {/* Personalizar Drawer */}
      <PersonalizarDrawer visible={showPersonalizar} onClose={() => setShowPersonalizar(false)} sections={sections} onToggle={toggleSection} isDark={isDark} />

      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        subtitle={`${kpis.total} oportunidades`}
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <PeriodSelector value={period} onChange={setPeriod} isDark={isDark} />
            <button
              type="button"
              onClick={() => setShowPersonalizar(true)}
              style={{
                height: '32px', padding: '0 12px', borderRadius: '7px',
                backgroundColor: 'transparent',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#eaecf0'}`,
                color: isDark ? '#6b6760' : '#667085', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', fontWeight: 500, transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = brand; e.currentTarget.style.color = brand }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#eaecf0'; e.currentTarget.style.color = isDark ? '#6b6760' : '#667085' }}
            >
              <Settings2 size={13} />
              Personalizar
            </button>
          </div>
        }
      />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Welcome hero */}
          {show('hero') && (
            <WelcomeHero name={profile?.full_name ?? 'Utilizador'} goalPct={kpis.goalPct} isDark={isDark} />
          )}

          {/* Tab bar */}
          <TabBar active={tab} onChange={(t) => setTab(t as 'operacao' | 'resultados')} isDark={isDark} />

          <AnimatePresence mode="wait">

            {/* ── TAB OPERAÇÃO ── */}
            {tab === 'operacao' && (
              <motion.div key="op" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* 6 KPIs */}
                {show('kpis') && (<>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <StatCard icon={<Briefcase size={15} />} color="accent" label="Pipeline Ativo" value={fmtBRL(kpis.pipeline)} delta={`${kpis.active} oportunidades`} deltaType="neutral" index={0} sparklineData={spkPipeline} />
                    <StatCard icon={<Target size={15} />} color="success" label="Receita do Mês" value={fmtBRL(kpis.thisMonthRevenue)} delta={`Meta: ${kpis.goalPct}%`} deltaType={kpis.goalPct >= 100 ? 'positive' : kpis.goalPct >= 70 ? 'neutral' : 'negative'} index={1} sparklineData={spkWon} />
                    <StatCard icon={<Award size={15} />} color="info" label="Taxa de Conversão" value={fmtPct(kpis.winRate)} delta={kpis.winRate >= 30 ? 'Saudável' : 'A melhorar'} deltaType={kpis.winRate >= 30 ? 'positive' : 'negative'} index={2} />
                    <StatCard icon={<Clock size={15} />} color="warning" label="Tempo de Ciclo" value={kpis.avgCycleDays > 0 ? `${kpis.avgCycleDays}d` : '—'} delta="média até fechar" deltaType="neutral" index={3} />
                    <StatCard icon={<Calendar size={15} />} color="neutral" label="Dia do Mês" value={`${kpis.dayOfMonth}/${kpis.daysInMonth}`} delta={`${kpis.monthPct}% do mês`} deltaType={kpis.monthPct > (kpis.goalPct) ? 'negative' : 'positive'} index={4} />
                    <StatCard icon={<Users size={15} />} color={kpis.monthMeetings >= kpis.expectedMeetings ? 'success' : 'warning'} label="Reuniões do Mês" value={`${kpis.monthMeetings}/${kpis.expectedMeetings}`} delta={kpis.monthMeetings >= kpis.expectedMeetings ? 'Meta atingida' : 'Abaixo do esperado'} deltaType={kpis.monthMeetings >= kpis.expectedMeetings ? 'positive' : 'negative'} index={5} onClick={() => navigate('/calendar')} />
                  </div>
                </>)}

                {/* Pipeline Área + Funil Stacked */}
                {show('pipeline_area') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                    <Card title="Evolução do Pipeline" subtitle="6 meses · por fase" isDark={isDark}>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stackedData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
                          <CartesianGrid stroke={gridColor} strokeDasharray="0" vertical={false} />
                          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtBRL} width={56} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }} />
                          {stageIds.map((sid, i) => (
                            <Bar key={sid} dataKey={sid} stackId="a" fill={STAGE_COLORS[i % STAGE_COLORS.length]}
                              radius={i === stageIds.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                              isAnimationActive animationDuration={800} animationEasing="ease-out" />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card title="Funil de Conversão" subtitle="por fase" isDark={isDark}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {stageData.map((stage, i) => {
                          const pct = stageData[0]?.count > 0 ? (stage.count / stageData[0].count) * 100 : 0
                          const convPct = i > 0 && stageData[i - 1].count > 0 ? Math.round((stage.count / stageData[i - 1].count) * 100) : null
                          return (
                            <div key={stage.label}>
                              {convPct !== null && (
                                <div style={{ textAlign: 'center', fontSize: '10px', color: isDark ? '#6b6760' : '#98a2b3', marginBottom: '3px' }}>↓ {convPct}%</div>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: isDark ? '#6b6760' : '#667085', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage.label}</span>
                                <div style={{ height: '8px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                                  <motion.div
                                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                                    style={{ height: '100%', borderRadius: '9999px', backgroundColor: stage.color }}
                                  />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#edeae4' : '#101828', fontFamily: "'Geist Mono', monospace", textAlign: 'right' }}>{stage.count}</span>
                              </div>
                            </div>
                          )
                        })}
                        {stageData.length === 0 && <EmptyState icon={<TrendingUp size={16} />} title="Sem dados" />}
                      </div>
                    </Card>
                  </div>
                )}

                {/* Atenção Imediata + O que fazer hoje */}
                {(show('atencao') || show('oq_fazer')) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {show('atencao') && (
                      <Card title="⚡ Atenção Imediata" subtitle={`${urgentDeals.length} deals vencendo`} isDark={isDark}
                        action={urgentDeals.length > 0 ? <button type="button" onClick={() => navigate('/pipeline')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver pipeline <ArrowRight size={12} /></button> : undefined}>
                        <AtencaoImediata deals={urgentDeals} isDark={isDark} navigate={navigate} />
                      </Card>
                    )}
                    {show('oq_fazer') && (
                      <Card title="💡 O que fazer hoje" subtitle={`${actionItems.length} ação${actionItems.length !== 1 ? 'ões' : ''} prioritária${actionItems.length !== 1 ? 's' : ''}`} isDark={isDark}>
                        <OQueFazerHoje actions={actionItems} isDark={isDark} navigate={navigate} />
                      </Card>
                    )}
                  </div>
                )}

                {/* Atividade recente */}
                {show('activity') && (
                  <Card title="Atividade Recente" subtitle="Últimas oportunidades" isDark={isDark}
                    action={<button type="button" onClick={() => navigate('/atividades')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver tudo <ArrowRight size={12} /></button>}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[...deals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6).map((deal, i) => {
                        const stage = STAGES.find((s) => s.id === (deal.stage ?? deal.stage_id))
                        return (
                          <motion.button key={deal.id} {...motionPresets.listItem(i)} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background-color 0.1s ease' }}
                            whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: stage?.color ?? '#98a2b3', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: isDark ? '#edeae4' : '#101828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {deal.name ?? deal.title}
                            </span>
                            <span style={{ fontSize: '11px', color: isDark ? '#6b6760' : '#98a2b3', flexShrink: 0 }}>{timeAgo(deal.created_at)}</span>
                          </motion.button>
                        )
                      })}
                      {deals.length === 0 && <EmptyState icon={<Activity size={16} />} title="Sem atividade" />}
                    </div>
                  </Card>
                )}

                {/* Tarefas + Agenda */}
                {(show('tarefas') || show('agenda')) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {show('tarefas') && (
                      <Card title="📋 Tarefas de Hoje" subtitle={`${todayTasks.length} pendente${todayTasks.length !== 1 ? 's' : ''}`} isDark={isDark}
                        action={<button type="button" onClick={() => navigate('/tarefas')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver todas <ArrowRight size={12} /></button>}>
                        <TarefasHoje tasks={todayTasks} isDark={isDark} navigate={navigate} />
                      </Card>
                    )}
                    {show('agenda') && (
                      <Card title="📅 Agenda de Hoje" subtitle={`${todayMeetings.length} reunião${todayMeetings.length !== 1 ? 'ões' : ''}`} isDark={isDark}
                        action={<button type="button" onClick={() => navigate('/calendar')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Calendário <ArrowRight size={12} /></button>}>
                        <AgendaHoje meetings={todayMeetings} isDark={isDark} navigate={navigate} />
                      </Card>
                    )}
                  </div>
                )}

                {/* Grupos + Renovações */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                  <Card
                    title="🏆 Performance por Grupo"
                    subtitle={`${groupStats.length} grupo${groupStats.length !== 1 ? 's' : ''} · ranking por receita`}
                    isDark={isDark}
                    action={<button type="button" onClick={() => navigate('/teams')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver grupos <ArrowRight size={12} /></button>}
                  >
                    <GruposPerformance groups={groupStats} isDark={isDark} navigate={navigate} />
                  </Card>

                  <Card
                    title="🔔 Alertas de Renovação"
                    subtitle={`${renewalDeals.length} vencendo em 60 dias`}
                    isDark={isDark}
                    action={renewalDeals.length > 0 ? <button type="button" onClick={() => navigate('/pipeline')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Pipeline <ArrowRight size={12} /></button> : undefined}
                  >
                    <RenovacaoAlert deals={renewalDeals} isDark={isDark} navigate={navigate} />
                  </Card>
                </div>

              </motion.div>
            )}

            {/* ── TAB RESULTADOS ── */}
            {tab === 'resultados' && (
              <motion.div key="res" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* 4 KPIs resultado */}
                {show('kpis') && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <StatCard icon={<DollarSign size={15} />} color="success" label="Receita Fechada" value={fmtBRL(kpis.revenue)} delta={`${kpis.won} oportunidades`} deltaType="positive" index={0} sparklineData={spkWon} />
                    <StatCard icon={<Target size={15} />} color={kpis.goalPct >= 100 ? 'success' : kpis.goalPct >= 70 ? 'warning' : 'danger'} label="Meta Atingida" value={`${kpis.goalPct}%`} delta={kpis.goalPct >= 100 ? 'Superada!' : `Faltam ${fmtBRL(Math.max(0, (settings?.monthly_target ?? 0) - kpis.revenue))}`} deltaType={kpis.goalPct >= 100 ? 'positive' : kpis.goalPct >= 70 ? 'neutral' : 'negative'} index={1} />
                    <StatCard icon={<Award size={15} />} color="info" label="Win Rate" value={fmtPct(kpis.winRate)} delta={`${kpis.total} oportunidades`} deltaType={kpis.winRate >= 30 ? 'positive' : 'negative'} index={2} />
                    <StatCard icon={<BarChart2 size={15} />} color="accent" label="Ticket Médio" value={fmtBRL(kpis.ticket)} delta="por negócio ganho" deltaType="neutral" index={3} />
                  </div>
                )}

                {/* Área chart + Donut */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <Card title="Receita Mensal" subtitle="Criado vs Fechado · 12 meses" isDark={isDark}>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="ga1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={brand} stopOpacity={isDark ? 0.25 : 0.15} />
                            <stop offset="95%" stopColor={brand} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="ga2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#15803d" stopOpacity={isDark ? 0.25 : 0.15} />
                            <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={gridColor} strokeDasharray="0" vertical={false} />
                        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtBRL} width={56} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
                        <Area type="monotone" dataKey="pipeline" stroke={brand} strokeWidth={2} fill="url(#ga1)" dot={false} activeDot={{ r: 4, fill: brand }} isAnimationActive animationDuration={1000} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="won" stroke="#15803d" strokeWidth={2} fill="url(#ga2)" dot={false} activeDot={{ r: 4, fill: '#15803d' }} strokeDasharray="5 3" isAnimationActive animationDuration={1200} animationEasing="ease-out" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isDark ? '#6b6760' : '#667085' }}>
                        <div style={{ width: '20px', height: '2px', backgroundColor: brand }} />Pipeline
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isDark ? '#6b6760' : '#667085' }}>
                        <div style={{ width: '20px', height: '2px', backgroundColor: '#15803d', borderTop: '2px dashed #15803d' }} />Receita
                      </span>
                    </div>
                  </Card>

                  <Card title="Por Fase" subtitle="Distribuição pipeline" isDark={isDark}>
                    <div style={{ position: 'relative' }}>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={donutData} cx="50%" cy="50%" innerRadius="60%" outerRadius="82%" dataKey="value" paddingAngle={2} strokeWidth={0} isAnimationActive animationDuration={800}>
                            {donutData.map((_, i) => <Cell key={i} fill={VIVID[i % VIVID.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#edeae4' : '#101828', fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(kpis.pipeline)}</div>
                        <div style={{ fontSize: '10px', color: isDark ? '#6b6760' : '#667085', marginTop: '1px' }}>total</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                      {donutData.slice(0, 4).map((d, i) => (
                        <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: VIVID[i % VIVID.length] }} />
                            <span style={{ fontSize: '11px', color: isDark ? '#6b6760' : '#667085' }}>{d.label}</span>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 500, color: isDark ? '#edeae4' : '#101828', fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Heatmap + Por que perdemos */}
                {(show('heatmap') || show('loss')) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {show('heatmap') && (
                      <Card title="Atividade do Time" subtitle="Oportunidades criadas · 12 semanas" isDark={isDark}>
                        <ActivityHeatmap deals={deals} isDark={isDark} />
                      </Card>
                    )}
                    {show('loss') && (
                      <Card title="Por que perdemos?" subtitle="Motivos de perda" isDark={isDark}>
                        <LossReasons deals={deals} isDark={isDark} />
                      </Card>
                    )}
                  </div>
                )}


                {/* Top deals */}
                {show('top_deals') && (
                  <Card title="Top Oportunidades" subtitle="Por valor" isDark={isDark}
                    action={<button type="button" onClick={() => navigate('/pipeline')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Pipeline <ArrowRight size={12} /></button>}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {[...filteredDeals].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 5).map((deal, i) => {
                        const stage = STAGES.find((s) => s.id === (deal.stage ?? deal.stage_id))
                        return (
                          <motion.button key={deal.id} {...motionPresets.listItem(i)} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                            style={{ display: 'grid', gridTemplateColumns: '24px 1fr 100px 90px', alignItems: 'center', gap: '12px', padding: '10px 10px', borderRadius: '7px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.1s ease' }}
                            whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }}>
                            <span style={{ fontSize: '12px', color: isDark ? '#6b6760' : '#98a2b3', fontWeight: 500 }}>#{i + 1}</span>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#edeae4' : '#101828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.name ?? deal.title}</p>
                              {deal.company_name && <p style={{ fontSize: '11px', color: isDark ? '#6b6760' : '#98a2b3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.company_name}</p>}
                            </div>
                            {stage && <span style={{ fontSize: '10px', fontWeight: 600, color: stage.color, backgroundColor: `${stage.color}14`, borderRadius: '5px', padding: '3px 8px', textAlign: 'center' }}>{stage.label}</span>}
                            <span style={{ fontSize: '13px', fontWeight: 600, color: (deal.stage === 'won' || deal.stage_id === 'closed_won') ? '#15803d' : (isDark ? '#edeae4' : '#101828'), fontFamily: "'Geist Mono', monospace", textAlign: 'right' }}>
                              {fmtBRL(deal.value ?? 0)}
                            </span>
                          </motion.button>
                        )
                      })}
                      {filteredDeals.length === 0 && <EmptyState icon={<Activity size={16} />} title="Sem oportunidades no período" />}
                    </div>
                  </Card>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
