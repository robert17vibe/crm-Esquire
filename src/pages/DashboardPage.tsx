import React, { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  TrendingUp, DollarSign, Target, Award, CheckSquare,
  Users, AlertTriangle, ArrowRight, BarChart2, Activity, Settings2,
  X, Calendar, Zap, CheckCircle2, GripVertical, LayoutDashboard,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useDealStore } from '@/store/useDealStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { usePaymentStore } from '@/store/usePaymentStore'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import { STAGES } from '@/constants/pipeline'
import { PageHeader } from '@/components/crm/PageHeader'
import { StatCard } from '@/components/crm/StatCard'
import { EmptyState } from '@/components/crm/EmptyState'
import { motionPresets } from '@/lib/motion'
import { AnalyticsSection } from '@/components/crm/AnalyticsSection'

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

const VIVID = ['#6b1212', '#2c5545', '#a88030', '#4d7aa8', '#8878b8', '#4d8fa8']
const STAGE_COLORS = ['#94a3b8', '#6366f1', '#8b5cf6', '#f59e0b', '#3d8a6e']



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
        const urgency = daysLeft !== null && daysLeft <= 14 ? '#b83535' : daysLeft !== null && daysLeft <= 30 ? '#a88030' : '#4d7aa8'
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
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#2c5545', fontFamily: "'Geist Mono', monospace" }}>
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

