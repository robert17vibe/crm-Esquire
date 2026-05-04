import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Zap, Tv2, RefreshCw } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metas {
  faturamento: number
  ligacoes_dia: number
  reunioes: number
  agendamentos: number
  vendas: number
}

interface DateRange { dias: number[]; mes: number; ano: number }

interface Config { metas: Metas; range: DateRange }

interface OwnerCol {
  id: string
  name: string
  initials: string
  color: string
  faturamento: number
  vendas: number
  ligacoes: number
  reunioes: number
  agendamentos: number
  wins: { id: string; company: string; valor: number; at: string }[]
}

interface FlashWin { id: string; company: string; owner: string; valor: number; at: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(1)}k`
  return `R$${n.toFixed(0)}`
}

function fmtBRLShort(v: number) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(0)}k`
  return `R$${n.toFixed(0)}`
}

function hashColor(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return { bg: `hsl(${hue},45%,30%)`, ring: `hsl(${hue},45%,50%)` }
}

function pct(atual: number, meta: number) {
  if (!meta) return 0
  return Math.min(100, Math.round((atual / meta) * 100))
}

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function daysInMonth(mes: number, ano: number) { return new Date(ano, mes + 1, 0).getDate() }

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const DEFAULT_CONFIG: Config = {
  metas: { faturamento: 5_000_000, ligacoes_dia: 50, reunioes: 10, agendamentos: 10, vendas: 20 },
  range: { dias: [], mes: new Date().getMonth(), ano: new Date().getFullYear() },
}

// ─── Mini progress dots ───────────────────────────────────────────────────────

function ProgressDots({ p, color }: { p: number; color: string }) {
  const total = 10
  const filled = Math.round((p / 100) * total)
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: '5px', height: '5px', borderRadius: '50%',
          backgroundColor: i < filled ? color : 'rgba(255,255,255,0.1)',
          transition: 'background-color 0.3s',
        }} />
      ))}
      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>{p}%</span>
    </div>
  )
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────

