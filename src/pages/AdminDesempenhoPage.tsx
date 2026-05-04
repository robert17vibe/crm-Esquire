import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { RefreshCw, Target, Settings, X, Check, Zap } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, Tooltip as RTooltip,
  LineChart, Line, RadialBarChart, RadialBar,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/store/useThemeStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OwnerMetrics {
  id: string
  name: string
  initials: string
  color: string
  vendas: number
  faturamento: number
  reunioes: number
  ligacoes: number
  conversion: number   // win rate %
  vendas_hoje: number
}

interface DailyPoint { day: string; valor: number; qtd: number }

interface Metas {
  faturamento: number
  vendas: number
  ligacoes: number
  reunioes: number
  conversion: number
}

interface RecentWin {
  id: string
  company: string
  owner: string
  valor: number
  at: string
}

const LS_METAS = 'esq_desempenho_metas_v1'
const DEFAULT_METAS: Metas = { faturamento: 100000, vendas: 10, ligacoes: 50, reunioes: 20, conversion: 30 }

type Period = '7d' | '30d' | '90d'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(0)}k`
  return `R$${n.toFixed(0)}`
}

function hashColor(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return `hsl(${Math.abs(h) % 360},38%,44%)`
}

function cutoff(p: Period) {
  const d = new Date()
  d.setDate(d.getDate() - (p === '7d' ? 7 : p === '30d' ? 30 : 90))
  return d.toISOString()
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return dayLabel(iso)
}

function pct(val: number, meta: number) {
  if (!meta) return 0
  return Math.min(100, Math.round((val / meta) * 100))
}

// ─── Mini Sparkline (bar) ─────────────────────────────────────────────────────

function Spark({ data, color, field = 'valor' }: { data: DailyPoint[]; color: string; field?: 'valor' | 'qtd' }) {
  const pts = data.map((d) => ({ v: d[field] }))
  return (
    <ResponsiveContainer width="100%" height={40}>
      <BarChart data={pts} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barSize={4}>
        <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Mini Donut (radial) ──────────────────────────────────────────────────────

function MiniDonut({ value, color, size = 56 }: { value: number; color: string; size?: number }) {
  const data = [{ v: value, fill: color }, { v: 100 - value, fill: 'transparent' }]
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="100%"
          startAngle={90} endAngle={-270} data={data} barSize={6}>
          <RadialBar dataKey="v" cornerRadius={4} background={false} />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct: p, color, height = 4 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: 99, backgroundColor: `${color}22`, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${p}%`, backgroundColor: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ─── Meta Editor Modal ────────────────────────────────────────────────────────

