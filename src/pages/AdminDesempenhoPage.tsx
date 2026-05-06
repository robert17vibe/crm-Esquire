import { useState, useEffect } from 'react'
import { Check, ExternalLink, Copy, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/store/useThemeStore'

// Todas as metas são valores DIÁRIOS — o sistema multiplica pelos dias do período
interface Metas {
  faturamento_dia: number   // R$ por dia
  vendas_dia:      number   // vendas por dia
  ligacoes_dia:    number   // ligações por dia
  reunioes_dia:    number   // reuniões por dia
  agendamentos_dia:number   // agendamentos por dia
}

const DEFAULT_METAS: Metas = {
  faturamento_dia:  166_667,  // ~5M/mês ÷ 30
  vendas_dia:       1,
  ligacoes_dia:     50,
  reunioes_dia:     1,
  agendamentos_dia: 1,
}

const LS_KEY = 'esq_desempenho_metas_v2'

function loadMetas(): Metas {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
    return { ...DEFAULT_METAS, ...s }
  } catch { return DEFAULT_METAS }
}

const META_FIELDS: { key: keyof Metas; label: string; desc: string; prefix?: string }[] = [
  { key: 'faturamento_dia',   label: 'Faturamento / Dia',   desc: 'Receita diária esperada',            prefix: 'R$' },
  { key: 'vendas_dia',        label: 'Vendas / Dia',        desc: 'Negócios fechados por dia' },
  { key: 'ligacoes_dia',      label: 'Ligações / Dia',      desc: 'Chamadas por responsável por dia' },
  { key: 'reunioes_dia',      label: 'Reuniões / Dia',      desc: 'Reuniões realizadas por dia' },
  { key: 'agendamentos_dia',  label: 'Agendamentos / Dia',  desc: 'Reuniões agendadas por dia' },
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

  // Usamos string para o input para evitar o "0 na frente"
  const [values,  setValues]  = useState<Record<keyof Metas, string>>(() => {
    const m = loadMetas()
    return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, String(v)])) as Record<keyof Metas, string>
  })
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [copied,  setCopied]  = useState(false)

  const perfUrl = `${window.location.origin}/performance`

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'desempenho_config').single()
      .then(({ data }) => {
        if (data?.value) {
          const v = data.value as { metas?: Partial<Metas> }
          if (v.metas) {
            const merged = { ...DEFAULT_METAS, ...v.metas }
            setValues(Object.fromEntries(Object.entries(merged).map(([k, val]) => [k, String(val)])) as Record<keyof Metas, string>)
          }
        }
      })
  }, [])

  function handleChange(key: keyof Metas, raw: string) {
    // Permite vazio (para o utilizador apagar e escrever novo valor)
    if (raw === '' || /^\d*$/.test(raw)) {
      setValues((v) => ({ ...v, [key]: raw }))
      setDirty(true)
    }
  }

  function getMetas(): Metas {
    return Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, Number(v) || 0])
    ) as unknown as Metas
  }

  async function handleSave() {
    setSaving(true)
    const metas = getMetas()
    localStorage.setItem(LS_KEY, JSON.stringify(metas))
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
    navigator.clipboard.writeText(perfUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const inputStyle: React.CSSProperties = {
    width: '130px',
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
  }

  // Estimativas mensais (30 dias)
  const metas = getMetas()
  const estimativas = {
    faturamento: (metas.faturamento_dia * 30).toLocaleString('pt-BR'),
    vendas:       metas.vendas_dia * 30,
    ligacoes:     metas.ligacoes_dia * 30,
    reunioes:     metas.reunioes_dia * 30,
    agendamentos: metas.agendamentos_dia * 30,
  }

  return (
    <div style={{ height: '100%', backgroundColor: pageBg, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: cardBg, borderBottom: `1px solid ${border}`, padding: '14px 20px', flexShrink: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>Desempenho</p>
        <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>Metas diárias · o sistema calcula o total do período automaticamente</p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

          {/* Metas form */}
          <div style={{ flex: '1 1 0', minWidth: 0, backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px' }}>

            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Metas Diárias</p>
                <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>Define o alvo por dia — a meta total ajusta-se ao período seleccionado</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '9px', color: muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Estimativa mensal</p>
                <p style={{ fontSize: '9px', color: muted, marginTop: '1px' }}>baseada em 30 dias</p>
              </div>
            </div>

            <div>
              {META_FIELDS.map(({ key, label, desc, prefix }, i) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '11px 18px',
                  borderBottom: i < META_FIELDS.length - 1 ? `1px solid ${border}` : 'none',
                  gap: '12px',
                }}>
                  {/* Label */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{label}</p>
                    <p style={{ fontSize: '10px', color: muted }}>{desc}</p>
                  </div>

                  {/* Estimativa mensal */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                    <p style={{ fontSize: '10px', color: muted }}>
                      {key === 'faturamento_dia'
                        ? `R$ ${estimativas.faturamento}/mês`
                        : key === 'vendas_dia'       ? `${estimativas.vendas}/mês`
                        : key === 'ligacoes_dia'      ? `${estimativas.ligacoes}/mês`
                        : key === 'reunioes_dia'      ? `${estimativas.reunioes}/mês`
                        : `${estimativas.agendamentos}/mês`}
                    </p>
                  </div>

                  {/* Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    {prefix && <span style={{ fontSize: '12px', color: muted }}>{prefix}</span>}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={values[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      style={inputStyle}
                    />
                    <span style={{ fontSize: '10px', color: muted, width: '24px' }}>/dia</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 18px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '11px', color: dirty ? (isDark ? '#f0a050' : '#a06010') : muted }}>
                {dirty ? 'Alterações por guardar' : 'Sincronizado com a página da equipa'}
              </p>
              <button type="button" onClick={handleSave} disabled={!dirty || saving}
                style={{ height: '32px', padding: '0 16px', borderRadius: '8px', border: 'none', backgroundColor: dirty && !saving ? '#2c5545' : (isDark ? '#1a1a18' : '#ece9e4'), color: dirty && !saving ? '#fff' : muted, fontSize: '12px', fontWeight: 700, cursor: dirty && !saving ? 'pointer' : 'default', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {saving ? 'A guardar...' : !dirty ? <><Check style={{ width: '12px', height: '12px' }} />Guardado</> : 'Guardar'}
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: text, marginBottom: '3px' }}>Página da Equipa</p>
              <p style={{ fontSize: '10px', color: muted, marginBottom: '12px' }}>Partilha com a equipa — vêem os dados em tempo real</p>

              <div style={{ backgroundColor: pageBg, border: `1px solid ${border}`, borderRadius: '7px', padding: '8px 10px', marginBottom: '10px', wordBreak: 'break-all' }}>
                <p style={{ fontSize: '10px', color: muted, fontFamily: 'monospace' }}>{perfUrl}</p>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={copyLink}
                  style={{ flex: 1, height: '30px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: copied ? '#2c5545' : muted, fontSize: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s' }}>
                  {copied ? <><CheckCheck style={{ width: '10px', height: '10px' }} />Copiado</> : <><Copy style={{ width: '10px', height: '10px' }} />Copiar</>}
                </button>
                <button type="button" onClick={() => navigate('/performance')}
                  style={{ height: '30px', padding: '0 12px', borderRadius: '7px', border: 'none', backgroundColor: '#2c5545', color: '#fff', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ExternalLink style={{ width: '10px', height: '10px' }} />Abrir
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: text, marginBottom: '10px' }}>Como funciona</p>
              {[
                'Define os alvos diários acima',
                'A meta total = valor × dias do período',
                'Guarda para publicar na página da equipa',
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
