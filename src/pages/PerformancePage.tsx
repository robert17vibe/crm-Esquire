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

interface DealRow {
  id: string
  company: string
  valor: number
  at: string
}

interface OwnerCol {
  id: string
  name: string
  initials: string
  faturamento: number
  vendas: number
  ligacoes: number
  reunioes: number
  agendamentos: number
  wins: DealRow[]
}

const DEFAULT_METAS: Metas = {
  faturamento: 5_000_000,
  ligacoes_dia: 50,
  reunioes: 10,
  agendamentos: 10,
  vendas: 20,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtK(v: number) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function fmtBRL(v: number) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(1)}k`
  return `R$${n.toFixed(0)}`
}

function pct(atual: number, meta: number) {
  if (!meta) return 0
  return Math.min(100, Math.round((atual / meta) * 100))
}

function hashColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue},40%,50%)`
}

function daysInMonth(m: number, y: number) { return new Date(y, m + 1, 0).getDate() }

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

function dayRange(dateStr: string): { since: string; until: string } {
  return { since: `${dateStr}T00:00:00`, until: `${dateStr}T23:59:59` }
}

function monthRange(year: number, month: number, dias: number[]): { since: string; until: string } {
  if (dias.length === 0) {
    return {
      since: new Date(year, month, 1).toISOString(),
      until: new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
    }
  }
  const min = Math.min(...dias)
  const max = Math.max(...dias)
  return {
    since: new Date(year, month, min).toISOString(),
    until: new Date(year, month, max, 23, 59, 59).toISOString(),
  }
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DIAS_SEMANA = ['D','S','T','Q','Q','S','S']

// ─── Clock ────────────────────────────────────────────────────────────────────

function Clock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return (
    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
      {t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

// ─── Mini Calendar (inline no header) ────────────────────────────────────────

function MiniCalendar({ year, month, selected, onToggle, onPrevMonth, onNextMonth }: {
  year: number; month: number
  selected: number[]
  onToggle: (d: number) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  const total = daysInMonth(month, year)
  const firstDow = new Date(year, month, 1).getDay()
  const days = Array.from({ length: total }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDow }, (_, i) => i)

  return (
    <div style={{ position: 'absolute', top: '44px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, backgroundColor: '#1a1916', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', width: '220px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button type="button" onClick={onPrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '2px 4px', lineHeight: 1 }}>
          <ChevronLeft style={{ width: '12px', height: '12px' }} />
        </button>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{MESES_SHORT[month]} {year}</span>
        <button type="button" onClick={onNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '2px 4px', lineHeight: 1 }}>
          <ChevronRight style={{ width: '12px', height: '12px' }} />
        </button>
      </div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 700, padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {blanks.map((i) => <div key={`b${i}`} />)}
        {days.map((d) => {
          const sel = selected.includes(d)
          return (
            <button key={d} type="button" onClick={() => onToggle(d)}
              style={{ height: '26px', borderRadius: '5px', fontSize: '10px', fontWeight: sel ? 700 : 400, cursor: 'pointer', border: 'none', backgroundColor: sel ? '#2c5545' : 'transparent', color: sel ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.1s' }}>
              {d}
            </button>
          )
        })}
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '8px' }}>
        <button type="button" onClick={() => days.forEach((d) => { if (!selected.includes(d)) onToggle(d) })}
          style={{ flex: 1, height: '24px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 600, cursor: 'pointer' }}>
          Todos
        </button>
        <button type="button" onClick={() => selected.forEach((d) => onToggle(d))}
          style={{ flex: 1, height: '24px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 600, cursor: 'pointer' }}>
          Limpar
        </button>
      </div>
      {selected.length > 0 && (
        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '6px' }}>
          {selected.length} {selected.length === 1 ? 'dia' : 'dias'} seleccionados
        </p>
      )}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function PBar({ p, color = '#2c5545' }: { p: number; color?: string }) {
  return (
    <div style={{ height: '2px', borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${p}%`, backgroundColor: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
    </div>
  )
}

// ─── Owner Column ─────────────────────────────────────────────────────────────

function OwnerColumn({ col, rank, metas, diasCount, flashId }: {
  col: OwnerCol; rank: number; metas: Metas; diasCount: number; flashId: string | null
}) {
  const color = hashColor(col.name)
  const fatPct = pct(col.faturamento, metas.faturamento)
  const venPct = pct(col.vendas, metas.vendas)
  const ligPct = pct(col.ligacoes, metas.ligacoes_dia * diasCount)
  const reuPct = pct(col.reunioes, metas.reunioes)
  const agePct = pct(col.agendamentos, metas.agendamentos)
  const hasFlash = col.wins.some((w) => w.id === flashId)

  const rankLabel = ['1º', '2º', '3º'][rank] ?? `${rank + 1}º`
  const rankColor = rank === 0 ? '#c89520' : rank === 1 ? '#8a9098' : rank === 2 ? '#9a6848' : 'rgba(255,255,255,0.2)'

  return (
    <div style={{
      flex: '0 0 200px',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      transition: 'background 0.3s',
      backgroundColor: hasFlash ? 'rgba(44,85,69,0.08)' : 'transparent',
    }}>
      {/* Col header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {col.initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#e8e4dc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name.split(' ')[0]}</p>
              <span style={{ fontSize: '9px', fontWeight: 800, color: rankColor }}>{rankLabel}</span>
            </div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</p>
          </div>
        </div>

        {/* Faturamento */}
        <p style={{ fontSize: '20px', fontWeight: 900, color: col.faturamento > 0 ? '#e8e4dc' : 'rgba(255,255,255,0.15)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '3px' }}>
          {fmtBRL(col.faturamento)}
        </p>
        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginBottom: '5px' }}>{fatPct}% da meta · {fmtK(metas.faturamento)}</p>
        <PBar p={fatPct} />
      </div>

      {/* KPI stats */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        {[
          { label: 'Vendas',    v: col.vendas,       meta: metas.vendas,                    p: venPct, color: '#4d7aa8' },
          { label: 'Ligações',  v: col.ligacoes,     meta: metas.ligacoes_dia * diasCount,  p: ligPct, color: '#0e7490' },
          { label: 'Reuniões',  v: col.reunioes,     meta: metas.reunioes,                  p: reuPct, color: '#7c5cbf' },
          { label: 'Agend.',    v: col.agendamentos, meta: metas.agendamentos,              p: agePct, color: '#a88030' },
        ].map((s) => (
          <div key={s.label}>
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1px' }}>{s.label}</p>
            <p style={{ fontSize: '14px', fontWeight: 800, color: s.p >= 100 ? '#2c5545' : s.color, lineHeight: 1 }}>{s.v}<span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>/{s.meta}</span></p>
            <PBar p={s.p} color={s.color} />
          </div>
        ))}
      </div>

      {/* Wins list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {col.wins.length === 0 ? (
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic', padding: '12px 14px' }}>Sem vendas no período</p>
        ) : col.wins.map((w, i) => (
          <div key={w.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            padding: '7px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            backgroundColor: w.id === flashId ? 'rgba(44,85,69,0.15)' : 'transparent',
            borderLeft: w.id === flashId ? '2px solid #2c5545' : '2px solid transparent',
            transition: 'all 0.3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
              <p style={{ fontSize: '11px', color: w.id === flashId ? '#e8e4dc' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.company}</p>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {w.id === flashId && <Zap style={{ width: '9px', height: '9px', color: '#2c5545' }} />}
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#2c5545' }}>{fmtBRL(w.valor)}</p>
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

  // Mode — default mensal para mostrar dados do mês inteiro ao abrir
  const [mode, setMode] = useState<Mode>('mensal')

  // Diário state
  const [currentDay, setCurrentDay] = useState(() => isoDate(today))

  // Mensal state
  const [calMonth,    setCalMonth]    = useState(today.getMonth())
  const [calYear,     setCalYear]     = useState(today.getFullYear())
  const [selDias,     setSelDias]     = useState<number[]>([])
  const [calOpen,     setCalOpen]     = useState(false)

  // Data
  const [owners,    setOwners]    = useState<OwnerCol[]>([])
  const [metas,     setMetas]     = useState<Metas>(DEFAULT_METAS)
  const [flashId,   setFlashId]   = useState<string | null>(null)
  const [recentWins, setRecentWins] = useState<{ id: string; owner: string; company: string; valor: number; at: string }[]>([])
  const [loading,   setLoading]   = useState(true)

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calRef     = useRef<HTMLDivElement>(null)

  // Load config from Supabase
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'desempenho_config').single()
      .then(({ data }) => {
        if (data?.value) {
          const v = data.value as { metas?: Partial<Metas>; range?: { mes?: number; ano?: number } }
          if (v.metas) setMetas({ ...DEFAULT_METAS, ...v.metas })
          if (v.range) { setCalMonth(v.range.mes ?? today.getMonth()); setCalYear(v.range.ano ?? today.getFullYear()) }
        }
      })
  }, [])

  // Close calendar on outside click
  useEffect(() => {
    if (!calOpen) return
    function handler(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [calOpen])

  // Compute date range
  const { since, until, diasCount, rangeLabel } = useMemo(() => {
    if (mode === 'diario') {
      const r = dayRange(currentDay)
      const d = new Date(currentDay)
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
      return { ...r, diasCount: 1, rangeLabel: label }
    }
    // mensal
    const r = monthRange(calYear, calMonth, selDias)
    const count = selDias.length || daysInMonth(calMonth, calYear)
    const label = selDias.length === 0
      ? `${MESES[calMonth]} ${calYear}`
      : selDias.length === 1
        ? `${selDias[0]} ${MESES_SHORT[calMonth]}`
        : `${selDias.length} dias — ${MESES_SHORT[calMonth]} ${calYear}`
    return { ...r, diasCount: count, rangeLabel: label }
  }, [mode, currentDay, calMonth, calYear, selDias])

  // Check if date is in selected range (for mensal day filter)
  function inRange(iso: string) {
    const d = new Date(iso)
    if (d < new Date(since) || d > new Date(until)) return false
    if (mode === 'mensal' && selDias.length > 0) return selDias.includes(d.getDate())
    return true
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: deals }, { data: activities }, { data: meetings }] = await Promise.all([
      supabase.from('deals').select('id,owner,owner_id,stage_id,value,updated_at,company_name').is('deleted_at', null),
      supabase.from('deal_activities').select('type,owner,created_at').gte('created_at', since).lte('created_at', until),
      supabase.from('deal_meetings').select('owner,scheduled_at,status').gte('scheduled_at', since).lte('scheduled_at', until),
    ])

    const wonInRange = (deals ?? []).filter((d) => d.stage_id === 'closed_won' && inRange(d.updated_at))
    const ownerMap: Record<string, OwnerCol> = {}

    function ensure(o: { id?: string; name?: string } | null, fid: string) {
      const id = o?.id ?? fid
      const name = o?.name ?? 'Desconhecido'
      if (!ownerMap[id]) ownerMap[id] = {
        id, name,
        initials: name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
        faturamento: 0, vendas: 0, ligacoes: 0, reunioes: 0, agendamentos: 0, wins: [],
      }
      return ownerMap[id]
    }

    wonInRange.forEach((d) => {
      const m = ensure(d.owner as { id?: string; name?: string } | null, d.owner_id)
      m.vendas++
      m.faturamento += Number(d.value) || 0
      m.wins.push({ id: d.id, company: d.company_name ?? '—', valor: Number(d.value) || 0, at: d.updated_at })
    })

    ;(activities ?? []).forEach((a) => {
      const o = a.owner as { id?: string } | null
      if (o?.id && ownerMap[o.id] && a.type === 'call') ownerMap[o.id].ligacoes++
    })

    ;(meetings ?? []).forEach((mt) => {
      const o = mt.owner as { id?: string } | null
      if (!o?.id || !ownerMap[o.id]) return
      if (['realizada', 'confirmada'].includes(mt.status)) ownerMap[o.id].reunioes++
      else ownerMap[o.id].agendamentos++
    })

    Object.values(ownerMap).forEach((col) => col.wins.sort((a, b) => b.at.localeCompare(a.at)))

    const sorted = Object.values(ownerMap).sort((a, b) => b.faturamento - a.faturamento)
    setOwners(sorted)

    // recent wins feed (last 10)
    const allWins = wonInRange
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 10)
      .map((d) => ({
        id: d.id,
        owner: (d.owner as { name?: string } | null)?.name ?? '?',
        company: d.company_name ?? '—',
        valor: Number(d.value) || 0,
        at: d.updated_at,
      }))
    setRecentWins(allWins)

    setLoading(false)
  }, [since, until])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('performance-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, (payload) => {
        const d = payload.new as { id: string; stage_id: string; company_name: string; owner: { name?: string } | null; value: number; updated_at: string }
        if (d.stage_id !== 'closed_won') return
        setFlashId(d.id)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlashId(null), 5000)
        setRecentWins((prev) => [{ id: d.id, owner: d.owner?.name ?? '?', company: d.company_name ?? '—', valor: Number(d.value) || 0, at: d.updated_at }, ...prev].slice(0, 10))
        load()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deal_meetings' }, () => { load() })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [load])

  const totals = useMemo(() => ({
    faturamento: owners.reduce((s, o) => s + o.faturamento, 0),
    vendas:      owners.reduce((s, o) => s + o.vendas, 0),
    ligacoes:    owners.reduce((s, o) => s + o.ligacoes, 0),
    reunioes:    owners.reduce((s, o) => s + o.reunioes, 0),
  }), [owners])

  function prevDay() {
    const d = new Date(currentDay)
    d.setDate(d.getDate() - 1)
    setCurrentDay(isoDate(d))
  }
  function nextDay() {
    const d = new Date(currentDay)
    d.setDate(d.getDate() + 1)
    if (d <= today) setCurrentDay(isoDate(d))
  }
  const isToday = currentDay === isoDate(today)

  function toggleDia(d: number) {
    setSelDias((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b))
  }

  // Mensal label short
  const mensalBtnLabel = selDias.length === 0
    ? `${MESES_SHORT[calMonth]} ${calYear}`
    : selDias.length === 1
      ? `${selDias[0]} ${MESES_SHORT[calMonth]}`
      : `${selDias.length} dias`

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#0d0c0a',
      display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>

      {/* ─── HEADER ─────────────────────────────────────── */}
      <div style={{
        height: '52px', flexShrink: 0,
        backgroundColor: '#111110',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: '20px',
      }}>
        {/* Title */}
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: '11px', fontWeight: 900, color: '#e8e4dc', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Performance</p>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '2px', borderRadius: '8px', flexShrink: 0 }}>
          {(['diario', 'mensal'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              style={{ height: '26px', padding: '0 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.12s', backgroundColor: mode === m ? '#1e1e1c' : 'transparent', color: mode === m ? '#e8e4dc' : 'rgba(255,255,255,0.3)' }}>
              {m === 'diario' ? 'Diário' : 'Mensal'}
            </button>
          ))}
        </div>

        {/* Date control */}
        {mode === 'diario' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            <button type="button" onClick={prevDay}
              style={{ width: '26px', height: '26px', border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
              <ChevronLeft style={{ width: '13px', height: '13px' }} />
            </button>
            <button type="button" onClick={() => setCurrentDay(isoDate(today))}
              style={{ height: '26px', padding: '0 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: isToday ? 'rgba(44,85,69,0.15)' : 'transparent', color: isToday ? '#2c5545' : 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {rangeLabel}
            </button>
            <button type="button" onClick={nextDay} disabled={isToday}
              style={{ width: '26px', height: '26px', border: 'none', background: 'none', cursor: isToday ? 'default' : 'pointer', color: isToday ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
              <ChevronRight style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        ) : (
          <div ref={calRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button type="button" onClick={() => setCalOpen((v) => !v)}
              style={{ height: '26px', padding: '0 12px', borderRadius: '6px', border: `1px solid ${calOpen ? 'rgba(44,85,69,0.6)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: selDias.length > 0 ? 'rgba(44,85,69,0.12)' : 'transparent', color: selDias.length > 0 ? '#2c5545' : 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {mensalBtnLabel}
              <ChevronLeft style={{ width: '11px', height: '11px', transform: calOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
            </button>
            {calOpen && (
              <MiniCalendar
                year={calYear} month={calMonth}
                selected={selDias}
                onToggle={toggleDia}
                onPrevMonth={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1) }
                  else setCalMonth((m) => m - 1)
                  setSelDias([])
                }}
                onNextMonth={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1) }
                  else setCalMonth((m) => m + 1)
                  setSelDias([])
                }}
              />
            )}
          </div>
        )}

        {/* KPI totals */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '32px' }}>
          {[
            { label: 'Faturamento', value: fmtBRL(totals.faturamento), p: pct(totals.faturamento, metas.faturamento), color: '#e8e4dc' },
            { label: 'Vendas',      value: String(totals.vendas),       p: pct(totals.vendas, metas.vendas),           color: '#e8e4dc' },
            { label: 'Ligações',    value: String(totals.ligacoes),     p: pct(totals.ligacoes, metas.ligacoes_dia * diasCount), color: '#e8e4dc' },
            { label: 'Reuniões',    value: String(totals.reunioes),     p: pct(totals.reunioes, metas.reunioes),       color: '#e8e4dc' },
          ].map((k) => (
            <div key={k.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0px' }}>{k.label}</p>
              <p style={{ fontSize: '16px', fontWeight: 900, color: k.color, lineHeight: 1.1, letterSpacing: '-0.04em' }}>{k.value}</p>
              <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{k.p}% da meta</p>
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

      {/* ─── BODY ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Columns */}
        <div style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)', borderTopColor: '#2c5545', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>A carregar dados...</p>
              </div>
            </div>
          ) : owners.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>Sem dados no período</p>
            </div>
          ) : (
            owners.map((col, rank) => (
              <OwnerColumn key={col.id} col={col} rank={rank} metas={metas} diasCount={diasCount} flashId={flashId} />
            ))
          )}
        </div>

        {/* Right: feed ao vivo */}
        <div style={{
          width: '240px', flexShrink: 0,
          backgroundColor: '#111110',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2c5545', animation: 'pulse 2s infinite' }} />
              <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vendas Recentes</p>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {recentWins.length === 0 ? (
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic', padding: '14px' }}>Aguardando...</p>
            ) : recentWins.map((w, i) => (
              <div key={`${w.id}-${i}`} style={{
                padding: '9px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                borderLeft: w.id === flashId ? '2px solid #2c5545' : '2px solid transparent',
                backgroundColor: w.id === flashId ? 'rgba(44,85,69,0.1)' : 'transparent',
                transition: 'all 0.3s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: w.id === flashId ? '#e8e4dc' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.company}</p>
                    <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>{w.owner}</p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {w.id === flashId && <Zap style={{ width: '9px', height: '9px', color: '#2c5545', display: 'block', margin: '0 auto 2px' }} />}
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#2c5545' }}>{fmtBRL(w.valor)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer totals */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 14px' }}>
            {[
              { label: 'Total faturado',    value: fmtBRL(totals.faturamento), p: pct(totals.faturamento, metas.faturamento), color: '#2c5545' },
              { label: 'Vendas realizadas', value: `${totals.vendas} / ${metas.vendas}`, p: pct(totals.vendas, metas.vendas), color: '#4d7aa8' },
              { label: 'Reuniões',          value: `${totals.reunioes} / ${metas.reunioes}`, p: pct(totals.reunioes, metas.reunioes), color: '#7c5cbf' },
            ].map((t) => (
              <div key={t.label} style={{ marginBottom: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>{t.label}</span>
                  <span style={{ fontSize: '9px', color: t.color, fontWeight: 700 }}>{t.value}</span>
                </div>
                <PBar p={t.p} color={t.color} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { width:3px; height:3px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:3px }
      `}</style>
    </div>
  )
}
