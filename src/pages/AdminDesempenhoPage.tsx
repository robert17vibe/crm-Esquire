import { useState, useEffect, useMemo, useCallback } from 'react'
import { Settings, Users, RefreshCw, Check, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, Tooltip as RTooltip } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/store/useThemeStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metas {
  faturamento: number
  ligacoes_dia: number
  reunioes: number
  agendamentos: number
  vendas: number
}

interface DateRange {
  dias: number[]   // dias do mês seleccionados, ex: [1,2,3,10,24,25]
  mes: number      // 0-11
  ano: number
}

interface Config {
  metas: Metas
  range: DateRange
}

interface OwnerMetrics {
  id: string
  name: string
  initials: string
  color: string
  faturamento: number
  vendas: number
  ligacoes: number
  reunioes: number
  agendamentos: number
}

interface DailyPoint { day: number; valor: number; qtd: number }

interface RecentWin {
  id: string; company: string; owner: string; valor: number; at: string
}

const LS_CONFIG = 'esq_desempenho_config_v2'

const DEFAULT_CONFIG: Config = {
  metas: { faturamento: 5_000_000, ligacoes_dia: 50, reunioes: 10, agendamentos: 10, vendas: 20 },
  range: { dias: [], mes: new Date().getMonth(), ano: new Date().getFullYear() },
}

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

function pct(atual: number, meta: number) {
  if (!meta) return 0
  return Math.min(100, Math.round((atual / meta) * 100))
}

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function daysInMonth(mes: number, ano: number) {
  return new Date(ano, mes + 1, 0).getDate()
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function loadConfig(): Config {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_CONFIG) ?? '{}')
    return {
      metas: { ...DEFAULT_CONFIG.metas, ...(saved.metas ?? {}) },
      range: { ...DEFAULT_CONFIG.range, ...(saved.range ?? {}) },
    }
  } catch { return DEFAULT_CONFIG }
}

function saveConfig(c: Config) {
  localStorage.setItem(LS_CONFIG, JSON.stringify(c))
}

// ─── Mini Progress Bar ────────────────────────────────────────────────────────

