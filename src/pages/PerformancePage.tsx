import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metas {
  faturamento: number
  ligacoes_dia: number
  reunioes: number
  agendamentos: number
  vendas: number
}

interface WinRow { id: string; company: string; valor: number; at: string }

interface OwnerCol {
  id: string
  name: string
  initials: string
  // pipeline (todos os deals activos)
  pipeline_count: number
  pipeline_valor: number
  // ganhos no período
  faturamento: number
  vendas: number
  // actividades
  ligacoes: number
  reunioes: number
  agendamentos: number
  wins: WinRow[]
}

const DEFAULT_METAS: Metas = {
  faturamento: 5_000_000,
  ligacoes_dia: 50,
  reunioes: 10,
  agendamentos: 10,
  vendas: 20,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(1)}k`
  return `R$${n.toFixed(0)}`
}

function fmtBRLS(v: number) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(0)}k`
  return `R$${n.toFixed(0)}`
}

function pct(a: number, m: number) { return m ? Math.min(100, Math.round((a / m) * 100)) : 0 }

function hashColor(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return `hsl(${Math.abs(h) % 360},38%,44%)`
}

function daysInMonth(m: number, y: number) { return new Date(y, m + 1, 0).getDate() }
function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

const MESES       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DOW         = ['D','S','T','Q','Q','S','S']

// ─── Clock ────────────────────────────────────────────────────────────────────

