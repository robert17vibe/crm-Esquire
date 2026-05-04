import { useState, useEffect } from 'react'
import { Check, ExternalLink, Copy, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/store/useThemeStore'

interface Metas {
  faturamento: number
  ligacoes_dia: number
  reunioes: number
  agendamentos: number
  vendas: number
}

const DEFAULT_METAS: Metas = {
  faturamento: 5_000_000,
  ligacoes_dia: 50,
  reunioes: 10,
  agendamentos: 10,
  vendas: 20,
}

const LS_KEY = 'esq_desempenho_metas_v1'

function loadMetas(): Metas {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
    return { ...DEFAULT_METAS, ...s }
  } catch { return DEFAULT_METAS }
}

const META_FIELDS: { key: keyof Metas; label: string; desc: string; prefix?: string; suffix?: string }[] = [
  { key: 'faturamento',  label: 'Faturamento',    desc: 'Meta de receita total',          prefix: 'R$' },
  { key: 'vendas',       label: 'Vendas',          desc: 'Negócios fechados' },
  { key: 'ligacoes_dia', label: 'Ligações / Dia',  desc: 'Média diária por responsável',  suffix: '/dia' },
  { key: 'reunioes',     label: 'Reuniões',        desc: 'Reuniões realizadas' },
  { key: 'agendamentos', label: 'Agendamentos',    desc: 'Reuniões agendadas' },
]

export function AdminDesempenhoPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const navigate = useNavigate()

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'
  const inputBg = isDark ? '#161614' : '#f8f7f4'

  const [metas,  setMetas]  = useState<Metas>(loadMetas)
  const [dirty,  setDirty]  = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const perfUrl = `${window.location.origin}/performance`

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'desempenho_config').single()
      .then(({ data }) => {
        if (data?.value) {
          const v = data.value as { metas?: Partial<Metas> }
          if (v.metas) setMetas({ ...DEFAULT_METAS, ...v.metas })
        }
      })
  }, [])

  function handleChange(key: keyof Metas, val: number) {
    setMetas((m) => ({ ...m, [key]: val }))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    localStorage.setItem(LS_KEY, JSON.stringify(metas))
    const { data: existing } = await supabase.from('app_settings').select('value').eq('key', 'desempenho_config').single()
    const prev = (existing?.value ?? {}) as Record<string, unknown>
    await supabase.from('app_settings').upsert({ key: 'desempenho_config', value: { ...prev, metas }, updated_at: new Date().toISOString() })
    setSaving(false)
    setDirty(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(perfUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const inputStyle: React.CSSProperties = {
    width: '120px',
    height: '34px',
    padding: '0 10px',
    fontSize: '14px',
    fontWeight: 700,
    color: text,
    backgroundColor: inputBg,
    border: `1px solid ${border}`,
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    textAlign: 'right',
    flexShrink: 0,
    MozAppearance: 'textfield',
  }

  return (
    <div style={{ height: '100%', backgroundColor: pageBg, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ backgroundColor: cardBg, borderBottom: `1px solid ${border}`, padding: '14px 20px', flexShrink: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>Desempenho</p>
        <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Configuração de metas e acesso à página da equipa</p>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

          {/* ── Metas form ── */}
          <div style={{ flex: '1 1 0', minWidth: 0, backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px' }}>

            {/* Section title */}
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Metas do Período</p>
              <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>Aparecem como indicadores de progresso na página da equipa</p>
            </div>

            {/* Fields */}
            <div style={{ padding: '4px 0' }}>
              {META_FIELDS.map(({ key, label, desc, prefix, suffix }, i) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderBottom: i < META_FIELDS.length - 1 ? `1px solid ${border}` : 'none',
                  gap: '12px',
                }}>
                  {/* Label */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{label}</p>
                    <p style={{ fontSize: '10px', color: muted }}>{desc}</p>
                  </div>

                  {/* Input group */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {prefix && <span style={{ fontSize: '12px', color: muted }}>{prefix}</span>}
                    <input
                      type="number" min={0}
                      value={metas[key]}
                      onChange={(e) => handleChange(key, Number(e.target.value))}
                      style={inputStyle}
                      className="no-spin"
                    />
                    {suffix && <span style={{ fontSize: '11px', color: muted }}>{suffix}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Save */}
            <div style={{ padding: '14px 18px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '11px', color: muted }}>
                {dirty ? 'Alterações por guardar' : 'Metas sincronizadas com a página da equipa'}
              </p>
              <button type="button" onClick={handleSave} disabled={!dirty || saving}
                style={{ height: '34px', padding: '0 18px', borderRadius: '8px', border: 'none', backgroundColor: dirty && !saving ? '#2c5545' : (isDark ? '#1a1a18' : '#ece9e4'), color: dirty && !saving ? '#fff' : muted, fontSize: '12px', fontWeight: 700, cursor: dirty && !saving ? 'pointer' : 'default', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {saving ? 'A guardar...' : !dirty ? <><Check style={{ width: '12px', height: '12px' }} />Guardado</> : 'Guardar'}
              </button>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Link da equipa */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: text, marginBottom: '3px' }}>Página da Equipa</p>
              <p style={{ fontSize: '10px', color: muted, marginBottom: '12px' }}>Partilha com a equipa para verem o desempenho</p>

              <div style={{ backgroundColor: pageBg, border: `1px solid ${border}`, borderRadius: '7px', padding: '8px 10px', marginBottom: '10px', wordBreak: 'break-all' }}>
                <p style={{ fontSize: '10px', color: muted, fontFamily: 'monospace' }}>{perfUrl}</p>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={copyLink}
                  style={{ flex: 1, height: '32px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: copied ? '#2c5545' : muted, fontSize: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.15s' }}>
                  {copied ? <><CheckCheck style={{ width: '11px', height: '11px' }} />Copiado</> : <><Copy style={{ width: '11px', height: '11px' }} />Copiar</>}
                </button>
                <button type="button" onClick={() => navigate('/performance')}
                  style={{ height: '32px', padding: '0 12px', borderRadius: '7px', border: 'none', backgroundColor: '#2c5545', color: '#fff', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ExternalLink style={{ width: '10px', height: '10px' }} />Abrir
                </button>
              </div>
            </div>

            {/* Instruções */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '10px' }}>Como funciona</p>
              {[
                'Define as metas acima e guarda',
                'A equipa acede a /performance',
                'Escolhe vista Diário ou Mensal',
                'Vendas e reuniões aparecem em tempo real',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: isDark ? '#1a1a18' : '#f0ede8', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 800, color: muted, flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                  <p style={{ fontSize: '10px', color: muted, lineHeight: 1.5 }}>{t}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