// @ts-ignore — reserved for future use
function MudancasFeed({ deals, isDark, navigate, isAdmin }: { deals: any[]; isDark: boolean; navigate: (p: string) => void; isAdmin: boolean }) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const border = isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'

  const STAGE_COLORS_MAP: Record<string, { color: string; bg: string; label: string }> = {
    novo_lead:        { color: '#4d7aa8', bg: '#4d7aa818', label: 'Novo Lead' },
    qualificado:      { color: '#8878b8', bg: '#8878b818', label: 'Qualificado' },
    proposta_enviada: { color: '#a88030', bg: '#a8803018', label: 'Proposta' },
    em_negociacao:    { color: '#a88030', bg: '#a8803018', label: 'Negociação' },
    won:              { color: '#2c5545', bg: '#2c554518', label: 'Ganho ✓' },
    lost:             { color: '#b83535', bg: '#b8353518', label: 'Perdido' },
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
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#4d7aa8' }} />
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
                  <p style={{ fontSize: '12px', fontWeight: 600, color: stageKey === 'won' ? '#2c5545' : (isDark ? '#edeae4' : '#101828'), fontFamily: "'Geist Mono', monospace" }}>
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

function GruposPerformance({ groups, isDark }: { groups: GroupStat[]; isDark: boolean }) {
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#6b6760' : '#667085'
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'

  if (groups.length === 0) return (
    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: muted }}>
      Nenhum grupo criado ainda
    </div>
  )

  const maxTotal = Math.max(...groups.map((g) => g.revenue + g.pipeline), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {groups.map((group, i) => {
        const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
        const barPct    = ((group.revenue + group.pipeline) / maxTotal) * 100
        const wonPct    = (group.revenue / Math.max(group.revenue + group.pipeline, 1)) * 100

        return (
          <motion.div
            key={group.id}
            {...motionPresets.listItem(i)}
            style={{
              backgroundColor: isDark ? '#161614' : '#ffffff',
              border: `1px solid ${border}`,
              borderRadius: '14px',
              overflow: 'hidden',
            }}
          >
            {/* Group header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px 10px',
              borderBottom: `1px solid ${border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: rankEmoji ? '18px' : '11px', fontWeight: 700, color: muted, flexShrink: 0 }}>
                  {rankEmoji ?? `#${i + 1}`}
                </span>
                <p style={{ fontSize: '14px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>
                  {group.name}
                </p>
                <span style={{ fontSize: '11px', color: muted }}>· {group.members.length} membros</span>
              </div>
              {/* KPIs inline */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', color: muted }}>Receita</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#2c5545', fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(group.revenue)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', color: muted }}>Pipeline</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: text, fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(group.pipeline)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', color: muted }}>Win Rate</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>{group.winRate.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ padding: '8px 16px', borderBottom: `1px solid ${border}` }}>
              <div style={{ height: '6px', borderRadius: '99px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', overflow: 'hidden', position: 'relative' }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  style={{ position: 'absolute', height: '100%', borderRadius: '99px', backgroundColor: isDark ? 'rgba(107,18,18,0.3)' : 'rgba(107,18,18,0.15)' }}
                />
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${barPct * wonPct / 100}%` }}
                  transition={{ duration: 0.9, delay: i * 0.07 + 0.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ position: 'absolute', height: '100%', borderRadius: '99px', backgroundColor: '#6b1212' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: muted }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#6b1212' }} />Receita fechada
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: muted }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: isDark ? 'rgba(107,18,18,0.3)' : 'rgba(107,18,18,0.15)' }} />Pipeline total
                </span>
              </div>
            </div>

            {/* Members list */}
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {group.members.length === 0 ? (
                <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Sem membros neste grupo</p>
              ) : (
                group.members.map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '7px', flexShrink: 0,
                      backgroundColor: m.color, color: '#fff',
                      fontSize: '9px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {m.initials.slice(0, 2)}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: text }}>{m.name}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
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
            style={{ height: '100%', borderRadius: '9999px', backgroundColor: clamp >= 100 ? '#2c5545' : clamp >= 70 ? brand : '#a88030' }}
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

  if (deals.length === 0) return <EmptyState icon={<Zap size={16} />} title="Nenhum deal urgente" description="Sem fechamentos nos próximos 7 dias." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {deals.slice(0, 4).map((deal, i) => {
        const daysLeft = deal.expected_close
          ? Math.ceil((new Date(deal.expected_close).getTime() - Date.now()) / 86400000)
          : null
        const urgency = daysLeft !== null && daysLeft <= 0 ? 'danger' : daysLeft !== null && daysLeft <= 2 ? 'warning' : 'info'
        const urgencyColors = {
          danger:  { bg: isDark ? 'rgba(155,28,28,0.12)' : '#fff1f2', border: 'rgba(155,28,28,0.25)', badge: '#b83535', text: 'Vence hoje!' },
          warning: { bg: isDark ? 'rgba(146,64,14,0.12)' : '#fffbeb', border: 'rgba(146,64,14,0.25)', badge: '#a88030', text: `Vence em ${daysLeft}d` },
          info:    { bg: isDark ? 'rgba(30,64,175,0.08)' : '#eff6ff', border: 'rgba(30,64,175,0.20)', badge: '#4d7aa8', text: `${daysLeft}d restantes` },
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
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#2c5545', fontFamily: "'Geist Mono', monospace" }}>
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
    high: '#b83535', medium: '#a88030', low: '#2c5545', urgent: '#7c0000',
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
              {isOverdue && <AlertTriangle size={11} color="#b83535" />}
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
  { id: 'activity',     label: 'Atividade Recente' },
  { id: 'grupos',       label: 'Performance por Grupo' },
  { id: 'renovacao',    label: 'Alertas de Renovação' },
  { id: 'loss',         label: 'Por que perdemos? (Individual)' },
  { id: 'top_deals',    label: 'Top Oportunidades (Individual)' },
]

const PERSIST_KEY  = 'esq_dashboard_sections_v2'
const ORDER_KEY    = 'esq_dashboard_order_v1'

function loadSections(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(PERSIST_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return Object.fromEntries(SECTIONS_CONFIG.map((s) => [s.id, true]))
}

function loadOrder(): string[] {
  try {
    const stored = localStorage.getItem(ORDER_KEY)
    if (stored) {
      const arr = JSON.parse(stored) as string[]
      const all = SECTIONS_CONFIG.map((s) => s.id)
      return [...arr.filter((id) => all.includes(id)), ...all.filter((id) => !arr.includes(id))]
    }
  } catch {}
  return SECTIONS_CONFIG.map((s) => s.id)
}

// ─── Sortable Drawer Item ─────────────────────────────────────────────────────

function SortableDrawerItem({ section, active, onToggle, isDark }: {
  section: { id: string; label: string }
  active: boolean
  onToggle: (id: string) => void
  isDark: boolean
}) {
  const text  = isDark ? '#edeae4' : '#101828'
  const muted = isDark ? '#6b6760' : '#667085'
  const brand = isDark ? '#9b2020' : '#6b1212'

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '2px 12px 2px 8px',
        backgroundColor: isDragging ? (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6') : 'transparent',
      }}
    >
      {/* Grip handle — only this area is draggable */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          color: muted, padding: '8px 6px',
          display: 'flex', alignItems: 'center', flexShrink: 0,
          touchAction: 'none',
        }}
      >
        <GripVertical size={15} />
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => onToggle(section.id)}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 8px 9px 4px',
          backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
      >
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
    </div>
  )
}

// ─── Personalizar Drawer ──────────────────────────────────────────────────────

function PersonalizarDrawer({ visible, onClose, sections, onToggle, sectionOrder, onReorder, isDark }: {
  visible: boolean; onClose: () => void
  sections: Record<string, boolean>
  onToggle: (id: string) => void
  sectionOrder: string[]
  onReorder: (newOrder: string[]) => void
  isDark: boolean
}) {
  const bg    = isDark ? '#161614' : '#ffffff'
  const muted = isDark ? '#6b6760' : '#667085'
  const border= isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const text  = isDark ? '#edeae4' : '#101828'

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(String(active.id))
      const newIndex = sectionOrder.indexOf(String(over.id))
      onReorder(arrayMove(sectionOrder, oldIndex, newIndex))
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40 }}
          />
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
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: text, margin: 0 }}>Personalizar</p>
                <p style={{ fontSize: '12px', color: muted, marginTop: '2px' }}>Arraste para reordenar · clique para activar</p>
              </div>
              <button type="button" onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                  {sectionOrder.map((id) => {
                    const section = SECTIONS_CONFIG.find((s) => s.id === id)
                    if (!section) return null
                    return (
                      <SortableDrawerItem
                        key={id}
                        section={section}
                        active={sections[id] !== false}
                        onToggle={onToggle}
                        isDark={isDark}
                      />
                    )
                  })}
                </SortableContext>
              </DndContext>
            </div>

            <div style={{ padding: '14px 20px', borderTop: `1px solid ${border}` }}>
              <p style={{ fontSize: '11px', color: muted, textAlign: 'center' }}>Ordem e preferências guardadas automaticamente</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

// @ts-ignore — reserved for future use
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
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#2c5545', fontFamily: "'Geist Mono', monospace" }}>{fmtBRL(owner.won)}</p>
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
      {['empresa', 'individual'].map((tab) => (
        <button key={tab} type="button" onClick={() => onChange(tab)} style={{
          height: '40px', padding: '0 18px', fontSize: '13px',
          fontWeight: active === tab ? 600 : 400,
          color: active === tab ? text : muted,
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: `2px solid ${active === tab ? '#6b1212' : 'transparent'}`,
          marginBottom: '-1px', transition: 'all 0.15s ease', letterSpacing: '-0.01em',
        }}>
          {tab === 'empresa' ? 'Empresa' : 'Individual'}
        </button>
      ))}
    </div>
  )
}

const PERIOD_OPTIONS: { value: Period; label: string; sub: string }[] = [
  { value: '30d',  label: '30 dias',   sub: 'Último mês'      },
  { value: '90d',  label: '90 dias',   sub: 'Último trimestre' },
  { value: '12m',  label: '12 meses',  sub: 'Último ano'      },
]

function PeriodSelector({ value, onChange, isDark }: { value: Period; onChange: (p: Period) => void; isDark: boolean }) {
  const activeBg  = isDark ? '#2a2a28' : '#ffffff'
  const trackBg   = isDark ? '#161614' : '#f3f4f6'
  const trackBord = isDark ? 'rgba(255,255,255,0.08)' : '#e4e0da'
  const textActive = isDark ? '#edeae4' : '#101828'
  const textMuted  = isDark ? '#6b6760' : '#8a857d'

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      backgroundColor: trackBg,
      border: `1px solid ${trackBord}`,
      borderRadius: '9px', padding: '3px', gap: '2px',
    }}>
      {PERIOD_OPTIONS.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.sub}
            style={{
              height: '28px', padding: '0 12px',
              borderRadius: '7px', border: 'none', cursor: 'pointer',
              backgroundColor: isActive ? activeBg : 'transparent',
              color: isActive ? textActive : textMuted,
              fontSize: '12px', fontWeight: isActive ? 600 : 400,
              letterSpacing: '-0.01em',
              boxShadow: isActive ? (isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(16,24,40,0.10)') : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const profile  = useAuthStore((s) => s.profile)
  const deals    = useVisibleDeals()
  const allDeals = useDealStore((s) => s.deals)
  const allTasks    = useTaskStore((s) => s.tasks)
  const allMeetings = useMeetingStore((s) => s.meetings)
  const settings    = useSettingsStore()
  const impersonatedId = useImpersonationStore((s) => s.impersonatedId)

  const tasks = impersonatedId
    ? allTasks.filter((t) => t.assigned_to === impersonatedId || t.created_by === impersonatedId)
    : allTasks
  const meetings = impersonatedId
    ? allMeetings.filter((m) => allDeals.find((d) => d.id === m.deal_id)?.owner_id === impersonatedId)
    : allMeetings
  const teams  = useTeamStore((s) => s.teams)
  const owners = useOwnerStore((s) => s.owners)
  const navigate = useNavigate()

  const financialKPIs  = usePaymentStore((s) => s.kpis)
  const initPayments   = usePaymentStore((s) => s.initialize)
  React.useEffect(() => { initPayments() }, [initPayments])

  const [tab, setTab]           = useState<'empresa' | 'individual'>('empresa')
  const [period, setPeriod]     = useState<Period>('90d')
  const [showPersonalizar, setShowPersonalizar] = useState(false)
  const [sections, setSections] = useState<Record<string, boolean>>(loadSections)
  const [sectionOrder, setSectionOrder] = useState<string[]>(loadOrder)

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
    const active = filteredDeals.filter((d) => d.stage_id !== 'closed_won' && d.stage_id !== 'closed_lost')
    const won    = filteredDeals.filter((d) => d.stage_id === 'closed_won')
    const lost   = filteredDeals.filter((d) => d.stage_id === 'closed_lost')
    const closed = won.length + lost.length

    const pipeline = active.reduce((s, d) => s + (d.value ?? 0), 0)
    const revenue  = won.reduce((s, d) => s + (d.value ?? 0), 0)
    const winRate  = closed > 0 ? (won.length / closed) * 100 : 0
    const lossRate = closed > 0 ? (lost.length / closed) * 100 : 0
    const ticket   = won.length > 0 ? revenue / won.length : 0
    const today    = new Date().toISOString().slice(0, 10)
    const overdue  = tasks.filter((t) => !t.completed_at && !!t.due_date && t.due_date < today).length
    const pending  = tasks.filter((t) => !t.completed_at).length
    const meta     = settings?.quarterlyGoal ?? 0
    const goalPct  = meta > 0 ? Math.round((revenue / meta) * 100) : 0

    // Cycle time: avg days from created_at to updated_at for won deals
    const wonWithDates = won.filter((d) => d.created_at && d.updated_at)
    const avgCycleDays = wonWithDates.length > 0
      ? Math.round(wonWithDates.reduce((s, d) => {
          return s + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000
        }, 0) / wonWithDates.length)
      : 0

    // Pipeline velocity: (pipeline value × win rate) / cycle time
    // Represents expected revenue per day from current pipeline
    const velocity = avgCycleDays > 0 && winRate > 0
      ? Math.round((pipeline * (winRate / 100)) / avgCycleDays)
      : 0

    // Pipeline coverage: how many times pipeline covers the remaining meta
    const remainingMeta = Math.max(0, meta - revenue)
    const coverage = remainingMeta > 0 ? pipeline / remainingMeta : pipeline > 0 ? 99 : 0

    // Stagnated deals: active deals with no activity for 14+ days
    const stagnated = active.filter((d) => {
      const ref = d.last_activity_at ?? d.updated_at ?? d.created_at
      return (Date.now() - new Date(ref).getTime()) > 14 * 86400000
    })

    return {
      active: active.length, won: won.length, lost: lost.length, closed,
      pipeline, revenue, winRate, lossRate, ticket,
      overdue, pending, goalPct, total: filteredDeals.length,
      avgCycleDays, velocity, coverage,
      stagnated: stagnated.length,
      thisMonthRevenue: revenue,
      monthMeetings: meetings.filter((m) => m.scheduled_at && m.scheduled_at >= cutoff).length,
      expectedMeetings: Math.max(1, Math.ceil(active.length * 0.3)),
    }
  }, [filteredDeals, tasks, settings, meetings, cutoff])

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
      if (deal.stage_id === 'closed_won') {
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
      months[key] = { label } as Record<string, number> & { label: string }
    }
    for (const deal of deals) {
      const key = deal.created_at?.slice(0, 7)
      const stageKey = deal.stage_id ?? 'outros'
      if (key && months[key]) months[key][stageKey] = (months[key][stageKey] ?? 0) + (deal.value ?? 0)
    }
    return Object.values(months)
  }, [deals])

  const stageIds = useMemo(() => [...new Set(deals.map((d) => d.stage_id).filter(Boolean))].slice(0, 5), [deals])

  // ── Stage funnel ──
  const stageData = useMemo(() => STAGES.map((stage) => {
    const sd = deals.filter((d) => d.stage_id === stage.id)
    return { label: stage.label, color: stage.color, count: sd.length, value: sd.reduce((s, d) => s + (d.value ?? 0), 0) }
  }).filter((s) => s.count > 0), [deals])

  // ── Atenção Imediata ──
  const urgentDeals = useMemo(() => {
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString()
    return deals
      .filter((d) => d.expected_close && d.expected_close <= in7 && d.stage_id !== 'closed_won')
      .sort((a, b) => (a.expected_close ?? '').localeCompare(b.expected_close ?? ''))
  }, [deals])

  // ── Renovation alerts (expected_close in next 30-60 days for won deals or near-closing) ──
  const renewalDeals = useMemo(() => {
    const in60 = new Date(Date.now() + 60 * 86400000).toISOString()
    const in7  = new Date(Date.now() + 7  * 86400000).toISOString()
    return deals
      .filter((d) => d.expected_close && d.expected_close > in7 && d.expected_close <= in60 && d.stage_id !== 'closed_lost')
      .sort((a, b) => (a.expected_close ?? '').localeCompare(b.expected_close ?? ''))
  }, [deals])

  // ── Group stats ──
  const groupStats = useMemo((): GroupStat[] => {
    return [...teams].map((team) => {
      const teamDeals = allDeals.filter((d) => d.team_id === team.id)
      const won = teamDeals.filter((d) => d.stage_id === 'closed_won')
      const active = teamDeals.filter((d) => d.stage_id !== 'closed_won' && d.stage_id !== 'closed_lost')
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
    if (kpis.overdue > 0) items.push({ text: `${kpis.overdue} tarefa${kpis.overdue > 1 ? 's' : ''} em atraso`, sub: 'Requer atenção imediata', href: '/tarefas', color: '#b83535' })
    if (urgentDeals.length > 0) items.push({ text: `${urgentDeals.length} deal${urgentDeals.length > 1 ? 's' : ''} vence em 7 dias`, sub: fmtBRL(urgentDeals.reduce((s, d) => s + (d.value ?? 0), 0)) + ' em risco', href: '/pipeline', color: '#a88030' })
    if (todayMeetings.length > 0) items.push({ text: `${todayMeetings.length} reunião${todayMeetings.length > 1 ? 'ões' : ''} hoje`, sub: `Primeira às ${new Date(todayMeetings[0].scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, href: '/calendar', color: '#4d7aa8' })
    const stale = deals.filter((d) => {
      if (d.stage_id === 'closed_won' || d.stage_id === 'closed_lost') return false
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
      <PersonalizarDrawer
        visible={showPersonalizar}
        onClose={() => setShowPersonalizar(false)}
        sections={sections}
        onToggle={toggleSection}
        sectionOrder={sectionOrder}
        onReorder={(newOrder) => {
          setSectionOrder(newOrder)
          try { localStorage.setItem(ORDER_KEY, JSON.stringify(newOrder)) } catch {}
        }}
        isDark={isDark}
      />

      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        icon={<LayoutDashboard size={18} />}
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

          {/* Welcome hero — always first, outside ordering */}
          {show('hero') && (
            <WelcomeHero name={profile?.full_name ?? 'Utilizador'} goalPct={kpis.goalPct} isDark={isDark} />
          )}

          {/* Tab bar */}
          <TabBar active={tab} onChange={(t) => setTab(t as 'empresa' | 'individual')} isDark={isDark} />

          <AnimatePresence mode="wait">

            {/* ── TAB EMPRESA — order-driven rendering ── */}
            {tab === 'empresa' && (() => {
              // Sections that belong to the operacao tab (hero excluded — rendered above)
              const OP_IDS = ['kpis', 'pipeline_area', 'atencao', 'oq_fazer', 'tarefas', 'agenda', 'activity', 'heatmap', 'grupos', 'renovacao']
              const PAIR_COLS: Record<string, string> = {
                'atencao,oq_fazer':  '1fr 1fr',
                'oq_fazer,atencao':  '1fr 1fr',
                'tarefas,agenda':    '1fr 1fr',
                'agenda,tarefas':    '1fr 1fr',
                'grupos,renovacao':  '1.4fr 1fr',
                'renovacao,grupos':  '1fr 1.4fr',
              }

              function renderOpSection(id: string): React.ReactNode {
                if (!show(id)) return null
                switch (id) {
                  case 'kpis': return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {/* Receita fechada no período */}
                      <StatCard icon={<DollarSign size={15} />} color="success"
                        label={`Receita · ${PERIOD_OPTIONS.find((p) => p.value === period)?.label}`}
                        value={fmtBRL(kpis.thisMonthRevenue)}
                        delta={`Meta: ${kpis.goalPct}%`}
                        deltaType={kpis.goalPct >= 100 ? 'positive' : kpis.goalPct >= 70 ? 'neutral' : 'negative'}
                        index={0} sparklineData={spkWon} />
                      {/* Ticket médio por deal ganho */}
                      <StatCard icon={<TrendingUp size={15} />} color="accent"
                        label="Ticket Médio"
                        value={kpis.ticket > 0 ? fmtBRL(kpis.ticket) : '—'}
                        delta={`${kpis.won} deal${kpis.won !== 1 ? 's' : ''} ganho${kpis.won !== 1 ? 's' : ''}`}
                        deltaType="neutral"
                        index={1} sparklineData={spkPipeline} />
                      {/* Win rate sobre deals fechados (excluindo abertos) */}
                      <StatCard icon={<Award size={15} />} color={kpis.winRate >= 40 ? 'success' : kpis.winRate >= 25 ? 'info' : 'danger'}
                        label="Win Rate"
                        value={kpis.closed > 0 ? fmtPct(kpis.winRate) : '—'}
                        delta={kpis.closed > 0 ? `${kpis.won}W · ${kpis.lost}L de ${kpis.closed}` : 'Sem fechamentos'}
                        deltaType={kpis.winRate >= 40 ? 'positive' : kpis.winRate >= 25 ? 'neutral' : 'negative'}
                        index={2} />
                      {/* Velocidade do pipeline: receita esperada por dia */}
                      <StatCard icon={<Zap size={15} />} color={kpis.velocity > 0 ? 'info' : 'neutral'}
                        label="Velocidade"
                        value={kpis.velocity > 0 ? `${fmtBRL(kpis.velocity)}/d` : '—'}
                        delta="receita esperada por dia"
                        deltaType="neutral"
                        index={3} />
                      {/* Cobertura: pipeline ÷ meta restante */}
                      <StatCard icon={<Target size={15} />} color={kpis.coverage >= 3 ? 'success' : kpis.coverage >= 1.5 ? 'warning' : 'danger'}
                        label="Cobertura da Meta"
                        value={kpis.coverage > 0 ? `${kpis.coverage.toFixed(1)}×` : '—'}
                        delta={kpis.goalPct < 100 ? `faltam ${fmtBRL(Math.max(0, (settings?.quarterlyGoal ?? 0) - kpis.revenue))}` : 'Meta atingida!'}
                        deltaType={kpis.coverage >= 3 ? 'positive' : kpis.coverage >= 1.5 ? 'neutral' : 'negative'}
                        index={4} />
                      {/* Deals estagnados: sem actividade há 14+ dias */}
                      <StatCard icon={<AlertTriangle size={15} />} color={kpis.stagnated === 0 ? 'success' : kpis.stagnated <= 3 ? 'warning' : 'danger'}
                        label="Estagnados"
                        value={String(kpis.stagnated)}
                        delta={`deals sem actividade 14+ dias`}
                        deltaType={kpis.stagnated === 0 ? 'positive' : kpis.stagnated <= 3 ? 'neutral' : 'negative'}
                        index={5} onClick={() => navigate('/pipeline')} />

                      {/* ── Linha 3: KPIs financeiros reais (contratos + pagamentos) ── */}
                      {(financialKPIs.mrr > 0 || financialKPIs.due30dAmount > 0 || financialKPIs.overdueAmount > 0) && (<>
                        <StatCard icon={<Activity size={15} />} color="info"
                          label="MRR"
                          value={fmtBRL(financialKPIs.mrr)}
                          delta={`ARR ${fmtBRL(financialKPIs.arr)}`}
                          deltaType="neutral"
                          index={6} onClick={() => navigate('/admin/cobranca')} />
                        <StatCard icon={<DollarSign size={15} />} color={financialKPIs.due30dCount > 0 ? 'warning' : 'neutral'}
                          label="A Receber (30d)"
                          value={fmtBRL(financialKPIs.due30dAmount)}
                          delta={`${financialKPIs.due30dCount} parcela${financialKPIs.due30dCount !== 1 ? 's' : ''}`}
                          deltaType={financialKPIs.due30dCount > 0 ? 'neutral' : 'positive'}
                          index={7} onClick={() => navigate('/admin/cobranca')} />
                        <StatCard icon={<AlertTriangle size={15} />} color={financialKPIs.overdueCount === 0 ? 'success' : 'danger'}
                          label="Em Atraso"
                          value={financialKPIs.overdueAmount > 0 ? fmtBRL(financialKPIs.overdueAmount) : '0'}
                          delta={financialKPIs.overdueCount > 0 ? `${financialKPIs.overdueCount} parcela${financialKPIs.overdueCount !== 1 ? 's' : ''} vencida${financialKPIs.overdueCount !== 1 ? 's' : ''}` : 'Tudo em dia'}
                          deltaType={financialKPIs.overdueCount === 0 ? 'positive' : 'negative'}
                          index={8} onClick={() => navigate('/admin/cobranca')} />
                      </>)}
                    </div>
                  )
                  case 'pipeline_area': return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                      <Card title="Evolução do Pipeline" subtitle="6 meses · por fase" isDark={isDark}>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={stackedData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
                            <CartesianGrid stroke={gridColor} strokeDasharray="0" vertical={false} />
                            <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtBRL} width={56} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtFull(Number(v))} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }} />
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
                                {convPct !== null && <div style={{ textAlign: 'center', fontSize: '10px', color: isDark ? '#6b6760' : '#98a2b3', marginBottom: '3px' }}>↓ {convPct}%</div>}
                                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: isDark ? '#6b6760' : '#667085', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage.label}</span>
                                  <div style={{ height: '8px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }} style={{ height: '100%', borderRadius: '9999px', backgroundColor: stage.color }} />
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
                  )
                  case 'atencao': return (
                    <Card title="⚡ Atenção Imediata" subtitle={`${urgentDeals.length} deals vencendo`} isDark={isDark}
                      action={urgentDeals.length > 0 ? <button type="button" onClick={() => navigate('/pipeline')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver pipeline <ArrowRight size={12} /></button> : undefined}
                      noPadding>
                      <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '12px 18px' }}>
                        <AtencaoImediata deals={urgentDeals} isDark={isDark} navigate={navigate} />
                      </div>
                    </Card>
                  )
                  case 'oq_fazer': return (
                    <Card title="💡 O que fazer hoje" subtitle={`${actionItems.length} ação${actionItems.length !== 1 ? 'ões' : ''} prioritária${actionItems.length !== 1 ? 's' : ''}`} isDark={isDark}>
                      <OQueFazerHoje actions={actionItems} isDark={isDark} navigate={navigate} />
                    </Card>
                  )
                  case 'tarefas': return (
                    <Card title="📋 Tarefas de Hoje" subtitle={`${todayTasks.length} pendente${todayTasks.length !== 1 ? 's' : ''}`} isDark={isDark}
                      action={<button type="button" onClick={() => navigate('/tarefas')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver todas <ArrowRight size={12} /></button>}>
                      <TarefasHoje tasks={todayTasks} isDark={isDark} navigate={navigate} />
                    </Card>
                  )
                  case 'agenda': return (
                    <Card title="📅 Agenda de Hoje" subtitle={`${todayMeetings.length} reunião${todayMeetings.length !== 1 ? 'ões' : ''}`} isDark={isDark}
                      action={<button type="button" onClick={() => navigate('/calendar')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Calendário <ArrowRight size={12} /></button>}>
                      <AgendaHoje meetings={todayMeetings} isDark={isDark} navigate={navigate} />
                    </Card>
                  )
                  case 'activity': return (
                    <Card title="Atividade Recente" subtitle="Últimas oportunidades" isDark={isDark}
                      action={<button type="button" onClick={() => navigate('/atividades')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver tudo <ArrowRight size={12} /></button>}
                      noPadding>
                      <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {[...deals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10).map((deal, i) => {
                          const stage = STAGES.find((s) => s.id === deal.stage_id)
                          return (
                            <motion.button key={deal.id} {...motionPresets.listItem(i)} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background-color 0.1s ease' }}
                              whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: stage?.color ?? '#98a2b3', flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: isDark ? '#edeae4' : '#101828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.title}</span>
                              <span style={{ fontSize: '11px', color: isDark ? '#6b6760' : '#98a2b3', flexShrink: 0 }}>{timeAgo(deal.created_at)}</span>
                            </motion.button>
                          )
                        })}
                        {deals.length === 0 && <EmptyState icon={<Activity size={16} />} title="Sem atividade" />}
                      </div>
                    </Card>
                  )
                  case 'grupos': return (
                    <Card title="🏆 Performance por Grupo" subtitle={`${groupStats.length} grupo${groupStats.length !== 1 ? 's' : ''} · ranking por receita`} isDark={isDark} noPadding>
                      <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '12px 18px' }}>
                        <GruposPerformance groups={groupStats} isDark={isDark} />
                      </div>
                    </Card>
                  )
                  case 'renovacao': return (
                    <Card title="🔔 Alertas de Renovação" subtitle={`${renewalDeals.length} vencendo em 60 dias`} isDark={isDark}
                      action={renewalDeals.length > 0 ? <button type="button" onClick={() => navigate('/pipeline')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Pipeline <ArrowRight size={12} /></button> : undefined}
                      noPadding>
                      <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '12px 18px' }}>
                        <RenovacaoAlert deals={renewalDeals} isDark={isDark} navigate={navigate} />
                      </div>
                    </Card>
                  )
                  case 'heatmap': return (
                    <Card title="Atividade do Time" subtitle="Oportunidades criadas · 12 semanas" isDark={isDark}>
                      <ActivityHeatmap deals={deals} isDark={isDark} />
                    </Card>
                  )
                  default: return null
                }
              }

              // Build render list with smart pairing: adjacent natural pairs → 2-col grid
              const visible = sectionOrder.filter((id) => OP_IDS.includes(id) && show(id))
              const blocks: React.ReactNode[] = []
              let idx = 0
              while (idx < visible.length) {
                const id   = visible[idx]
                const next = visible[idx + 1]
                const pairKey = next ? `${id},${next}` : ''
                const cols = PAIR_COLS[pairKey]
                if (cols) {
                  blocks.push(
                    <div key={`${id}-${next}`} style={{ display: 'grid', gridTemplateColumns: cols, gap: '12px' }}>
                      {renderOpSection(id)}
                      {renderOpSection(next)}
                    </div>
                  )
                  idx += 2
                } else {
                  blocks.push(<React.Fragment key={id}>{renderOpSection(id)}</React.Fragment>)
                  idx++
                }
              }

              return (
                <motion.div key="op" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {blocks}
                </motion.div>
              )
            })()}

            {/* ── TAB INDIVIDUAL ── */}
            {tab === 'individual' && (
              <motion.div key="res" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Analytics por período — ranking, gráficos, funil */}
                <AnalyticsSection />

                {/* 4 KPIs resultado */}
                {show('kpis') && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <StatCard icon={<DollarSign size={15} />} color="success" label="Receita Fechada" value={fmtBRL(kpis.revenue)} delta={`${kpis.won} oportunidades`} deltaType="positive" index={0} sparklineData={spkWon} />
                    <StatCard icon={<Target size={15} />} color={kpis.goalPct >= 100 ? 'success' : kpis.goalPct >= 70 ? 'warning' : 'danger'} label="Meta Atingida" value={`${kpis.goalPct}%`} delta={kpis.goalPct >= 100 ? 'Superada!' : `Faltam ${fmtBRL(Math.max(0, (settings?.quarterlyGoal ?? 0) - kpis.revenue))}`} deltaType={kpis.goalPct >= 100 ? 'positive' : kpis.goalPct >= 70 ? 'neutral' : 'negative'} index={1} />
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
                            <stop offset="5%" stopColor="#2c5545" stopOpacity={isDark ? 0.25 : 0.15} />
                            <stop offset="95%" stopColor="#2c5545" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={gridColor} strokeDasharray="0" vertical={false} />
                        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtBRL} width={56} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtFull(Number(v))} />
                        <Area type="monotone" dataKey="pipeline" stroke={brand} strokeWidth={2} fill="url(#ga1)" dot={false} activeDot={{ r: 4, fill: brand }} isAnimationActive animationDuration={1000} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="won" stroke="#2c5545" strokeWidth={2} fill="url(#ga2)" dot={false} activeDot={{ r: 4, fill: '#2c5545' }} strokeDasharray="5 3" isAnimationActive animationDuration={1200} animationEasing="ease-out" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isDark ? '#6b6760' : '#667085' }}>
                        <div style={{ width: '20px', height: '2px', backgroundColor: brand }} />Pipeline
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isDark ? '#6b6760' : '#667085' }}>
                        <div style={{ width: '20px', height: '2px', backgroundColor: '#2c5545', borderTop: '2px dashed #2c5545' }} />Receita
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
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtFull(Number(v))} />
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

                {/* Por que perdemos */}
                {show('loss') && (
                  <Card title="Por que perdemos?" subtitle="Motivos de perda" isDark={isDark}>
                    <LossReasons deals={deals} isDark={isDark} />
                  </Card>
                )}


                {/* Top deals */}
                {show('top_deals') && (
                  <Card title="Top Oportunidades" subtitle="Por valor" isDark={isDark}
                    action={<button type="button" onClick={() => navigate('/pipeline')} style={{ fontSize: '12px', color: brand, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Pipeline <ArrowRight size={12} /></button>}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {[...filteredDeals].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 5).map((deal, i) => {
                        const stage = STAGES.find((s) => s.id === deal.stage_id)
                        return (
                          <motion.button key={deal.id} {...motionPresets.listItem(i)} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                            style={{ display: 'grid', gridTemplateColumns: '24px 1fr 100px 90px', alignItems: 'center', gap: '12px', padding: '10px 10px', borderRadius: '7px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.1s ease' }}
                            whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }}>
                            <span style={{ fontSize: '12px', color: isDark ? '#6b6760' : '#98a2b3', fontWeight: 500 }}>#{i + 1}</span>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#edeae4' : '#101828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.title}</p>
                              {deal.company_name && <p style={{ fontSize: '11px', color: isDark ? '#6b6760' : '#98a2b3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.company_name}</p>}
                            </div>
                            {stage && <span style={{ fontSize: '10px', fontWeight: 600, color: stage.color, backgroundColor: `${stage.color}14`, borderRadius: '5px', padding: '3px 8px', textAlign: 'center' }}>{stage.label}</span>}
                            <span style={{ fontSize: '13px', fontWeight: 600, color: deal.stage_id === 'closed_won' ? '#2c5545' : (isDark ? '#edeae4' : '#101828'), fontFamily: "'Geist Mono', monospace", textAlign: 'right' }}>
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