function MiniBar({ p, color }: { p: number; color: string }) {
  return (
    <div style={{ height: '3px', borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: '3px' }}>
      <div style={{ height: '100%', width: `${p}%`, backgroundColor: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
      {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

// ─── Owner Column ─────────────────────────────────────────────────────────────

function OwnerColumn({ col, metas, diasCount, rank, flashId }: {
  col: OwnerCol
  metas: Metas
  diasCount: number
  rank: number
  flashId: string | null
}) {
  const colors = hashColor(col.name)
  const fatPct = pct(col.faturamento, metas.faturamento)
  const venPct = pct(col.vendas, metas.vendas)
  const ligPct = pct(col.ligacoes, metas.ligacoes_dia * diasCount)
  const reuPct = pct(col.reunioes, metas.reunioes)

  const rankColors = ['#c89520', '#8a9098', '#9a6848', 'rgba(255,255,255,0.2)']
  const rankColor  = rankColors[Math.min(rank, 3)]

  const hasFlash = col.wins.some((w) => w.id === flashId)

  const barData = [
    { name: 'Fat', value: fatPct, fill: '#2a9a5a' },
    { name: 'Ven', value: venPct, fill: '#4d7aa8' },
    { name: 'Lig', value: ligPct, fill: '#0e7490' },
    { name: 'Reu', value: reuPct, fill: '#7c5cbf' },
  ]

  return (
    <div style={{
      flex: '0 0 220px',
      display: 'flex', flexDirection: 'column',
      backgroundColor: hasFlash ? 'rgba(42,154,90,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${hasFlash ? 'rgba(42,154,90,0.4)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '14px',
      overflow: 'hidden',
      transition: 'all 0.4s ease',
    }}>

      {/* Column header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          {/* Rank badge */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: colors.bg,
              border: `2px solid ${colors.ring}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 800, color: '#fff',
              boxShadow: `0 0 12px ${colors.ring}40`,
            }}>
              {col.initials}
            </div>
            <div style={{
              position: 'absolute', bottom: '-3px', right: '-3px',
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: rankColor, border: '2px solid #0d0c0a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '8px', fontWeight: 800, color: '#fff',
            }}>
              {rank + 1}
            </div>
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name.split(' ')[0]}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</p>
          </div>
        </div>

        {/* Faturamento destaque */}
        <p style={{ fontSize: '22px', fontWeight: 900, color: col.faturamento > 0 ? '#2a9a5a' : 'rgba(255,255,255,0.2)', letterSpacing: '-0.04em', lineHeight: 1 }}>
          {fmtBRLShort(col.faturamento)}
        </p>
        <ProgressDots p={fatPct} color="#2a9a5a" />

        {/* Mini bar chart */}
        <div style={{ marginTop: '10px', height: '36px' }}>
          <ResponsiveContainer width="100%" height={36}>
            <BarChart data={barData} barCategoryGap="15%" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {barData.map((entry, idx) => <Cell key={idx} fill={entry.fill} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '2px' }}>
            {['Fat', 'Ven', 'Lig', 'Reu'].map((l) => (
              <span key={l} style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
        {[
          { label: 'Vendas',   value: col.vendas,      meta: metas.vendas,             color: '#4d7aa8', p: venPct },
          { label: 'Ligações', value: col.ligacoes,    meta: metas.ligacoes_dia * diasCount, color: '#0e7490', p: ligPct },
          { label: 'Reuniões', value: col.reunioes,    meta: metas.reunioes,           color: '#7c5cbf', p: reuPct },
          { label: 'Agend.',   value: col.agendamentos, meta: metas.agendamentos,      color: '#a88030', p: pct(col.agendamentos, metas.agendamentos) },
        ].map((s) => (
          <div key={s.label} style={{ padding: '8px 10px', backgroundColor: '#0d0c0a' }}>
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>{s.label}</p>
            <p style={{ fontSize: '16px', fontWeight: 800, color: s.p >= 100 ? '#2a9a5a' : s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>/{s.meta}</p>
            <MiniBar p={s.p} color={s.color} />
          </div>
        ))}
      </div>

      {/* Wins list */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '10px 0' }}>
        {col.wins.length === 0 ? (
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', padding: '8px 16px' }}>Sem vendas no período</p>
        ) : col.wins.map((w) => (
          <div key={w.id} style={{
            padding: '7px 14px',
            backgroundColor: w.id === flashId ? 'rgba(42,154,90,0.12)' : 'transparent',
            borderLeft: w.id === flashId ? '3px solid #2a9a5a' : '3px solid transparent',
            transition: 'all 0.3s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: w.id === flashId ? '#2a9a5a' : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.company}</p>
                <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>{relTime(w.at)}</p>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {w.id === flashId && <Zap style={{ width: '10px', height: '10px', color: '#2a9a5a' }} />}
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#2a9a5a' }}>{fmtBRLShort(w.valor)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TvPerformancePage() {
  const [config,   setConfig]   = useState<Config>(DEFAULT_CONFIG)
  const [owners,   setOwners]   = useState<OwnerCol[]>([])
  const [flashWins, setFlashWins] = useState<FlashWin[]>([])
  const [flashId,  setFlashId]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [lastSync, setLastSync] = useState<Date>(new Date())
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load config from Supabase
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'desempenho_config').single()
      .then(({ data }) => {
        if (data?.value) {
          const v = data.value as Partial<Config>
          setConfig({
            metas: { ...DEFAULT_CONFIG.metas, ...(v.metas ?? {}) },
            range: { ...DEFAULT_CONFIG.range, ...(v.range ?? {}) },
          })
        }
      })
  }, [])

  const { since, until } = useMemo(() => {
    const { dias, mes, ano } = config.range
    if (dias.length === 0) return {
      since: new Date(ano, mes, 1).toISOString(),
      until: new Date(ano, mes + 1, 0, 23, 59, 59).toISOString(),
    }
    const min = Math.min(...dias)
    const max = Math.max(...dias)
    return {
      since: new Date(ano, mes, min).toISOString(),
      until: new Date(ano, mes, max, 23, 59, 59).toISOString(),
    }
  }, [config.range])

  const diasSet   = useMemo(() => new Set(config.range.dias), [config.range.dias])
  const diasCount = config.range.dias.length || daysInMonth(config.range.mes, config.range.ano)

  function inRange(iso: string) {
    const d = new Date(iso)
    if (d < new Date(since) || d > new Date(until)) return false
    if (diasSet.size === 0) return true
    return diasSet.has(d.getDate())
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

    function ensure(o: { id?: string; name?: string; avatar_color?: string } | null, fid: string) {
      const id = o?.id ?? fid
      const name = o?.name ?? 'Desconhecido'
      if (!ownerMap[id]) {
        const c = hashColor(name)
        ownerMap[id] = {
          id, name,
          initials: name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
          color: c.bg,
          faturamento: 0, vendas: 0, ligacoes: 0, reunioes: 0, agendamentos: 0,
          wins: [],
        }
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

    // Sort wins per owner by date desc (most recent first)
    Object.values(ownerMap).forEach((col) => {
      col.wins.sort((a, b) => b.at.localeCompare(a.at))
    })

    setOwners(Object.values(ownerMap).sort((a, b) => b.faturamento - a.faturamento))
    setLastSync(new Date())
    setLoading(false)
  }, [since, until, diasSet])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel('tv-performance-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, (payload) => {
        const d = payload.new as {
          id: string; stage_id: string; company_name: string
          owner: { name?: string; id?: string } | null
          value: number; updated_at: string
        }
        if (d.stage_id !== 'closed_won') return

        const win: FlashWin = {
          id: d.id, company: d.company_name ?? '—',
          owner: d.owner?.name ?? '?',
          valor: Number(d.value) || 0, at: d.updated_at,
        }

        setFlashWins((prev) => [win, ...prev].slice(0, 8))
        setFlashId(d.id)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlashId(null), 5000)

        load()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deal_meetings' }, () => {
        load()
      })
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

  const { metas } = config

  const rangeLabel = (() => {
    const { dias, mes, ano } = config.range
    if (dias.length === 0) return `${MESES[mes]} ${ano}`
    if (dias.length === 1) return `${dias[0]} ${MESES[mes]} ${ano}`
    return `${dias[0]}–${dias[dias.length - 1]} ${MESES[mes]} ${ano}`
  })()

  const fatTotal = pct(totals.faturamento, metas.faturamento)

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0d0c0a',
      display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* ── Header ── */}
      <div style={{
        backgroundColor: '#111110',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        height: '60px',
        display: 'flex', alignItems: 'center', gap: '24px',
        flexShrink: 0,
      }}>
        {/* Logo / título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#2c5545', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tv2 style={{ width: '14px', height: '14px', color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Performance</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>{rangeLabel}</p>
          </div>
        </div>

        {/* KPI summary */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '40px' }}>
          {[
            { label: 'Faturamento', value: fmtBRL(totals.faturamento), sub: `${fatTotal}% da meta`, color: '#2a9a5a' },
            { label: 'Vendas',      value: String(totals.vendas),       sub: `/${metas.vendas}`,     color: '#4d7aa8' },
            { label: 'Ligações',    value: String(totals.ligacoes),     sub: `${metas.ligacoes_dia}/dia`, color: '#0e7490' },
            { label: 'Reuniões',    value: String(totals.reunioes),     sub: `/${metas.reunioes}`,   color: '#7c5cbf' },
          ].map((k) => (
            <div key={k.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>{k.label}</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: k.color, lineHeight: 1, letterSpacing: '-0.04em' }}>{k.value}</p>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Right: live indicator + clock + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#2a9a5a', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>AO VIVO</span>
          </div>
          <Clock />
          <button type="button" onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', padding: '0 10px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            <RefreshCw style={{ width: '10px', height: '10px' }} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Owner columns */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#2c5545', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Carregando dados...</p>
              </div>
            </div>
          ) : owners.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Sem dados no período seleccionado</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', minHeight: '100%', alignItems: 'flex-start' }}>
              {owners.map((col, rank) => (
                <OwnerColumn key={col.id} col={col} metas={metas} diasCount={diasCount} rank={rank} flashId={flashId} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel: live feed ── */}
        <div style={{
          width: '280px', flexShrink: 0,
          backgroundColor: '#111110',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Feed header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#2a9a5a', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vendas ao Vivo</p>
            </div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '3px' }}>
              Actualizado {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Feed list */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {flashWins.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Aguardando vendas...</p>
              </div>
            ) : flashWins.map((w, i) => (
              <div key={`${w.id}-${i}`} style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                backgroundColor: w.id === flashId ? 'rgba(42,154,90,0.08)' : 'transparent',
                borderLeft: w.id === flashId ? '3px solid #2a9a5a' : '3px solid transparent',
                transition: 'all 0.4s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: w.id === flashId ? '#2a9a5a' : 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.company}</p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{w.owner}</p>
                    <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '1px' }}>{relTime(w.at)}</p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {w.id === flashId && <Zap style={{ width: '12px', height: '12px', color: '#2a9a5a', display: 'block', margin: '0 auto 2px' }} />}
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#2a9a5a' }}>{fmtBRLShort(w.valor)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer totals */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px' }}>
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Totais do Período</p>
            {[
              { label: 'Faturamento', value: fmtBRL(totals.faturamento), meta: fmtBRLShort(metas.faturamento), p: fatTotal, color: '#2a9a5a' },
              { label: 'Vendas',      value: String(totals.vendas),       meta: String(metas.vendas),           p: pct(totals.vendas, metas.vendas), color: '#4d7aa8' },
              { label: 'Reuniões',    value: String(totals.reunioes),     meta: String(metas.reunioes),         p: pct(totals.reunioes, metas.reunioes), color: '#7c5cbf' },
            ].map((t) => (
              <div key={t.label} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{t.label}</span>
                  <span style={{ fontSize: '10px', color: t.color, fontWeight: 700 }}>{t.value} <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>/{t.meta}</span></span>
                </div>
                <MiniBar p={t.p} color={t.color} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  )
}