function Clock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return (
    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
      {t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

// ─── Mini calendar ────────────────────────────────────────────────────────────

function MiniCal({ year, month, selected, onToggle, onPrev, onNext }: {
  year: number; month: number; selected: number[]
  onToggle: (d: number) => void; onPrev: () => void; onNext: () => void
}) {
  const total = daysInMonth(month, year)
  const firstDow = new Date(year, month, 1).getDay()
  const days = Array.from({ length: total }, (_, i) => i + 1)

  return (
    <div style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, backgroundColor: '#1a1916', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', width: '216px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button type="button" onClick={onPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', lineHeight: 1, padding: '2px' }}>
          <ChevronLeft style={{ width: '12px', height: '12px' }} />
        </button>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{MESES_SHORT[month]} {year}</span>
        <button type="button" onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', lineHeight: 1, padding: '2px' }}>
          <ChevronRight style={{ width: '12px', height: '12px' }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {DOW.map((d, i) => <span key={i} style={{ textAlign: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, padding: '2px 0', display: 'block' }}>{d}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {Array.from({ length: firstDow }, (_, i) => <div key={`b${i}`} />)}
        {days.map((d) => {
          const sel = selected.includes(d)
          return (
            <button key={d} type="button" onClick={() => onToggle(d)}
              style={{ height: '26px', borderRadius: '5px', fontSize: '10px', fontWeight: sel ? 700 : 400, border: 'none', backgroundColor: sel ? '#2c5545' : 'transparent', color: sel ? '#fff' : 'rgba(255,255,255,0.45)', cursor: 'pointer', transition: 'all 0.1s' }}>
              {d}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button type="button" onClick={() => days.forEach((d) => { if (!selected.includes(d)) onToggle(d) })}
          style={{ flex: 1, height: '22px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 600, cursor: 'pointer' }}>Todos</button>
        <button type="button" onClick={() => selected.forEach((d) => onToggle(d))}
          style={{ flex: 1, height: '22px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 600, cursor: 'pointer' }}>Limpar</button>
      </div>
      {selected.length > 0 && <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '5px' }}>{selected.length} {selected.length === 1 ? 'dia' : 'dias'}</p>}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function PBar({ p, color }: { p: number; color: string }) {
  return (
    <div style={{ height: '2px', borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: '3px' }}>
      <div style={{ height: '100%', width: `${p}%`, backgroundColor: color, borderRadius: 99, transition: 'width 0.5s' }} />
    </div>
  )
}

// ─── Stat cell ────────────────────────────────────────────────────────────────

function Stat({ label, value, meta, p, color }: { label: string; value: number | string; meta: string; p: number; color: string }) {
  return (
    <div>
      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontSize: '15px', fontWeight: 800, color: p >= 100 ? '#2c5545' : color, lineHeight: 1.1 }}>
        {value}<span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>/{meta}</span>
      </p>
      <PBar p={p} color={color} />
    </div>
  )
}

// ─── Owner column ─────────────────────────────────────────────────────────────

function OwnerColumn({ col, rank, metas, diasCount, flashId }: {
  col: OwnerCol; rank: number; metas: Metas; diasCount: number; flashId: string | null
}) {
  const color     = hashColor(col.name)
  const fatPct    = pct(col.faturamento, metas.faturamento)
  const venPct    = pct(col.vendas,       metas.vendas)
  const ligPct    = pct(col.ligacoes,     metas.ligacoes_dia * diasCount)
  const reuPct    = pct(col.reunioes,     metas.reunioes)
  const agePct    = pct(col.agendamentos, metas.agendamentos)
  const hasFlash  = col.wins.some((w) => w.id === flashId)

  const rkLabel  = ['1º','2º','3º'][rank] ?? `${rank+1}º`
  const rkColor  = rank === 0 ? '#c89520' : rank === 1 ? '#8a9098' : rank === 2 ? '#9a6848' : 'rgba(255,255,255,0.18)'

  return (
    <div style={{
      flex: '0 0 210px', display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      backgroundColor: hasFlash ? 'rgba(44,85,69,0.07)' : 'transparent',
      transition: 'background 0.4s',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {col.initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e4dc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {col.name.split(' ')[0]}
              </p>
              <span style={{ fontSize: '9px', fontWeight: 800, color: rkColor, flexShrink: 0 }}>{rkLabel}</span>
            </div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</p>
          </div>
        </div>

        {/* Pipeline highlight */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{col.pipeline_count} deals</span>
        </div>
        <p style={{ fontSize: '18px', fontWeight: 900, color: col.pipeline_valor > 0 ? '#e8e4dc' : 'rgba(255,255,255,0.15)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '2px' }}>
          {fmtBRL(col.pipeline_valor)}
        </p>

        {/* Faturamento ganho */}
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ganhos no período</span>
          <p style={{ fontSize: '14px', fontWeight: 800, color: col.faturamento > 0 ? '#2c5545' : 'rgba(255,255,255,0.15)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {fmtBRLS(col.faturamento)}
          </p>
          <PBar p={fatPct} color="#2c5545" />
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }}>
        {[
          { label: 'Vendas',   v: col.vendas,       meta: String(metas.vendas),                          p: venPct, color: '#4d7aa8' },
          { label: 'Ligações', v: col.ligacoes,     meta: `${metas.ligacoes_dia * diasCount}`,            p: ligPct, color: '#0e7490' },
          { label: 'Reuniões', v: col.reunioes,     meta: String(metas.reunioes),                         p: reuPct, color: '#7c5cbf' },
          { label: 'Agend.',   v: col.agendamentos, meta: String(metas.agendamentos),                     p: agePct, color: '#a88030' },
        ].map((s) => (
          <div key={s.label} style={{ padding: '8px 10px', backgroundColor: '#0d0c0a' }}>
            <Stat label={s.label} value={s.v} meta={s.meta} p={s.p} color={s.color} />
          </div>
        ))}
      </div>

      {/* Wins list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {col.wins.length === 0 ? (
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.12)', fontStyle: 'italic', padding: '12px 14px' }}>Sem vendas fechadas no período</p>
        ) : col.wins.map((w, i) => (
          <div key={w.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)',
            borderLeft: w.id === flashId ? '2px solid #2c5545' : '2px solid transparent',
            backgroundColor: w.id === flashId ? 'rgba(44,85,69,0.14)' : 'transparent',
            transition: 'all 0.3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.18)', fontWeight: 700, flexShrink: 0 }}>#{i+1}</span>
              <p style={{ fontSize: '11px', color: w.id === flashId ? '#e8e4dc' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.company}</p>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
              {w.id === flashId && <Zap style={{ width: '9px', height: '9px', color: '#2c5545' }} />}
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#2c5545' }}>{fmtBRLS(w.valor)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Mode = 'diario' | 'mensal'

export function PerformancePage() {
  const today = new Date()

  const [mode,       setMode]      = useState<Mode>('mensal')
  const [currentDay, setCurrentDay] = useState(() => isoDate(today))
  const [calMonth,   setCalMonth]  = useState(today.getMonth())
  const [calYear,    setCalYear]   = useState(today.getFullYear())
  const [selDias,    setSelDias]   = useState<number[]>([])
  const [calOpen,    setCalOpen]   = useState(false)

  const [owners,     setOwners]    = useState<OwnerCol[]>([])
  const [metas,      setMetas]     = useState<Metas>(DEFAULT_METAS)
  const [flashId,    setFlashId]   = useState<string | null>(null)
  const [recentWins, setRecentWins] = useState<{ id: string; owner: string; company: string; valor: number; at: string }[]>([])
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState<string | null>(null)

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calRef     = useRef<HTMLDivElement>(null)

  // Load metas from Supabase (best-effort, fallback to defaults)
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'desempenho_config').single()
      .then(({ data }) => {
        if (data?.value) {
          const v = data.value as { metas?: Partial<Metas> }
          if (v.metas) setMetas({ ...DEFAULT_METAS, ...v.metas })
        }
      })
      .then(undefined, () => { /* usa defaults */ })
  }, [])

  // Close calendar on outside click
  useEffect(() => {
    if (!calOpen) return
    function h(e: MouseEvent) { if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [calOpen])

  // Date range
  const { since, until, diasCount, rangeLabel } = useMemo(() => {
    if (mode === 'diario') {
      const d = new Date(currentDay)
      return {
        since: `${currentDay}T00:00:00`,
        until: `${currentDay}T23:59:59`,
        diasCount: 1,
        rangeLabel: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
      }
    }
    const count = selDias.length || daysInMonth(calMonth, calYear)
    const label = selDias.length === 0
      ? `${MESES[calMonth]} ${calYear}`
      : selDias.length === 1 ? `${selDias[0]} ${MESES_SHORT[calMonth]}`
      : `${selDias.length} dias — ${MESES_SHORT[calMonth]} ${calYear}`

    if (selDias.length === 0) {
      return { since: new Date(calYear, calMonth, 1).toISOString(), until: new Date(calYear, calMonth + 1, 0, 23, 59, 59).toISOString(), diasCount: count, rangeLabel: label }
    }
    const min = Math.min(...selDias); const max = Math.max(...selDias)
    return { since: new Date(calYear, calMonth, min).toISOString(), until: new Date(calYear, calMonth, max, 23, 59, 59).toISOString(), diasCount: count, rangeLabel: label }
  }, [mode, currentDay, calMonth, calYear, selDias])

  const selDiasSet = useMemo(() => new Set(selDias), [selDias])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Load ALL deals (any stage) + meetings in period
      const [{ data: deals, error: dealsErr }, { data: meetings }] = await Promise.all([
        supabase.from('deals').select('id,owner,owner_id,stage_id,value,updated_at,company_name').is('deleted_at', null),
        supabase.from('deal_meetings').select('owner,scheduled_at,status').gte('scheduled_at', since).lte('scheduled_at', until),
      ])

      if (dealsErr) throw dealsErr

      const allDeals = deals ?? []

      // Filter won deals in period
      function inPeriod(iso: string) {
        const d = new Date(iso)
        if (d < new Date(since) || d > new Date(until)) return false
        if (mode === 'mensal' && selDiasSet.size > 0) return selDiasSet.has(d.getDate())
        return true
      }

      const wonInPeriod = allDeals.filter((d) => d.stage_id === 'closed_won' && inPeriod(d.updated_at))

      const ownerMap: Record<string, OwnerCol> = {}

      function ensure(o: { id?: string; name?: string } | null, fid: string) {
        const id   = o?.id ?? fid
        const name = o?.name ?? 'Desconhecido'
        if (!ownerMap[id]) ownerMap[id] = {
          id, name,
          initials: name.split(' ').filter(Boolean).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
          pipeline_count: 0, pipeline_valor: 0,
          faturamento: 0, vendas: 0,
          ligacoes: 0, reunioes: 0, agendamentos: 0,
          wins: [],
        }
        return ownerMap[id]
      }

      // Build from ALL deals (pipeline)
      allDeals.forEach((d) => {
        const o = d.owner as { id?: string; name?: string } | null
        const m = ensure(o, d.owner_id)
        if (!['closed_won','closed_lost'].includes(d.stage_id)) {
          m.pipeline_count++
          m.pipeline_valor += Number(d.value) || 0
        }
        if (d.stage_id === 'closed_won') {
          // count all won (not filtered by period) for pipeline context
        }
      })

      // Won in period → faturamento + wins list
      wonInPeriod.forEach((d) => {
        const o = d.owner as { id?: string; name?: string } | null
        const m = ensure(o, d.owner_id)
        m.vendas++
        m.faturamento += Number(d.value) || 0
        m.wins.push({ id: d.id, company: d.company_name ?? '—', valor: Number(d.value) || 0, at: d.updated_at })
      })

      // Meetings in period
      ;(meetings ?? []).forEach((mt) => {
        const o = mt.owner as { id?: string } | null
        if (!o?.id || !ownerMap[o.id]) return
        if (['realizada','confirmada'].includes(mt.status)) ownerMap[o.id].reunioes++
        else ownerMap[o.id].agendamentos++
      })

      // Sort wins per owner
      Object.values(ownerMap).forEach((col) => col.wins.sort((a, b) => b.at.localeCompare(a.at)))

      // Sort owners by pipeline value (most active first), then by won faturamento
      const sorted = Object.values(ownerMap).sort((a, b) =>
        (b.pipeline_valor + b.faturamento) - (a.pipeline_valor + a.faturamento)
      )
      setOwners(sorted)

      // Recent wins feed
      setRecentWins(
        wonInPeriod
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
          .slice(0, 12)
          .map((d) => ({
            id: d.id,
            owner: (d.owner as { name?: string } | null)?.name ?? '?',
            company: d.company_name ?? '—',
            valor: Number(d.value) || 0,
            at: d.updated_at,
          }))
      )
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [since, until, mode, selDiasSet])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('perf-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deal_meetings' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [load])

  // Flash on new won deal
  useEffect(() => {
    const ch2 = supabase.channel('perf-flash')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, (payload) => {
        const d = payload.new as { id: string; stage_id: string; company_name: string; owner: { name?: string } | null; value: number; updated_at: string }
        if (d.stage_id !== 'closed_won') return
        setFlashId(d.id)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlashId(null), 5000)
        setRecentWins((prev) => [{ id: d.id, owner: d.owner?.name ?? '?', company: d.company_name ?? '—', valor: Number(d.value) || 0, at: d.updated_at }, ...prev].slice(0, 12))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch2) }
  }, [])

  const totals = useMemo(() => ({
    pipeline:    owners.reduce((s, o) => s + o.pipeline_valor, 0),
    faturamento: owners.reduce((s, o) => s + o.faturamento, 0),
    vendas:      owners.reduce((s, o) => s + o.vendas, 0),
    reunioes:    owners.reduce((s, o) => s + o.reunioes, 0),
    leads:       owners.reduce((s, o) => s + o.pipeline_count, 0),
  }), [owners])

  function prevDay() { const d = new Date(currentDay); d.setDate(d.getDate() - 1); setCurrentDay(isoDate(d)) }
  function nextDay() { const d = new Date(currentDay); d.setDate(d.getDate() + 1); if (d <= today) setCurrentDay(isoDate(d)) }
  const isToday = currentDay === isoDate(today)

  function toggleDia(d: number) { setSelDias((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort((a, b) => a - b)) }

  const mensalLabel = selDias.length === 0 ? `${MESES_SHORT[calMonth]} ${calYear}` : selDias.length === 1 ? `${selDias[0]} ${MESES_SHORT[calMonth]}` : `${selDias.length} dias`

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0d0c0a', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ height: '50px', flexShrink: 0, backgroundColor: '#111110', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px' }}>

        {/* Title */}
        <p style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.18em', textTransform: 'uppercase', flexShrink: 0 }}>Performance</p>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '2px', borderRadius: '7px', flexShrink: 0 }}>
          {(['mensal','diario'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              style={{ height: '24px', padding: '0 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: mode === m ? '#1e1e1c' : 'transparent', color: mode === m ? '#e8e4dc' : 'rgba(255,255,255,0.3)', transition: 'all 0.1s' }}>
              {m === 'diario' ? 'Diário' : 'Mensal'}
            </button>
          ))}
        </div>

        {/* Date control */}
        {mode === 'diario' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            <button type="button" onClick={prevDay} style={{ width: '24px', height: '24px', border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px' }}>
              <ChevronLeft style={{ width: '12px', height: '12px' }} />
            </button>
            <button type="button" onClick={() => setCurrentDay(isoDate(today))}
              style={{ height: '24px', padding: '0 10px', borderRadius: '5px', border: `1px solid ${isToday ? 'rgba(44,85,69,0.5)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: isToday ? 'rgba(44,85,69,0.12)' : 'transparent', color: isToday ? '#2c5545' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {rangeLabel}
            </button>
            <button type="button" onClick={nextDay} disabled={isToday} style={{ width: '24px', height: '24px', border: 'none', background: 'none', cursor: isToday ? 'default' : 'pointer', color: isToday ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px' }}>
              <ChevronRight style={{ width: '12px', height: '12px' }} />
            </button>
          </div>
        ) : (
          <div ref={calRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button type="button" onClick={() => setCalOpen((v) => !v)}
              style={{ height: '24px', padding: '0 10px', borderRadius: '5px', border: `1px solid ${calOpen ? 'rgba(44,85,69,0.5)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: selDias.length > 0 ? 'rgba(44,85,69,0.1)' : 'transparent', color: selDias.length > 0 ? '#2c5545' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {mensalLabel}
              <ChevronLeft style={{ width: '10px', height: '10px', transform: calOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.12s' }} />
            </button>
            {calOpen && (
              <MiniCal year={calYear} month={calMonth} selected={selDias} onToggle={toggleDia}
                onPrev={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1) } else setCalMonth((m) => m - 1); setSelDias([]) }}
                onNext={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1) } else setCalMonth((m) => m + 1); setSelDias([]) }}
              />
            )}
          </div>
        )}

        {/* KPI summary */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '28px' }}>
          {[
            { label: 'Pipeline',     value: fmtBRL(totals.pipeline),    sub: `${totals.leads} leads`,                  color: '#e8e4dc' },
            { label: 'Faturamento',  value: fmtBRL(totals.faturamento), sub: `${pct(totals.faturamento, metas.faturamento)}% meta`, color: '#2c5545' },
            { label: 'Vendas',       value: String(totals.vendas),       sub: `/${metas.vendas} meta`,                  color: '#4d7aa8' },
            { label: 'Reuniões',     value: String(totals.reunioes),     sub: `/${metas.reunioes} meta`,                color: '#7c5cbf' },
          ].map((k) => (
            <div key={k.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.22)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k.label}</p>
              <p style={{ fontSize: '17px', fontWeight: 900, color: k.color, lineHeight: 1.1, letterSpacing: '-0.04em' }}>{k.value}</p>
              <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.18)' }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Live + clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2c5545', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>AO VIVO</span>
          </div>
          <Clock />
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Columns */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)', borderTopColor: '#2c5545', animation: 'spin 0.7s linear infinite' }} />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>A carregar dados...</p>
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', color: '#e05050' }}>Erro ao carregar dados</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{error}</p>
              <button type="button" onClick={load} style={{ marginTop: '8px', height: '28px', padding: '0 14px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer' }}>Tentar novamente</button>
            </div>
          ) : owners.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>Sem deals no período</p>
            </div>
          ) : owners.map((col, rank) => (
            <OwnerColumn key={col.id} col={col} rank={rank} metas={metas} diasCount={diasCount} flashId={flashId} />
          ))}
        </div>

        {/* Right panel */}
        <div style={{ width: '230px', flexShrink: 0, backgroundColor: '#111110', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px 9px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2c5545', animation: 'pulse 2s infinite' }} />
            <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vendas Recentes</p>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {recentWins.length === 0 ? (
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.12)', fontStyle: 'italic', padding: '14px' }}>Sem vendas fechadas no período</p>
            ) : recentWins.map((w, i) => (
              <div key={`${w.id}-${i}`} style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', borderLeft: w.id === flashId ? '2px solid #2c5545' : '2px solid transparent', backgroundColor: w.id === flashId ? 'rgba(44,85,69,0.1)' : 'transparent', transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: w.id === flashId ? '#e8e4dc' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.company}</p>
                    <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.22)', marginTop: '1px' }}>{w.owner}</p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {w.id === flashId && <Zap style={{ width: '9px', height: '9px', color: '#2c5545', display: 'block', margin: '0 auto 2px' }} />}
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#2c5545' }}>{fmtBRLS(w.valor)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 14px' }}>
            {[
              { label: 'Pipeline total',   value: fmtBRL(totals.pipeline),    p: 100,                                       color: '#e8e4dc' },
              { label: 'Faturamento',      value: fmtBRL(totals.faturamento), p: pct(totals.faturamento, metas.faturamento), color: '#2c5545' },
              { label: 'Vendas / Meta',    value: `${totals.vendas}/${metas.vendas}`, p: pct(totals.vendas, metas.vendas),   color: '#4d7aa8' },
            ].map((t) => (
              <div key={t.label} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.22)', fontWeight: 600 }}>{t.label}</span>
                  <span style={{ fontSize: '9px', color: t.color, fontWeight: 700 }}>{t.value}</span>
                </div>
                <PBar p={t.p} color={t.color} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { width:3px; height:3px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:3px }
      `}</style>
    </div>
  )
}
