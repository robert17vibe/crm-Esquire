import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metas {
  faturamento_dia:  number
  vendas_dia:       number
  ligacoes_dia:     number
  reunioes_dia:     number
  agendamentos_dia: number
}

interface WinRow { id: string; company: string; valor: number; at: string }

interface OwnerRow {
  id:              string
  name:            string
  initials:        string
  pipeline_count:  number
  pipeline_valor:  number
  faturamento:     number
  vendas:          number
  ligacoes:        number
  reunioes:        number
  agendamentos:    number
  wins:            WinRow[]
}

const DEFAULT_METAS: Metas = {
  faturamento_dia:  166_667,
  vendas_dia:       1,
  ligacoes_dia:     50,
  reunioes_dia:     1,
  agendamentos_dia: 1,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `R$${(n / 1_000).toFixed(0)}k`
  return `R$${n.toFixed(0)}`
}

function pct(a: number, m: number) { return m ? Math.min(100, Math.round((a / m) * 100)) : 0 }

function hashColor(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return `hsl(${Math.abs(h) % 360},40%,42%)`
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
    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)', fontVariantNumeric: 'tabular-nums' }}>
      {t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCal({ year, month, selected, onToggle, onPrev, onNext }: {
  year: number; month: number; selected: number[]
  onToggle: (d: number) => void; onPrev: () => void; onNext: () => void
}) {
  const total    = daysInMonth(month, year)
  const firstDow = new Date(year, month, 1).getDay()
  const days     = Array.from({ length: total }, (_, i) => i + 1)
  return (
    <div style={{ position: 'absolute', top: '44px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, backgroundColor: '#1a1916', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', width: '228px', boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button type="button" onClick={onPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '4px' }}>
          <ChevronLeft style={{ width: '13px', height: '13px' }} />
        </button>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{MESES_SHORT[month]} {year}</span>
        <button type="button" onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '4px' }}>
          <ChevronRight style={{ width: '13px', height: '13px' }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
        {DOW.map((d, i) => <span key={i} style={{ textAlign: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, display: 'block', padding: '2px 0' }}>{d}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {Array.from({ length: firstDow }, (_, i) => <div key={`b${i}`} />)}
        {days.map((d) => {
          const sel = selected.includes(d)
          return (
            <button key={d} type="button" onClick={() => onToggle(d)}
              style={{ height: '28px', borderRadius: '6px', fontSize: '10px', fontWeight: sel ? 700 : 400, border: 'none', backgroundColor: sel ? '#2c5545' : 'transparent', color: sel ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              {d}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button type="button" onClick={() => days.forEach((d) => { if (!selected.includes(d)) onToggle(d) })}
          style={{ flex: 1, height: '24px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>Todos</button>
        <button type="button" onClick={() => selected.forEach((d) => onToggle(d))}
          style={{ flex: 1, height: '24px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>Limpar</button>
      </div>
      {selected.length > 0 && <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '6px' }}>{selected.length} dias seleccionados</p>}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function Bar({ p, color }: { p: number; color: string }) {
  return (
    <div style={{ height: '3px', borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: '4px' }}>
      <div style={{ height: '100%', width: `${p}%`, backgroundColor: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ─── Table Row ────────────────────────────────────────────────────────────────

const GRID = '44px 200px 1.6fr 1fr 1fr 1fr 1fr'

function TableRow({ row, rank, metas, metaFactor, flashId, isOdd }: {
  row: OwnerRow; rank: number; metas: Metas; metaFactor: number; flashId: string | null; isOdd: boolean
}) {
  const color  = hashColor(row.name)
  const metaF  = metas.faturamento_dia  * metaFactor
  const metaV  = metas.vendas_dia       * metaFactor
  const metaL  = metas.ligacoes_dia     * metaFactor
  const metaR  = metas.reunioes_dia     * metaFactor
  const metaA  = metas.agendamentos_dia * metaFactor

  const fP = pct(row.faturamento, metaF)
  const vP = pct(row.vendas,      metaV)
  const lP = pct(row.ligacoes,    metaL)
  const rP = pct(row.reunioes,    metaR)
  const aP = pct(row.agendamentos,metaA)

  const flash    = row.wins.some((w) => w.id === flashId)
  const rkColors = ['#c89520', '#8a9098', '#9a6848']
  const rkColor  = rkColors[rank] ?? 'rgba(255,255,255,0.2)'
  const rkLabel  = rank < 3 ? ['1°','2°','3°'][rank] : `${rank + 1}°`

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: GRID,
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      backgroundColor: flash
        ? 'rgba(44,85,69,0.1)'
        : isOdd ? 'rgba(255,255,255,0.012)' : 'transparent',
      borderLeft: flash ? '3px solid #2c5545' : '3px solid transparent',
      transition: 'background 0.4s',
      minHeight: '46px',
    }}>

      {/* Rank */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: rank < 3 ? '12px' : '10px', fontWeight: 800, color: rkColor, letterSpacing: '-0.01em' }}>{rkLabel}</span>
      </div>

      {/* Name + pipeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 14px', borderLeft: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          backgroundColor: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 800, color: '#fff', flexShrink: 0,
          letterSpacing: '-0.02em',
        }}>
          {row.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#e2ddd5', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</p>
          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: '1px' }}>
            {row.pipeline_count} leads · <span style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtBRL(row.pipeline_valor)}</span>
          </p>
        </div>
      </div>

      {/* Faturamento */}
      <MetricCell
        value={fmtBRL(row.faturamento)}
        meta={`meta ${fmtBRL(metaF)}`}
        p={fP}
        color={row.faturamento > 0 ? '#3a7060' : 'rgba(255,255,255,0.2)'}
        barColor="#2c5545"
      />
      {/* Vendas */}
      <MetricCell value={String(row.vendas)} meta={`meta ${Math.round(metaV)}`} p={vP} color={vP >= 100 ? '#3a7060' : '#4d7aa8'} barColor="#4d7aa8" />
      {/* Ligações */}
      <MetricCell value={String(row.ligacoes)} meta={`meta ${Math.round(metaL)}`} p={lP} color={lP >= 100 ? '#3a7060' : '#0e7490'} barColor="#0e7490" />
      {/* Reuniões */}
      <MetricCell value={String(row.reunioes)} meta={`meta ${Math.round(metaR)}`} p={rP} color={rP >= 100 ? '#3a7060' : '#7c5cbf'} barColor="#7c5cbf" />
      {/* Agendamentos */}
      <MetricCell value={String(row.agendamentos)} meta={`meta ${Math.round(metaA)}`} p={aP} color={aP >= 100 ? '#3a7060' : '#a88030'} barColor="#a88030" />
    </div>
  )
}

function MetricCell({ value, meta, p, color, barColor }: {
  value: string; meta: string; p: number; color: string; barColor: string
}) {
  return (
    <div style={{ padding: '8px 16px', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <p style={{ fontSize: '15px', fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: '10px', fontWeight: 600, color: p > 0 ? 'rgba(255,255,255,0.3)' : 'transparent' }}>{p}%</p>
      </div>
      <Bar p={p} color={barColor} />
      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.22)', marginTop: '3px' }}>{meta}</p>
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

  const [rows,    setRows]    = useState<OwnerRow[]>([])
  const [metas,   setMetas]   = useState<Metas>(DEFAULT_METAS)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'desempenho_config').single()
      .then(({ data }) => {
        if (data?.value) {
          const v = data.value as { metas?: Partial<Metas> }
          if (v.metas) setMetas({ ...DEFAULT_METAS, ...v.metas })
        }
      }, () => {})
  }, [])

  useEffect(() => {
    if (!calOpen) return
    function h(e: MouseEvent) { if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [calOpen])

  const { since, until, diasCount, totalDays, rangeLabel } = useMemo(() => {
    if (mode === 'diario') {
      const d = new Date(currentDay)
      return {
        since: `${currentDay}T00:00:00`,
        until: `${currentDay}T23:59:59`,
        diasCount: 1,
        totalDays: daysInMonth(d.getMonth(), d.getFullYear()),
        rangeLabel: d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }),
      }
    }
    const total = daysInMonth(calMonth, calYear)
    const count = selDias.length || total
    const label = selDias.length === 0
      ? `${MESES[calMonth]} ${calYear}`
      : selDias.length === 1 ? `${selDias[0]} de ${MESES_SHORT[calMonth]}`
      : `${selDias.length} dias — ${MESES_SHORT[calMonth]} ${calYear}`
    if (selDias.length === 0) return {
      since: new Date(calYear, calMonth, 1).toISOString(),
      until: new Date(calYear, calMonth + 1, 0, 23, 59, 59).toISOString(),
      diasCount: count, totalDays: total, rangeLabel: label,
    }
    const min = Math.min(...selDias); const max = Math.max(...selDias)
    return {
      since: new Date(calYear, calMonth, min).toISOString(),
      until: new Date(calYear, calMonth, max, 23, 59, 59).toISOString(),
      diasCount: count, totalDays: total, rangeLabel: label,
    }
  }, [mode, currentDay, calMonth, calYear, selDias])

  const selDiasSet = useMemo(() => new Set(selDias), [selDias])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [{ data: deals, error: dealsErr }, { data: meetings }, { data: activities }] = await Promise.all([
        supabase.from('deals').select('*').is('deleted_at', null),
        supabase.from('deal_meetings').select('owner,scheduled_at,status').gte('scheduled_at', since).lte('scheduled_at', until),
        supabase.from('deal_activities').select('owner_id,type,created_at').eq('type', 'call').gte('created_at', since).lte('created_at', until),
      ])
      if (dealsErr) throw dealsErr
      const allDeals = deals ?? []
      function inPeriod(iso: string) {
        const d = new Date(iso)
        if (d < new Date(since) || d > new Date(until)) return false
        if (mode === 'mensal' && selDiasSet.size > 0) return selDiasSet.has(d.getDate())
        return true
      }
      const wonInPeriod = allDeals.filter((d) => d.stage_id === 'closed_won' && inPeriod(d.updated_at))
      const ownerMap: Record<string, OwnerRow> = {}
      function ensure(o: { id?: string; name?: string } | null, fid: string) {
        const id   = o?.id   ?? fid   ?? 'unknown'
        const name = o?.name ?? 'Desconhecido'
        if (!ownerMap[id]) ownerMap[id] = {
          id, name,
          initials: name.split(' ').filter(Boolean).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || '?',
          pipeline_count: 0, pipeline_valor: 0,
          faturamento: 0, vendas: 0, ligacoes: 0, reunioes: 0, agendamentos: 0, wins: [],
        }
        return ownerMap[id]
      }
      allDeals.forEach((d) => {
        const m = ensure(d.owner as { id?: string; name?: string } | null, d.owner_id as string)
        if (!['closed_won','closed_lost'].includes(d.stage_id as string)) {
          m.pipeline_count++; m.pipeline_valor += Number(d.value) || 0
        }
      })
      wonInPeriod.forEach((d) => {
        const m = ensure(d.owner as { id?: string; name?: string } | null, d.owner_id as string)
        m.vendas++; m.faturamento += Number(d.value) || 0
        m.wins.push({ id: d.id as string, company: (d.company_name ?? '—') as string, valor: Number(d.value) || 0, at: d.updated_at as string })
      })
      ;(meetings ?? []).forEach((mt) => {
        const o = mt.owner as { id?: string } | null
        if (!o?.id || !ownerMap[o.id]) return
        if (['realizada','confirmada'].includes(mt.status as string)) ownerMap[o.id].reunioes++
        else ownerMap[o.id].agendamentos++
      })
      ;(activities ?? []).forEach((act) => {
        const oid = act.owner_id as string | null
        if (oid && ownerMap[oid]) ownerMap[oid].ligacoes++
      })
      setRows(Object.values(ownerMap).sort((a, b) => (b.faturamento + b.pipeline_valor) - (a.faturamento + a.pipeline_valor)))
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [since, until, mode, selDiasSet])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('perf-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deal_meetings' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch); if (flashTimer.current) clearTimeout(flashTimer.current) }
  }, [load])

  useEffect(() => {
    const ch2 = supabase.channel('perf-flash')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, (payload) => {
        const d = payload.new as { id: string; stage_id: string }
        if (d.stage_id !== 'closed_won') return
        setFlashId(d.id)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlashId(null), 5000)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch2) }
  }, [])

  const totals = useMemo(() => ({
    pipeline:    rows.reduce((s, r) => s + r.pipeline_valor, 0),
    leads:       rows.reduce((s, r) => s + r.pipeline_count, 0),
    faturamento: rows.reduce((s, r) => s + r.faturamento, 0),
    vendas:      rows.reduce((s, r) => s + r.vendas, 0),
    ligacoes:    rows.reduce((s, r) => s + r.ligacoes, 0),
    reunioes:    rows.reduce((s, r) => s + r.reunioes, 0),
  }), [rows])

  const metaFactor = diasCount / totalDays

  const metaTotals = useMemo(() => ({
    faturamento:  metas.faturamento_dia  * metaFactor,
    vendas:       metas.vendas_dia       * metaFactor,
    ligacoes:     metas.ligacoes_dia     * metaFactor,
    reunioes:     metas.reunioes_dia     * metaFactor,
    agendamentos: metas.agendamentos_dia * metaFactor,
  }), [metas, metaFactor])

  function prevDay() { const d = new Date(currentDay); d.setDate(d.getDate() - 1); setCurrentDay(isoDate(d)) }
  function nextDay() { const d = new Date(currentDay); d.setDate(d.getDate() + 1); if (d <= today) setCurrentDay(isoDate(d)) }
  const isToday = currentDay === isoDate(today)
  function toggleDia(d: number) { setSelDias((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort((a, b) => a - b)) }
  const mensalLabel = selDias.length === 0 ? `${MESES_SHORT[calMonth]} ${calYear}` : selDias.length === 1 ? `${selDias[0]} ${MESES_SHORT[calMonth]}` : `${selDias.length} dias`

  const COL_LABELS = [
    { label: 'Responsável',  color: 'rgba(255,255,255,0.4)' },
    { label: 'Faturamento',  color: '#2c5545' },
    { label: 'Vendas',       color: '#4d7aa8' },
    { label: 'Ligações',     color: '#0e7490' },
    { label: 'Reuniões',     color: '#7c5cbf' },
    { label: 'Agendamentos', color: '#a88030' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#0d0c0a',
      display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* ── HEADER ── */}
      <div style={{
        height: '54px', flexShrink: 0,
        backgroundColor: '#111110',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '20px',
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <TrendingUp style={{ width: '14px', height: '14px', color: '#2c5545' }} />
          <span style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Performance</span>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        {/* Mode */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px', flexShrink: 0 }}>
          {(['mensal','diario'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              style={{ height: '26px', padding: '0 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: mode === m ? '#1e1e1c' : 'transparent', color: mode === m ? '#e8e4dc' : 'rgba(255,255,255,0.3)', transition: 'all 0.15s' }}>
              {m === 'diario' ? 'Diário' : 'Mensal'}
            </button>
          ))}
        </div>

        {/* Date */}
        {mode === 'diario' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            <button type="button" onClick={prevDay} style={{ width: '26px', height: '26px', border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
              <ChevronLeft style={{ width: '13px', height: '13px' }} />
            </button>
            <button type="button" onClick={() => setCurrentDay(isoDate(today))}
              style={{ height: '26px', padding: '0 12px', borderRadius: '6px', border: `1px solid ${isToday ? 'rgba(44,85,69,0.5)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: isToday ? 'rgba(44,85,69,0.12)' : 'transparent', color: isToday ? '#4a9070' : 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {rangeLabel}
            </button>
            <button type="button" onClick={nextDay} disabled={isToday} style={{ width: '26px', height: '26px', border: 'none', background: 'none', cursor: isToday ? 'default' : 'pointer', color: isToday ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
              <ChevronRight style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        ) : (
          <div ref={calRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button type="button" onClick={() => setCalOpen((v) => !v)}
              style={{ height: '26px', padding: '0 12px', borderRadius: '6px', border: `1px solid ${calOpen ? 'rgba(44,85,69,0.5)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: selDias.length > 0 ? 'rgba(44,85,69,0.12)' : 'transparent', color: selDias.length > 0 ? '#4a9070' : 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {mensalLabel}
              <ChevronLeft style={{ width: '10px', height: '10px', transform: calOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
            </button>
            {calOpen && (
              <MiniCal year={calYear} month={calMonth} selected={selDias} onToggle={toggleDia}
                onPrev={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1) } else setCalMonth((m) => m - 1); setSelDias([]) }}
                onNext={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1) } else setCalMonth((m) => m + 1); setSelDias([]) }}
              />
            )}
          </div>
        )}

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        {/* KPIs */}
        <div style={{ flex: 1, display: 'flex', gap: '0', alignItems: 'center', justifyContent: 'center' }}>
          {[
            { label: 'Pipeline',    value: fmtBRL(totals.pipeline),    sub: `${totals.leads} leads`,                                    color: '#c4bfb8' },
            { label: 'Faturamento', value: fmtBRL(totals.faturamento), sub: `${pct(totals.faturamento, metaTotals.faturamento)}% meta`, color: '#3a7060' },
            { label: 'Vendas',      value: `${totals.vendas}`,          sub: `de ${Math.round(metaTotals.vendas)}`,                   color: '#4d7aa8' },
            { label: 'Ligações',    value: `${totals.ligacoes}`,        sub: `de ${Math.round(metaTotals.ligacoes)}`,                 color: '#0e7490' },
            { label: 'Reuniões',    value: `${totals.reunioes}`,        sub: `de ${Math.round(metaTotals.reunioes)}`,                 color: '#7c5cbf' },
          ].map((k, i) => (
            <div key={k.label} style={{
              textAlign: 'center',
              padding: '0 28px',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '2px' }}>{k.label}</p>
              <p style={{ fontSize: '16px', fontWeight: 900, color: k.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '3px' }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Live */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2c5545', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>AO VIVO</span>
          </div>
          <Clock />
        </div>
      </div>

      {/* ── TABLE HEADER ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: GRID,
        backgroundColor: '#0f0e0c',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 8px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.18)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>#</span>
        </div>
        {COL_LABELS.map((c, i) => (
          <div key={c.label} style={{ padding: '10px 16px', borderLeft: i === 0 ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: c.color }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── TABLE BODY ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '14px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)', borderTopColor: '#2c5545', animation: 'spin 0.7s linear infinite' }} />
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>A carregar...</p>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: '#e05050' }}>Erro ao carregar dados</p>
            <button type="button" onClick={load} style={{ height: '30px', padding: '0 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer' }}>
              Tentar novamente
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.12)', fontStyle: 'italic' }}>Sem dados no período</p>
          </div>
        ) : rows.map((row, i) => (
          <TableRow
            key={row.id}
            row={row}
            rank={i}
            metas={metas}
            metaFactor={metaFactor}
            flashId={flashId}
            isOdd={i % 2 === 1}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { width:4px; height:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:4px }
      `}</style>
    </div>
  )
}
