import { useState, useEffect } from 'react'
import { Settings, Check, ChevronLeft, ChevronRight, Tv2, ExternalLink, Copy, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
  dias: number[]
  mes: number
  ano: number
}

interface Config {
  metas: Metas
  range: DateRange
}

const LS_KEY = 'esq_desempenho_config_v2'

const DEFAULT_CONFIG: Config = {
  metas: { faturamento: 5_000_000, ligacoes_dia: 50, reunioes: 10, agendamentos: 10, vendas: 20 },
  range: { dias: [], mes: new Date().getMonth(), ano: new Date().getFullYear() },
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function daysInMonth(mes: number, ano: number) { return new Date(ano, mes + 1, 0).getDate() }

function loadConfig(): Config {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
    return {
      metas: { ...DEFAULT_CONFIG.metas, ...(saved.metas ?? {}) },
      range: { ...DEFAULT_CONFIG.range, ...(saved.range ?? {}) },
    }
  } catch { return DEFAULT_CONFIG }
}

// ─── DayPicker ────────────────────────────────────────────────────────────────

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

  const label = range.dias.length === 0
    ? 'Mês inteiro'
    : range.dias.length === 1
      ? `Dia ${range.dias[0]}`
      : `${range.dias.length} dias seleccionados`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button type="button" onClick={prevMes} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 6px' }}>
          <ChevronLeft style={{ width: '14px', height: '14px' }} />
        </button>
        <span style={{ fontSize: '12px', fontWeight: 700, color: text }}>{MESES[range.mes]} {range.ano}</span>
        <button type="button" onClick={nextMes} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 6px' }}>
          <ChevronRight style={{ width: '14px', height: '14px' }} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '10px' }}>
        {days.map((d) => {
          const sel = range.dias.includes(d)
          return (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              style={{
                height: '30px', borderRadius: '6px', fontSize: '11px', fontWeight: sel ? 700 : 400,
                cursor: 'pointer', border: `1px solid ${sel ? '#2c5545' : border}`,
                backgroundColor: sel ? '#2c5545' : faint,
                color: sel ? '#fff' : text, transition: 'all 0.1s',
              }}>
              {d}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: muted }}>{label}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={() => onChange({ ...range, dias: [] })}
            style={{ fontSize: '10px', fontWeight: 600, color: muted, background: 'none', border: `1px solid ${border}`, borderRadius: '5px', padding: '3px 8px', cursor: 'pointer' }}>
            Limpar
          </button>
          <button type="button" onClick={() => onChange({ ...range, dias: days })}
            style={{ fontSize: '10px', fontWeight: 600, color: '#2c5545', background: 'none', border: '1px solid #2c5545', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer' }}>
            Todos
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminDesempenhoPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const navigate = useNavigate()

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'
  const inputBg = isDark ? '#161614' : '#f8f7f4'
  const faint   = isDark ? '#1a1a18' : '#f5f4f0'

  const [draft,   setDraft]   = useState<Config>(loadConfig)
  const [saved,   setSaved]   = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [copied,  setCopied]  = useState(false)

  const tvUrl = `${window.location.origin}/tv/performance`

  // Mark unsaved when draft changes
  useEffect(() => { setSaved(false) }, [draft])

  async function handleSave() {
    setSaving(true)
    // Salvar localmente
    localStorage.setItem(LS_KEY, JSON.stringify(draft))
    // Salvar no Supabase para a página TV
    await supabase.from('app_settings').upsert({ key: 'desempenho_config', value: draft as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
    setSaving(false)
    setSaved(true)
  }

  function copyLink() {
    navigator.clipboard.writeText(tvUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const metaFields: { key: keyof Metas; label: string; desc: string; prefix?: string }[] = [
    { key: 'faturamento',  label: 'Meta de Faturamento',  desc: 'Total de receita no período', prefix: 'R$' },
    { key: 'vendas',       label: 'Meta de Vendas',       desc: 'Nº de deals ganhos' },
    { key: 'ligacoes_dia', label: 'Ligações por Dia',     desc: 'Mínimo diário por responsável' },
    { key: 'reunioes',     label: 'Meta de Reuniões',     desc: 'Reuniões realizadas no período' },
    { key: 'agendamentos', label: 'Meta de Agendamentos', desc: 'Reuniões agendadas no período' },
  ]

  const rangeLabel = (() => {
    const { dias, mes, ano } = draft.range
    if (dias.length === 0) return `${MESES[mes]} ${ano} — Mês inteiro`
    if (dias.length === 1) return `Dia ${dias[0]} de ${MESES[mes]}`
    return `Dias ${dias[0]}–${dias[dias.length - 1]} de ${MESES[mes]} ${ano}`
  })()

  return (
    <div style={{ minHeight: '100%', backgroundColor: pageBg, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: cardBg, borderBottom: `1px solid ${border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <Settings style={{ width: '16px', height: '16px', color: muted }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>Configuração de Desempenho</p>
          <p style={{ fontSize: '11px', color: muted }}>Define metas e período · As alterações ficam visíveis na página TV da equipa</p>
        </div>
        {/* Botão abrir TV */}
        <button type="button" onClick={() => navigate('/tv/performance')}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '34px', padding: '0 14px', borderRadius: '9px', border: `1px solid #2c5545`, backgroundColor: 'transparent', color: '#2c5545', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
          <Tv2 style={{ width: '13px', height: '13px' }} /> Ver Página TV
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Left column: metas + período */}
        <div style={{ flex: 1, maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Metas */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '22px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '4px' }}>Metas do Período</p>
            <p style={{ fontSize: '11px', color: muted, marginBottom: '20px' }}>Valores que a equipa deve atingir. Aparecem nos progressos da página TV.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                      style={{ flex: 1, height: '36px', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: text, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Período */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '22px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '4px' }}>Período de Análise</p>
            <p style={{ fontSize: '11px', color: muted, marginBottom: '16px' }}>Selecciona os dias que contam para as métricas. Sem selecção = mês inteiro.</p>
            <DayPicker
              range={draft.range}
              onChange={(r) => setDraft((d) => ({ ...d, range: r }))}
              border={border} text={text} muted={muted} faint={faint}
            />
          </div>

          {/* Guardar */}
          <button type="button" onClick={handleSave} disabled={saved || saving}
            style={{ height: '42px', borderRadius: '10px', border: 'none', backgroundColor: saved ? (isDark ? '#1a1a18' : '#e8e6e2') : '#2c5545', color: saved ? muted : '#fff', fontSize: '13px', fontWeight: 700, cursor: saved ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
            {saving ? 'A guardar...' : saved ? <><Check style={{ width: '13px', height: '13px' }} /> Configuração guardada</> : 'Aplicar e Guardar Configuração'}
          </button>
        </div>

        {/* Right column: preview + link */}
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Preview card */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: text, marginBottom: '14px' }}>Resumo da Configuração</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: isDark ? '#161614' : '#faf9f7', borderRadius: '7px' }}>
                <span style={{ fontSize: '11px', color: muted }}>Período</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: text }}>{rangeLabel}</span>
              </div>
              {metaFields.map(({ key, label, prefix }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px' }}>
                  <span style={{ fontSize: '11px', color: muted }}>{label}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: text }}>
                    {prefix}{draft.metas[key].toLocaleString('pt-BR')}
                    {key === 'ligacoes_dia' ? '/dia' : ''}
                  </span>
                </div>
              ))}
            </div>

            {!saved && (
              <div style={{ marginTop: '12px', padding: '8px 10px', borderRadius: '7px', backgroundColor: isDark ? '#1a1410' : '#fef3e8', border: `1px solid ${isDark ? '#4a2a10' : '#f5c58a'}` }}>
                <p style={{ fontSize: '10px', color: isDark ? '#f0a050' : '#a06010', fontWeight: 600 }}>Alterações não guardadas — clica em "Aplicar" para actualizar a página TV</p>
              </div>
            )}
          </div>

          {/* Link da página TV */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#0d0c0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tv2 style={{ width: '14px', height: '14px', color: '#2c5545' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: text }}>Página da Equipa (TV)</p>
                <p style={{ fontSize: '10px', color: muted }}>Partilha este link com a equipa</p>
              </div>
            </div>

            <div style={{ backgroundColor: isDark ? '#0d0c0a' : '#f5f4f0', border: `1px solid ${border}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
              <p style={{ fontSize: '10px', color: muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>{tvUrl}</p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={copyLink}
                style={{ flex: 1, height: '34px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: copied ? '#2a9a5a' : muted, fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                {copied ? <><CheckCheck style={{ width: '12px', height: '12px' }} /> Copiado!</> : <><Copy style={{ width: '12px', height: '12px' }} /> Copiar link</>}
              </button>
              <button type="button" onClick={() => navigate('/tv/performance')}
                style={{ height: '34px', padding: '0 14px', borderRadius: '8px', border: 'none', backgroundColor: '#2c5545', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ExternalLink style={{ width: '11px', height: '11px' }} /> Abrir
              </button>
            </div>
          </div>

          {/* Como funciona */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: text, marginBottom: '10px' }}>Como funciona</p>
            {[
              { n: '1', t: 'Define as metas e período acima' },
              { n: '2', t: 'Clica em "Aplicar e Guardar" para publicar' },
              { n: '3', t: 'Partilha o link TV com a equipa ou coloca num ecrã/TV' },
              { n: '4', t: 'Quando alguém faz uma venda ou agenda reunião, aparece automaticamente' },
            ].map(({ n, t }) => (
              <div key={n} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#2c5545', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff' }}>{n}</span>
                </div>
                <p style={{ fontSize: '11px', color: muted, lineHeight: 1.4 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
