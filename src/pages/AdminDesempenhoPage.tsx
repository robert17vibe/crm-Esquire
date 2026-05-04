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
  { key: 'faturamento',  label: 'Faturamento',       desc: 'Meta de receita total no período',           prefix: 'R$' },
  { key: 'vendas',       label: 'Vendas',             desc: 'Número de negócios fechados' },
  { key: 'ligacoes_dia', label: 'Ligações / Dia',     desc: 'Média diária de chamadas por responsável',   suffix: '/dia' },
  { key: 'reunioes',     label: 'Reuniões',           desc: 'Reuniões realizadas no período' },
  { key: 'agendamentos', label: 'Agendamentos',       desc: 'Reuniões agendadas no período' },
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

  const [metas,   setMetas]   = useState<Metas>(loadMetas)
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [copied,  setCopied]  = useState(false)

  const perfUrl = `${window.location.origin}/performance`

  useEffect(() => {
    // Load from Supabase on mount (may differ from localStorage)
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
    // Upsert no Supabase — mantém o range se já existia
    const { data: existing } = await supabase.from('app_settings').select('value').eq('key', 'desempenho_config').single()
    const prev = (existing?.value ?? {}) as Record<string, unknown>
    await supabase.from('app_settings').upsert({
      key: 'desempenho_config',
      value: { ...prev, metas },
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    setDirty(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(perfUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ minHeight: '100%', backgroundColor: pageBg }}>

      {/* Header */}
      <div style={{ backgroundColor: cardBg, borderBottom: `1px solid ${border}`, padding: '16px 24px' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>Desempenho — Configuração</p>
        <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Define as metas que aparecerão na página de desempenho da equipa</p>
      </div>

      <div style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start', maxWidth: '900px' }}>

        {/* Metas form */}
        <div style={{ flex: 1, backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Metas do Período</p>
            <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Valores usados nos indicadores de progresso da página da equipa</p>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {META_FIELDS.map(({ key, label, desc, prefix, suffix }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{label}</p>
                  <p style={{ fontSize: '11px', color: muted }}>{desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {prefix && <span style={{ fontSize: '12px', color: muted, flexShrink: 0 }}>{prefix}</span>}
                  <input
                    type="number" min={0}
                    value={metas[key]}
                    onChange={(e) => handleChange(key, Number(e.target.value))}
                    style={{ flex: 1, height: '36px', padding: '0 10px', fontSize: '14px', fontWeight: 700, color: text, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', textAlign: 'right' }}
                  />
                  {suffix && <span style={{ fontSize: '11px', color: muted, flexShrink: 0 }}>{suffix}</span>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 20px', borderTop: `1px solid ${border}` }}>
            <button type="button" onClick={handleSave} disabled={!dirty || saving}
              style={{ height: '38px', padding: '0 20px', borderRadius: '9px', border: 'none', backgroundColor: dirty && !saving ? '#2c5545' : (isDark ? '#1a1a18' : '#e8e6e2'), color: dirty && !saving ? '#fff' : muted, fontSize: '13px', fontWeight: 700, cursor: dirty && !saving ? 'pointer' : 'default', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '7px' }}>
              {saving ? 'A guardar...' : !dirty ? <><Check style={{ width: '13px', height: '13px' }} />Guardado</> : 'Guardar metas'}
            </button>
          </div>
        </div>

        {/* Right: link + info */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Link card */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: text, marginBottom: '4px' }}>Página da Equipa</p>
            <p style={{ fontSize: '11px', color: muted, marginBottom: '14px' }}>Partilha este link — qualquer membro com acesso ao CRM pode ver</p>

            <div style={{ backgroundColor: isDark ? '#0d0c0a' : '#f5f4f0', border: `1px solid ${border}`, borderRadius: '7px', padding: '9px 11px', marginBottom: '10px' }}>
              <p style={{ fontSize: '10px', color: muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>{perfUrl}</p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={copyLink}
                style={{ flex: 1, height: '32px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: copied ? '#2c5545' : muted, fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.15s' }}>
                {copied ? <><CheckCheck style={{ width: '11px', height: '11px' }} />Copiado</> : <><Copy style={{ width: '11px', height: '11px' }} />Copiar</>}
              </button>
              <button type="button" onClick={() => navigate('/performance')}
                style={{ height: '32px', padding: '0 14px', borderRadius: '7px', border: 'none', backgroundColor: '#2c5545', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ExternalLink style={{ width: '11px', height: '11px' }} />Abrir
              </button>
            </div>
          </div>

          {/* Instruções */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: text, marginBottom: '12px' }}>Como funciona</p>
            {[
              'Define aqui as metas do período',
              'Guarda — ficam imediatamente visíveis na página da equipa',
              'A equipa acede a /performance e escolhe a vista Diário ou Mensal',
              'Cada venda ou reunião aparece em tempo real sem recarregar',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: isDark ? '#1a1a18' : '#f0ede8', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: muted, flexShrink: 0 }}>{i + 1}</span>
                <p style={{ fontSize: '11px', color: muted, lineHeight: 1.5 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