function MetasModal({ metas, isDark, border, text, muted, onSave, onClose }: {
  metas: Metas; isDark: boolean; border: string; text: string; muted: string;
  onSave: (m: Metas) => void; onClose: () => void
}) {
  const [draft, setDraft] = useState<Metas>({ ...metas })
  const bg = isDark ? '#161614' : '#ffffff'
  const inputBg = isDark ? '#111110' : '#f8f7f4'

  const fields: { key: keyof Metas; label: string; prefix?: string; suffix?: string }[] = [
    { key: 'faturamento', label: 'Meta de Faturamento', prefix: 'R$' },
    { key: 'vendas',      label: 'Meta de Vendas (nº deals ganhos)' },
    { key: 'ligacoes',    label: 'Meta de Ligações' },
    { key: 'reunioes',    label: 'Meta de Reuniões' },
    { key: 'conversion',  label: 'Meta de Taxa de Conversão', suffix: '%' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '16px', width: '420px', padding: '24px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: text }}>Definir Metas</p>
            <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Valores mensais de referência</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {fields.map(({ key, label, prefix, suffix }) => (
            <div key={key}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                {label}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {prefix && <span style={{ fontSize: '12px', color: muted, flexShrink: 0 }}>{prefix}</span>}
                <input
                  type="number" min={0}
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
                  style={{ flex: 1, height: '36px', padding: '0 10px', fontSize: '13px', fontWeight: 600, color: text, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}
                />
                {suffix && <span style={{ fontSize: '12px', color: muted, flexShrink: 0 }}>{suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, height: '38px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={() => { onSave(draft); onClose() }}
            style={{ flex: 2, height: '38px', borderRadius: '8px', border: 'none', backgroundColor: '#2c5545', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            Guardar Metas
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminDesempenhoPage() {
  const isDark = useThemeStore((s) => s.isDark)

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'
  const faint   = isDark ? '#1a1a18' : '#f5f4f0'

  const [period,      setPeriod]      = useState<Period>('30d')
  const [loading,     setLoading]     = useState(true)
  const [showMetas,   setShowMetas]   = useState(false)
  const [metas,       setMetas]       = useState<Metas>(() => {
    try { return { ...DEFAULT_METAS, ...JSON.parse(localStorage.getItem(LS_METAS) ?? '{}') } }
    catch { return DEFAULT_METAS }
  })
  const [recentWins,  setRecentWins]  = useState<RecentWin[]>([])
  const [newWinId,    setNewWinId]    = useState<string | null>(null)
  const [daily,       setDaily]       = useState<DailyPoint[]>([])
  const [owners,      setOwners]      = useState<OwnerMetrics[]>([])

  // Totals
  const totals = useMemo(() => ({
    faturamento: owners.reduce((s, o) => s + o.faturamento, 0),
    vendas:      owners.reduce((s, o) => s + o.vendas, 0),
    ligacoes:    owners.reduce((s, o) => s + o.ligacoes, 0),
    reunioes:    owners.reduce((s, o) => s + o.reunioes, 0),
    vendas_hoje: owners.reduce((s, o) => s + o.vendas_hoje, 0),
    conversion:  (() => {
      const totalDeals = owners.reduce((s, o) => s + o.vendas + Math.round(o.vendas / (o.conversion / 100 || 0.01)), 0)
      const totalWon   = owners.reduce((s, o) => s + o.vendas, 0)
      return totalDeals > 0 ? Math.round((totalWon / totalDeals) * 100) : 0
    })(),
  }), [owners])

  function saveMetas(m: Metas) {
    localStorage.setItem(LS_METAS, JSON.stringify(m))
    setMetas(m)
  }

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadRef = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    const since = cutoff(period)
    const today = new Date().toISOString().slice(0, 10)

    const [{ data: deals }, { data: activities }, { data: meetings }] = await Promise.all([
      supabase.from('deals').select('id,owner,owner_id,stage_id,value,updated_at,created_at').is('deleted_at', null),
      supabase.from('deal_activities').select('type,owner,created_at').gte('created_at', since),
      supabase.from('deal_meetings').select('owner,scheduled_at,status').gte('scheduled_at', since),
    ])

    const periodDeals = (deals ?? []).filter((d) => d.updated_at >= since || d.created_at >= since)

    // Daily series (won deals in period)
    const wonPeriod = (deals ?? []).filter((d) => d.stage_id === 'closed_won' && d.updated_at >= since)
    const dayMap: Record<string, DailyPoint> = {}
    const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dayMap[key] = { day: dayLabel(key), valor: 0, qtd: 0 }
    }
    wonPeriod.forEach((d) => {
      const key = d.updated_at.slice(0, 10)
      if (dayMap[key]) { dayMap[key].valor += Number(d.value) || 0; dayMap[key].qtd++ }
    })
    setDaily(Object.values(dayMap))

    // Recent wins (last 5)
    const sorted = wonPeriod.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5)
    setRecentWins(sorted.map((d) => ({
      id: d.id,
      company: (d.owner as { company_name?: string } | null)?.company_name ?? '—',
      owner: (d.owner as { name?: string } | null)?.name ?? '?',
      valor: Number(d.value) || 0,
      at: d.updated_at,
    })))

    // Per-owner metrics
    const ownerMap: Record<string, OwnerMetrics> = {}

    const ensure = (o: { id?: string; name?: string; avatar_color?: string } | null, fallbackId: string) => {
      const id   = o?.id ?? fallbackId
      const name = o?.name ?? 'Desconhecido'
      if (!ownerMap[id]) {
        ownerMap[id] = {
          id, name,
          initials: name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
          color: o?.avatar_color ?? hashColor(name),
          vendas: 0, faturamento: 0, reunioes: 0, ligacoes: 0, conversion: 0, vendas_hoje: 0,
        }
      }
      return ownerMap[id]
    }

    // Closed won
    const allWon  = (deals ?? []).filter((d) => d.stage_id === 'closed_won')
    const allLost = (deals ?? []).filter((d) => d.stage_id === 'closed_lost')

    periodDeals.forEach((d) => {
      const owner = d.owner as { id?: string; name?: string; avatar_color?: string } | null
      const m = ensure(owner, d.owner_id)
      if (d.stage_id === 'closed_won') {
        m.vendas++
        m.faturamento += Number(d.value) || 0
        if (d.updated_at.slice(0, 10) === today) m.vendas_hoje++
      }
    })

    // Win rate per owner (all time for relevance)
    allWon.forEach((d) => {
      const owner = d.owner as { id?: string; name?: string; avatar_color?: string } | null
      ensure(owner, d.owner_id)
    })
    Object.keys(ownerMap).forEach((oid) => {
      const won  = allWon.filter((d)  => (d.owner as { id?: string } | null)?.id === oid || d.owner_id === oid).length
      const lost = allLost.filter((d) => (d.owner as { id?: string } | null)?.id === oid || d.owner_id === oid).length
      ownerMap[oid].conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0
    })

    // Activities
    ;(activities ?? []).forEach((a) => {
      const owner = a.owner as { id?: string; name?: string; avatar_color?: string } | null
      if (!owner?.id) return
      const m = ownerMap[owner.id]
      if (!m) return
      if (a.type === 'call') m.ligacoes++
    })

    // Meetings
    ;(meetings ?? []).forEach((mt) => {
      const owner = mt.owner as { id?: string } | null
      if (!owner?.id) return
      const m = ownerMap[owner.id]
      if (!m) return
      if (['realizada', 'confirmada'].includes(mt.status)) m.reunioes++
    })

    setOwners(Object.values(ownerMap).sort((a, b) => b.faturamento - a.faturamento))
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  // ── Realtime subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('desempenho-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, (payload) => {
        const d = payload.new as { stage_id: string; id: string; company_name: string; owner: { name?: string } | null; value: number; updated_at: string }
        if (d.stage_id === 'closed_won') {
          const win: RecentWin = {
            id: d.id,
            company: d.company_name ?? '—',
            owner: d.owner?.name ?? '?',
            valor: Number(d.value) || 0,
            at: d.updated_at,
          }
          setNewWinId(d.id)
          setTimeout(() => setNewWinId(null), 4000)
          setRecentWins((prev) => [win, ...prev].slice(0, 5))
          // Reload stats
          if (!loadRef.current) { loadRef.current = true; load().finally(() => { loadRef.current = false }) }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── KPI Cards config ──────────────────────────────────────────────────────────

  const kpis = [
    {
      label: 'Faturamento',
      value: fmtBRL(totals.faturamento),
      meta: metas.faturamento,
      atual: totals.faturamento,
      color: '#2a9a5a',
      spark: <Spark data={daily} color="#2a9a5a" field="valor" />,
    },
    {
      label: 'Vendas no período',
      value: String(totals.vendas),
      meta: metas.vendas,
      atual: totals.vendas,
      color: '#4d7aa8',
      spark: <Spark data={daily} color="#4d7aa8" field="qtd" />,
    },
    {
      label: 'Vendas hoje',
      value: String(totals.vendas_hoje),
      meta: null,
      atual: 0,
      color: '#a88030',
      spark: null,
    },
    {
      label: 'Taxa de Conversão',
      value: `${totals.conversion}%`,
      meta: metas.conversion,
      atual: totals.conversion,
      color: totals.conversion >= metas.conversion ? '#2a9a5a' : totals.conversion >= metas.conversion * 0.6 ? '#a88030' : '#b83535',
      spark: null,
      donut: true,
    },
    {
      label: 'Reuniões',
      value: String(totals.reunioes),
      meta: metas.reunioes,
      atual: totals.reunioes,
      color: '#7c5cbf',
      spark: null,
    },
    {
      label: 'Ligações',
      value: String(totals.ligacoes),
      meta: metas.ligacoes,
      atual: totals.ligacoes,
      color: '#0e7490',
      spark: null,
    },
  ]

  const PERIOD_OPTS: { v: Period; l: string }[] = [
    { v: '7d', l: '7 dias' }, { v: '30d', l: '30 dias' }, { v: '90d', l: '90 dias' },
  ]

  return (
    <div style={{ minHeight: '100%', backgroundColor: pageBg, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ backgroundColor: cardBg, borderBottom: `1px solid ${border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>Desempenho</p>
          <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>Atualização em tempo real</p>
        </div>

        {/* Period */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: faint, padding: '3px', borderRadius: '10px', border: `1px solid ${border}` }}>
          {PERIOD_OPTS.map(({ v, l }) => (
            <button key={v} type="button" onClick={() => setPeriod(v)}
              style={{ height: '26px', padding: '0 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.12s', backgroundColor: period === v ? cardBg : 'transparent', color: period === v ? text : muted, boxShadow: period === v ? '0 1px 3px rgba(0,0,0,0.10)' : 'none' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Metas */}
        <button type="button" onClick={() => setShowMetas(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 14px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          <Target style={{ width: '13px', height: '13px' }} />
          Metas
        </button>

        <button type="button" onClick={load}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', color: muted }}>
          <RefreshCw style={{ width: '13px', height: '13px' }} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
          {kpis.map((k) => {
            const p = k.meta ? pct(k.atual, k.meta) : 0
            return (
              <div key={k.label} style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.label}</p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <p style={{ fontSize: '22px', fontWeight: 800, color: k.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</p>
                  {k.donut && <MiniDonut value={p} color={k.color} size={44} />}
                </div>

                {k.spark && <div style={{ marginTop: '4px' }}>{k.spark}</div>}

                {k.meta && !k.donut && (
                  <div style={{ marginTop: '2px' }}>
                    <ProgressBar pct={p} color={k.color} />
                    <p style={{ fontSize: '10px', color: muted, marginTop: '4px' }}>{p}% da meta ({k.meta >= 1000 ? fmtBRL(k.meta) : k.meta})</p>
                  </div>
                )}
                {k.donut && k.meta && (
                  <p style={{ fontSize: '10px', color: muted }}>Meta: {k.meta}%</p>
                )}
                {!k.meta && (
                  <p style={{ fontSize: '10px', color: muted }}>Hoje</p>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Body: gráfico + feed + ranking ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>

          {/* Esquerda: gráfico de faturamento + cards de pessoas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Gráfico faturamento diário */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Faturamento Diário</p>
                  <p style={{ fontSize: '11px', color: muted }}>Deals fechados por dia</p>
                </div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#2a9a5a' }}>{fmtBRL(totals.faturamento)}</p>
              </div>
              {loading ? (
                <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: '12px', color: muted }}>Carregando...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <RTooltip
                      contentStyle={{ backgroundColor: isDark ? '#161614' : '#fff', border: `1px solid ${border}`, borderRadius: '8px', fontSize: '12px', color: text }}
                      formatter={(v: unknown) => [fmtBRL(Number(v)), 'Faturamento']}
                      labelFormatter={(l) => l}
                    />
                    <Line type="monotone" dataKey="valor" stroke="#2a9a5a" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Cards por responsável */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '14px' }}>Por Responsável</p>

              {loading ? (
                <p style={{ fontSize: '12px', color: muted }}>Carregando...</p>
              ) : owners.length === 0 ? (
                <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Sem dados no período</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {owners.map((o, i) => {
                    const fatPct = pct(o.faturamento, metas.faturamento / owners.length || metas.faturamento)
                    const rank1  = i === 0
                    return (
                      <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 60px 60px 70px', alignItems: 'center', gap: '12px', padding: '10px 8px', borderRadius: '8px', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#161614' : '#faf9f7')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>

                        {/* Avatar */}
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                            {o.initials}
                          </div>
                          {rank1 && (
                            <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '13px', height: '13px', borderRadius: '50%', fontSize: '7px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#c89520', color: '#fff', border: `2px solid ${cardBg}` }}>1</span>
                          )}
                        </div>

                        {/* Nome + barra */}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</p>
                          <ProgressBar pct={fatPct} color={o.color} height={3} />
                        </div>

                        {/* Faturamento */}
                        <p style={{ fontSize: '12px', fontWeight: 700, color: text, textAlign: 'right' }}>{fmtBRL(o.faturamento)}</p>

                        {/* Vendas */}
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '11px', color: muted }}>Vendas</p>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#4d7aa8' }}>{o.vendas}</p>
                        </div>

                        {/* Reuniões */}
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '11px', color: muted }}>Reuniões</p>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#7c5cbf' }}>{o.reunioes}</p>
                        </div>

                        {/* Conversão */}
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '11px', color: muted }}>Tx Conv.</p>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: o.conversion >= metas.conversion ? '#2a9a5a' : '#a88030' }}>{o.conversion}%</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Direita: feed de vendas + metas visuais */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Feed de vendas recentes */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2a9a5a', boxShadow: '0 0 0 4px rgba(42,154,90,0.2)', animation: 'pulse 2s infinite' }} />
                <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Vendas Recentes</p>
              </div>

              {recentWins.length === 0 ? (
                <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>Sem vendas no período</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentWins.map((w) => (
                    <div key={w.id}
                      style={{
                        padding: '10px 12px', borderRadius: '8px', border: `1px solid ${w.id === newWinId ? '#2a9a5a' : border}`,
                        backgroundColor: w.id === newWinId ? 'rgba(42,154,90,0.08)' : 'transparent',
                        transition: 'all 0.5s ease',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.company}</p>
                          <p style={{ fontSize: '10px', color: muted }}>{w.owner} · {relativeTime(w.at)}</p>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: '#2a9a5a' }}>{fmtBRL(w.valor)}</p>
                          {w.id === newWinId && <Zap style={{ width: '12px', height: '12px', color: '#2a9a5a' }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Metas visuais */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Progresso das Metas</p>
                <button type="button" onClick={() => setShowMetas(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px' }}>
                  <Settings style={{ width: '13px', height: '13px' }} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Faturamento', atual: totals.faturamento, meta: metas.faturamento, color: '#2a9a5a', fmt: fmtBRL },
                  { label: 'Vendas',      atual: totals.vendas,      meta: metas.vendas,      color: '#4d7aa8', fmt: (v: number) => String(v) },
                  { label: 'Ligações',    atual: totals.ligacoes,    meta: metas.ligacoes,    color: '#0e7490', fmt: (v: number) => String(v) },
                  { label: 'Reuniões',    atual: totals.reunioes,    meta: metas.reunioes,    color: '#7c5cbf', fmt: (v: number) => String(v) },
                  { label: 'Conversão',   atual: totals.conversion,  meta: metas.conversion,  color: '#a88030', fmt: (v: number) => `${v}%` },
                ].map(({ label, atual, meta, color, fmt }) => {
                  const p = pct(atual, meta)
                  const done = p >= 100
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {done && <Check style={{ width: '11px', height: '11px', color: '#2a9a5a' }} />}
                          <p style={{ fontSize: '11px', fontWeight: 600, color: done ? '#2a9a5a' : text }}>{label}</p>
                        </div>
                        <p style={{ fontSize: '11px', color: muted }}>{fmt(atual)} / {fmt(meta)}</p>
                      </div>
                      <ProgressBar pct={p} color={color} height={5} />
                      <p style={{ fontSize: '10px', color: muted, marginTop: '3px', textAlign: 'right' }}>{p}%</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 4px rgba(42,154,90,0.2)} 50%{box-shadow:0 0 0 7px rgba(42,154,90,0.08)} }`}</style>

      {/* Modal metas */}
      {showMetas && (
        <MetasModal
          metas={metas} isDark={isDark} border={border} text={text} muted={muted}
          onSave={saveMetas} onClose={() => setShowMetas(false)}
        />
      )}
    </div>
  )
}