function Bar2({ p, color }: { p: number; color: string }) {
  return (
    <div style={{ height: '4px', borderRadius: 99, backgroundColor: `${color}20`, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${p}%`, backgroundColor: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
    </div>
  )
}

// ─── Day Picker ───────────────────────────────────────────────────────────────

function DayPicker({ range, onChange, border, text, muted, faint }: {
  range: DateRange
  onChange: (r: DateRange) => void
  border: string; text: string; muted: string; faint: string
}) {
  const total = daysInMonth(range.mes, range.ano)
  const days  = Array.from({ length: total }, (_, i) => i + 1)
  function toggleDay(d: number) {
    const next = range.dias.includes(d)
      ? range.dias.filter((x) => x !== d)
      : [...range.dias, d].sort((a, b) => a - b)
    onChange({ ...range, dias: next })
  }

  function prevMes() {
    const m = range.mes === 0 ? 11 : range.mes - 1
    const a = range.mes === 0 ? range.ano - 1 : range.ano
    onChange({ ...range, mes: m, ano: a, dias: [] })
  }
  function nextMes() {
    const m = range.mes === 11 ? 0 : range.mes + 1
    const a = range.mes === 11 ? range.ano + 1 : range.ano
    onChange({ ...range, mes: m, ano: a, dias: [] })
  }

  function selectAll() { onChange({ ...range, dias: days }) }
  function clearAll()  { onChange({ ...range, dias: [] }) }

  const label = range.dias.length === 0
    ? 'Mês inteiro'
    : range.dias.length === 1
      ? `Dia ${range.dias[0]}`
      : `${range.dias.length} dias seleccionados`

  return (
    <div>
      {/* Mês nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button type="button" onClick={prevMes} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 6px' }}>
          <ChevronLeft style={{ width: '14px', height: '14px' }} />
        </button>
        <span style={{ fontSize: '12px', fontWeight: 700, color: text }}>{MESES[range.mes]} {range.ano}</span>
        <button type="button" onClick={nextMes} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 6px' }}>
          <ChevronRight style={{ width: '14px', height: '14px' }} />
        </button>
      </div>

      {/* Grid de dias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '10px' }}>
        {days.map((d) => {
          const sel = range.dias.includes(d)
          return (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              style={{
                height: '30px', borderRadius: '6px', fontSize: '11px', fontWeight: sel ? 700 : 400,
                cursor: 'pointer', border: `1px solid ${sel ? '#2c5545' : border}`,
                backgroundColor: sel ? '#2c5545' : faint,
                color: sel ? '#fff' : text,
                transition: 'all 0.1s',
              }}>
              {d}
            </button>
          )
        })}
      </div>

      {/* Acções rápidas */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: muted }}>{label}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={clearAll}
            style={{ fontSize: '10px', fontWeight: 600, color: muted, background: 'none', border: `1px solid ${border}`, borderRadius: '5px', padding: '3px 8px', cursor: 'pointer' }}>
            Limpar
          </button>
          <button type="button" onClick={selectAll}
            style={{ fontSize: '10px', fontWeight: 600, color: '#2c5545', background: 'none', border: '1px solid #2c5545', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer' }}>
            Todos
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel de Configuração (lado esquerdo) ───────────────────────────────────

function ConfigPanel({ config, onChange, isDark, border, text, muted }: {
  config: Config
  onChange: (c: Config) => void
  isDark: boolean; border: string; text: string; muted: string
}) {
  const [draft, setDraft] = useState<Config>(config)
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const inputBg = isDark ? '#161614' : '#f8f7f4'
  const saved   = JSON.stringify(draft) === JSON.stringify(config)

  function save() { saveConfig(draft); onChange(draft) }

  const metaFields: { key: keyof Metas; label: string; desc: string; prefix?: string }[] = [
    { key: 'faturamento',   label: 'Meta de Faturamento',       desc: 'Total de receita no período',         prefix: 'R$' },
    { key: 'vendas',        label: 'Meta de Vendas',            desc: 'Nº de deals ganhos' },
    { key: 'ligacoes_dia',  label: 'Ligações por Dia',          desc: 'Mínimo diário por responsável' },
    { key: 'reunioes',      label: 'Meta de Reuniões',          desc: 'Reuniões realizadas no período' },
    { key: 'agendamentos',  label: 'Meta de Agendamentos',      desc: 'Reuniões agendadas no período' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Metas */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '4px' }}>Metas do Período</p>
        <p style={{ fontSize: '11px', color: muted, marginBottom: '18px' }}>Valores que a equipa deve atingir</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {metaFields.map(({ key, label, desc, prefix }) => (
            <div key={key}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '2px' }}>{label}</label>
              <p style={{ fontSize: '10px', color: muted, marginBottom: '6px' }}>{desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {prefix && <span style={{ fontSize: '12px', color: muted }}>{prefix}</span>}
                <input
                  type="number" min={0}
                  value={draft.metas[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, metas: { ...d.metas, [key]: Number(e.target.value) } }))}
                  style={{ flex: 1, height: '34px', padding: '0 10px', fontSize: '13px', fontWeight: 600, color: text, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Período */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '4px' }}>Período de Análise</p>
        <p style={{ fontSize: '11px', color: muted, marginBottom: '16px' }}>Selecciona os dias que contam para as métricas. Sem selecção = mês inteiro.</p>
        <DayPicker
          range={draft.range}
          onChange={(r) => setDraft((d) => ({ ...d, range: r }))}
          border={border} text={text} muted={muted} faint={isDark ? '#1a1a18' : '#f5f4f0'}
        />
      </div>

      {/* Guardar */}
      <button type="button" onClick={save} disabled={saved}
        style={{ height: '40px', borderRadius: '10px', border: 'none', backgroundColor: saved ? (isDark ? '#1a1a18' : '#e8e6e2') : '#2c5545', color: saved ? muted : '#fff', fontSize: '13px', fontWeight: 700, cursor: saved ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        {saved ? <><Check style={{ width: '13px', height: '13px' }} /> Guardado</> : 'Aplicar Configuração'}
      </button>
    </div>
  )
}

// ─── Painel Público (equipa) ──────────────────────────────────────────────────

function TeamPanel({ config, isDark, border, text, muted }: {
  config: Config
  isDark: boolean; border: string; text: string; muted: string
}) {
  const cardBg = isDark ? '#111110' : '#ffffff'

  const [owners,     setOwners]     = useState<OwnerMetrics[]>([])
  const [daily,      setDaily]      = useState<DailyPoint[]>([])
  const [recentWins, setRecentWins] = useState<RecentWin[]>([])
  const [newWinId,   setNewWinId]   = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)

  // Calcula o intervalo de datas a partir do config
  const { since, until } = useMemo(() => {
    const { dias, mes, ano } = config.range
    if (dias.length === 0) {
      // mês inteiro
      return {
        since: new Date(ano, mes, 1).toISOString(),
        until: new Date(ano, mes + 1, 0, 23, 59, 59).toISOString(),
      }
    }
    const min = Math.min(...dias)
    const max = Math.max(...dias)
    return {
      since: new Date(ano, mes, min).toISOString(),
      until: new Date(ano, mes, max, 23, 59, 59).toISOString(),
    }
  }, [config.range])

  // Dias seleccionados como Set para filtrar
  const diasSet = useMemo(() => new Set(config.range.dias), [config.range.dias])

  function inRange(iso: string) {
    const d = new Date(iso)
    if (d < new Date(since) || d > new Date(until)) return false
    if (diasSet.size === 0) return true
    return diasSet.has(d.getDate())
  }

  const load = useCallback(async () => {
    setLoading(true)

    const [{ data: deals }, { data: activities }, { data: meetings }] = await Promise.all([
      supabase.from('deals').select('id,owner,owner_id,stage_id,value,updated_at,created_at,company_name').is('deleted_at', null),
      supabase.from('deal_activities').select('type,owner,created_at').gte('created_at', since).lte('created_at', until),
      supabase.from('deal_meetings').select('owner,scheduled_at,status').gte('scheduled_at', since).lte('scheduled_at', until),
    ])

    const wonInRange  = (deals ?? []).filter((d) => d.stage_id === 'closed_won' && inRange(d.updated_at))
    const allWon      = (deals ?? []).filter((d) => d.stage_id === 'closed_won')

    // Daily series
    const { mes, ano, dias } = config.range
    const totalDays = dias.length > 0 ? dias : Array.from({ length: daysInMonth(mes, ano) }, (_, i) => i + 1)
    const dayMap: Record<number, DailyPoint> = {}
    totalDays.forEach((d) => { dayMap[d] = { day: d, valor: 0, qtd: 0 } })
    wonInRange.forEach((d) => {
      const day = new Date(d.updated_at).getDate()
      if (dayMap[day]) { dayMap[day].valor += Number(d.value) || 0; dayMap[day].qtd++ }
    })
    setDaily(Object.values(dayMap).sort((a, b) => a.day - b.day))

    // Recent wins
    const sorted = wonInRange.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6)
    setRecentWins(sorted.map((d) => ({
      id: d.id, company: d.company_name ?? '—',
      owner: (d.owner as { name?: string } | null)?.name ?? '?',
      valor: Number(d.value) || 0, at: d.updated_at,
    })))

    // Per-owner
    const ownerMap: Record<string, OwnerMetrics> = {}
    const ensure = (o: { id?: string; name?: string; avatar_color?: string } | null, fid: string) => {
      const id = o?.id ?? fid; const name = o?.name ?? 'Desconhecido'
      if (!ownerMap[id]) ownerMap[id] = { id, name, initials: name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(), color: o?.avatar_color ?? hashColor(name), faturamento: 0, vendas: 0, ligacoes: 0, reunioes: 0, agendamentos: 0 }
      return ownerMap[id]
    }

    wonInRange.forEach((d) => { const m = ensure(d.owner as { id?: string; name?: string; avatar_color?: string } | null, d.owner_id); m.vendas++; m.faturamento += Number(d.value) || 0 })
    ;(activities ?? []).forEach((a) => { const o = a.owner as { id?: string } | null; if (!o?.id || !ownerMap[o.id]) return; if (a.type === 'call') ownerMap[o.id].ligacoes++ })
    ;(meetings ?? []).forEach((mt) => {
      const o = mt.owner as { id?: string } | null; if (!o?.id) return
      const m = ownerMap[o.id]; if (!m) return
      if (['realizada','confirmada'].includes(mt.status)) m.reunioes++
      else m.agendamentos++
    })

    // Ensure all won owners exist even without period activity
    allWon.forEach((d) => ensure(d.owner as { id?: string; name?: string; avatar_color?: string } | null, d.owner_id))

    // Win rate not needed per owner here — focus on period metrics
    setOwners(Object.values(ownerMap).sort((a, b) => b.faturamento - a.faturamento))
    setLoading(false)
  }, [since, until, diasSet])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('desempenho-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, (payload) => {
        const d = payload.new as { stage_id: string; id: string; company_name: string; owner: { name?: string } | null; value: number; updated_at: string }
        if (d.stage_id !== 'closed_won') return
        setNewWinId(d.id)
        setTimeout(() => setNewWinId(null), 4000)
        setRecentWins((prev) => [{ id: d.id, company: d.company_name ?? '—', owner: d.owner?.name ?? '?', valor: Number(d.value) || 0, at: d.updated_at }, ...prev].slice(0, 6))
        load()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const totals = useMemo(() => ({
    faturamento: owners.reduce((s, o) => s + o.faturamento, 0),
    vendas:      owners.reduce((s, o) => s + o.vendas, 0),
    ligacoes:    owners.reduce((s, o) => s + o.ligacoes, 0),
    reunioes:    owners.reduce((s, o) => s + o.reunioes, 0),
  }), [owners])

  const { metas } = config
  const diasCount = config.range.dias.length || daysInMonth(config.range.mes, config.range.ano)

  const kpis = [
    { label: 'Faturamento',  value: fmtBRL(totals.faturamento),    meta: fmtBRL(metas.faturamento),   p: pct(totals.faturamento, metas.faturamento),   color: '#2a9a5a' },
    { label: 'Vendas',       value: String(totals.vendas),          meta: String(metas.vendas),         p: pct(totals.vendas, metas.vendas),             color: '#4d7aa8' },
    { label: 'Ligações',     value: String(totals.ligacoes),        meta: `${metas.ligacoes_dia}/dia`,  p: pct(totals.ligacoes, metas.ligacoes_dia * diasCount), color: '#0e7490' },
    { label: 'Reuniões',     value: String(totals.reunioes),        meta: String(metas.reunioes),       p: pct(totals.reunioes, metas.reunioes),         color: '#7c5cbf' },
  ]

  const rangeLabel = (() => {
    const { dias, mes, ano } = config.range
    if (dias.length === 0) return `${MESES[mes]} ${ano} — Mês inteiro`
    if (dias.length === 1) return `Dia ${dias[0]} de ${MESES[mes]}`
    return `${dias.length} dias de ${MESES[mes]} ${ano}`
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Período activo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2a9a5a', boxShadow: '0 0 0 3px rgba(42,154,90,0.2)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: muted }}>{rangeLabel}</span>
        </div>
        <button type="button" onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', padding: '0 10px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw style={{ width: '11px', height: '11px' }} /> Actualizar
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{k.label}</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: k.color, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '10px' }}>{k.value}</p>
            <Bar2 p={k.p} color={k.color} />
            <p style={{ fontSize: '10px', color: muted, marginTop: '5px' }}>{k.p}% · Meta: {k.meta}</p>
          </div>
        ))}
      </div>

      {/* Gráfico + feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '14px' }}>

        {/* Gráfico diário */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Faturamento por Dia</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#2a9a5a' }}>{fmtBRL(totals.faturamento)}</p>
          </div>
          {loading ? (
            <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: '12px', color: muted }}>Carregando...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <RTooltip contentStyle={{ backgroundColor: isDark ? '#161614' : '#fff', border: `1px solid ${border}`, borderRadius: '8px', fontSize: '11px' }}
                  formatter={(v: unknown) => [fmtBRL(Number(v)), 'Faturamento']}
                  labelFormatter={(l: unknown) => `Dia ${l}`} />
                <Line type="monotone" dataKey="valor" stroke="#2a9a5a" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Feed de vendas */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#2a9a5a', animation: 'pulse 2s infinite' }} />
            <p style={{ fontSize: '12px', fontWeight: 700, color: text }}>Vendas ao Vivo</p>
          </div>
          {recentWins.length === 0 ? (
            <p style={{ fontSize: '11px', color: muted, fontStyle: 'italic', padding: '12px 0' }}>Sem vendas no período</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentWins.map((w) => (
                <div key={w.id} style={{ padding: '8px 10px', borderRadius: '7px', border: `1px solid ${w.id === newWinId ? '#2a9a5a' : border}`, backgroundColor: w.id === newWinId ? 'rgba(42,154,90,0.08)' : 'transparent', transition: 'all 0.4s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.company}</p>
                      <p style={{ fontSize: '10px', color: muted }}>{w.owner} · {relativeTime(w.at)}</p>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {w.id === newWinId && <Zap style={{ width: '11px', height: '11px', color: '#2a9a5a' }} />}
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#2a9a5a' }}>{fmtBRL(w.valor)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ranking da equipa */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '16px' }}>Desempenho da Equipa</p>

        {loading ? (
          <p style={{ fontSize: '12px', color: muted }}>Carregando...</p>
        ) : owners.length === 0 ? (
          <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Sem dados no período seleccionado</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 80px 80px', gap: '12px', padding: '0 8px 8px', borderBottom: `1px solid ${border}` }}>
              {['Responsável', 'Faturamento', 'Vendas', 'Ligações', 'Reuniões', 'Agendamentos'].map((h) => (
                <p key={h} style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</p>
              ))}
            </div>

            {owners.map((o, i) => {
              const fatPct = pct(o.faturamento, metas.faturamento)
              const ligPct = pct(o.ligacoes, metas.ligacoes_dia * diasCount)
              return (
                <div key={o.id}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 80px 80px', gap: '12px', padding: '10px 8px', borderRadius: '8px', alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#161614' : '#faf9f7')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>

                  {/* Pessoa */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                        {o.initials}
                      </div>
                      {i < 3 && (
                        <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '13px', height: '13px', borderRadius: '50%', fontSize: '7px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: i === 0 ? '#c89520' : i === 1 ? '#8a9098' : '#9a6848', color: '#fff', border: `2px solid ${cardBg}` }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</p>
                      <Bar2 p={fatPct} color={o.color} />
                    </div>
                  </div>

                  {/* Faturamento */}
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: text }}>{fmtBRL(o.faturamento)}</p>
                    <p style={{ fontSize: '10px', color: muted }}>{fatPct}% da meta</p>
                  </div>

                  {/* Vendas */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#4d7aa8' }}>{o.vendas}</p>
                    <p style={{ fontSize: '10px', color: muted }}>/{metas.vendas}</p>
                  </div>

                  {/* Ligações */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: ligPct >= 100 ? '#2a9a5a' : '#0e7490' }}>{o.ligacoes}</p>
                    <p style={{ fontSize: '10px', color: muted }}>{ligPct}%</p>
                  </div>

                  {/* Reuniões */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#7c5cbf' }}>{o.reunioes}</p>
                    <p style={{ fontSize: '10px', color: muted }}>/{metas.reunioes}</p>
                  </div>

                  {/* Agendamentos */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#a88030' }}>{o.agendamentos}</p>
                    <p style={{ fontSize: '10px', color: muted }}>/{metas.agendamentos}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminDesempenhoPage() {
  const isDark = useThemeStore((s) => s.isDark)

  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const cardBg = isDark ? '#111110' : '#ffffff'
  const pageBg = isDark ? '#0d0c0a' : '#f5f4f0'

  const [view,   setView]   = useState<'equipa' | 'config'>('equipa')
  const [config, setConfig] = useState<Config>(loadConfig)

  return (
    <div style={{ minHeight: '100%', backgroundColor: pageBg, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: cardBg, borderBottom: `1px solid ${border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>Desempenho</p>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: isDark ? '#1a1a18' : '#f5f4f0', padding: '3px', borderRadius: '10px', border: `1px solid ${border}` }}>
          {([
            { id: 'equipa', label: 'Equipa', icon: <Users style={{ width: '12px', height: '12px' }} /> },
            { id: 'config', label: 'Configuração', icon: <Settings style={{ width: '12px', height: '12px' }} /> },
          ] as const).map(({ id, label, icon }) => (
            <button key={id} type="button" onClick={() => setView(id)}
              style={{ height: '28px', padding: '0 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.12s', backgroundColor: view === id ? cardBg : 'transparent', color: view === id ? text : muted, boxShadow: view === id ? '0 1px 3px rgba(0,0,0,0.10)' : 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {view === 'config' ? (
          <div style={{ maxWidth: '520px' }}>
            <ConfigPanel config={config} onChange={setConfig} isDark={isDark} border={border} text={text} muted={muted} />
          </div>
        ) : (
          <TeamPanel config={config} isDark={isDark} border={border} text={text} muted={muted} />
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(42,154,90,0.2)} 50%{box-shadow:0 0 0 6px rgba(42,154,90,0.06)} }`}</style>
    </div>
  )
}
