import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface ContractLine { description: string; qty: number; unit_price: number }

interface ContractData {
  contract: {
    id: string
    value: number
    installments: number
    frequency: string
    start_date: string | null
    signing_status: string
    signed_at: string | null
    notes: string | null
  }
  deal: {
    title: string
    company_name: string
    contact_name: string | null
    contact_email: string | null
  }
  proposal: {
    lines: ContractLine[]
    discount_pct: number | null
    installments: number | null
    notes: string | null
  } | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

const FREQ_LABEL: Record<string, string> = {
  one_time:  'Pagamento único à vista',
  monthly:   'Pagamento mensal',
  quarterly: 'Pagamento trimestral',
  yearly:    'Pagamento anual',
}

export function AssinaturaPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData]       = useState<ContractData | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName]       = useState('')
  const [signed, setSigned]   = useState(false)
  const [signing, setSigning] = useState(false)
  const [agreed, setAgreed]   = useState(false)

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return }
    supabase.rpc('get_contract_by_token', { p_token: token })
      .then(({ data: res, error: err }) => {
        if (err || !res) { setError('Contrato não encontrado.'); return }
        if ((res as { error?: string }).error) { setError('Este link é inválido ou expirou.'); return }
        setData(res as ContractData)
        if ((res as ContractData).contract?.signing_status === 'signed') setSigned(true)
      })
      .then(() => setLoading(false), () => setLoading(false))
  }, [token])

  const handleSign = async () => {
    if (!token || !agreed) return
    setSigning(true)
    const { data: res, error: err } = await supabase.rpc('sign_contract_by_token', {
      p_token: token,
      p_name: name.trim() || null,
    })
    setSigning(false)
    if (err || (res as { error?: string })?.error) {
      alert('Erro ao assinar. Tente novamente.')
      return
    }
    setSigned(true)
  }

  const green  = '#2c5545'
  const text   = '#1a1916'
  const muted  = '#6b6560'
  const border = '#e4e0d8'
  const bg     = '#f5f4f0'
  const card   = '#ffffff'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #e4e0d8', borderTopColor: green, animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: muted, fontSize: '13px' }}>Carregando contrato...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ textAlign: 'center', padding: '40px', maxWidth: '400px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ color: text, fontWeight: 700, fontSize: '17px', marginBottom: '8px' }}>{error}</p>
        <p style={{ color: muted, fontSize: '13px', lineHeight: 1.6 }}>Entre em contacto com o responsável comercial para obter um novo link.</p>
      </div>
    </div>
  )

  if (!data) return null

  const { contract, deal, proposal } = data
  const lines      = proposal?.lines ?? []
  const subTotal   = lines.reduce((s, l) => s + (l.qty ?? 1) * (l.unit_price ?? 0), 0)
  const disc       = proposal?.discount_pct ?? 0
  const total      = subTotal > 0 ? subTotal * (1 - disc / 100) : contract.value
  const parcelas   = contract.installments > 1 ? contract.installments : 1
  const valorParc  = total / parcelas
  const isParc     = parcelas > 1

  // Datas das parcelas: 1ª em 7 dias, restantes +30 dias cada
  const today      = new Date()
  const parcDates  = Array.from({ length: parcelas }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + 7 + i * 30)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  })

  const Label = ({ children }: { children: string }) => (
    <p style={{ fontSize: '10px', fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', margin: '0 0 4px' }}>{children}</p>
  )
  const Value = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: '14px', fontWeight: 600, color: text, margin: 0 }}>{children}</p>
  )

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '40px 16px 60px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* ── Cabeçalho ── */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '14px',
            background: green, color: '#fff', fontSize: '24px',
            marginBottom: '16px', boxShadow: '0 4px 16px rgba(44,85,69,0.25)',
          }}>📄</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Contrato Comercial
          </h1>
          <p style={{ fontSize: '13px', color: muted, margin: 0 }}>
            Reveja todos os detalhes antes de assinar
          </p>
        </div>

        {/* ── Card principal ── */}
        <div style={{ background: card, borderRadius: '20px', border: `1px solid ${border}`, overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* Faixa verde no topo */}
          <div style={{ height: '4px', background: `linear-gradient(90deg, ${green}, #4a8a72)` }} />

          {/* Partes do contrato */}
          <div style={{ padding: '28px 32px', borderBottom: `1px solid ${border}` }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Partes do Contrato</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ padding: '16px', background: '#faf9f7', borderRadius: '12px', border: `1px solid ${border}` }}>
                <Label>Contratante</Label>
                <Value>{deal.company_name || '—'}</Value>
                {deal.contact_name && <p style={{ fontSize: '12px', color: muted, margin: '4px 0 0' }}>{deal.contact_name}</p>}
                {deal.contact_email && <p style={{ fontSize: '11px', color: muted, margin: '2px 0 0' }}>{deal.contact_email}</p>}
              </div>
              <div style={{ padding: '16px', background: '#faf9f7', borderRadius: '12px', border: `1px solid ${border}` }}>
                <Label>Referência</Label>
                <Value>{deal.title}</Value>
                <p style={{ fontSize: '12px', color: muted, margin: '4px 0 0' }}>Início: {fmtDate(contract.start_date)}</p>
              </div>
            </div>
          </div>

          {/* Itens contratados */}
          {lines.length > 0 && (
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Itens Contratados</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#faf9f7' }}>
                    {[['Descrição', 'left'], ['Qtd', 'center'], ['Valor unit.', 'right'], ['Total', 'right']].map(([h, a]) => (
                      <th key={h} style={{ textAlign: a as 'left' | 'center' | 'right', fontSize: '10px', fontWeight: 700, color: muted, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '8px 10px', borderBottom: `1px solid ${border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} style={{ borderBottom: i < lines.length - 1 ? `1px solid ${border}` : 'none' }}>
                      <td style={{ fontSize: '13px', color: text, padding: '12px 10px', fontWeight: 500 }}>{l.description}</td>
                      <td style={{ fontSize: '13px', color: muted, textAlign: 'center', padding: '12px 10px' }}>{l.qty}</td>
                      <td style={{ fontSize: '13px', color: muted, textAlign: 'right', padding: '12px 10px', fontFamily: 'monospace' }}>{fmt(l.unit_price)}</td>
                      <td style={{ fontSize: '13px', color: text, textAlign: 'right', padding: '12px 10px', fontWeight: 600, fontFamily: 'monospace' }}>{fmt((l.qty ?? 1) * (l.unit_price ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totais */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `2px solid ${border}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                {disc > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '12px', color: muted }}>
                      <span>Subtotal</span><span style={{ fontFamily: 'monospace' }}>{fmt(subTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '12px', color: '#a05c00' }}>
                      <span>Desconto ({disc}%)</span><span style={{ fontFamily: 'monospace' }}>-{fmt(subTotal * disc / 100)}</span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '16px', fontWeight: 800, color: text, paddingTop: disc > 0 ? '6px' : 0, borderTop: disc > 0 ? `1px solid ${border}` : 'none' }}>
                  <span>Total</span><span style={{ color: green, fontFamily: 'monospace' }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Condições de pagamento */}
          <div style={{ padding: '24px 32px', borderBottom: `1px solid ${border}`, background: '#faf9f7' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Condições de Pagamento</p>

            {isParc ? (
              <>
                {/* Destaque parcelado */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '140px', padding: '16px 20px', background: card, borderRadius: '12px', border: `2px solid ${green}` }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: green, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Parcelado em</p>
                    <p style={{ fontSize: '28px', fontWeight: 900, color: green, margin: 0, letterSpacing: '-0.03em' }}>{parcelas}×</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: text, margin: '4px 0 0', fontFamily: 'monospace' }}>{fmt(valorParc)}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px', padding: '16px 20px', background: card, borderRadius: '12px', border: `1px solid ${border}` }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Valor total</p>
                    <p style={{ fontSize: '22px', fontWeight: 800, color: text, margin: 0, fontFamily: 'monospace' }}>{fmt(total)}</p>
                    <p style={{ fontSize: '12px', color: muted, margin: '4px 0 0' }}>{FREQ_LABEL[contract.frequency] ?? contract.frequency}</p>
                  </div>
                </div>

                {/* Calendário de parcelas */}
                <p style={{ fontSize: '11px', fontWeight: 700, color: muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px' }}>Calendário de vencimentos</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {parcDates.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: card, borderRadius: '8px', border: `1px solid ${border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(44,85,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: green }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: '12px', color: muted }}>{i === 0 ? 'Primeira parcela' : `Parcela ${i + 1}`}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: text, margin: 0, fontFamily: 'monospace' }}>{fmt(valorParc)}</p>
                        <p style={{ fontSize: '10px', color: muted, margin: '2px 0 0' }}>{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Pagamento único */
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '160px', padding: '20px 24px', background: card, borderRadius: '12px', border: `2px solid ${green}`, textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: green, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Valor total</p>
                  <p style={{ fontSize: '32px', fontWeight: 900, color: green, margin: 0, fontFamily: 'monospace', letterSpacing: '-0.03em' }}>{fmt(total)}</p>
                  <p style={{ fontSize: '12px', color: muted, margin: '6px 0 0' }}>Pagamento único</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '160px' }}>
                  <div style={{ padding: '14px 18px', background: card, borderRadius: '10px', border: `1px solid ${border}` }}>
                    <Label>Modalidade</Label>
                    <Value>{FREQ_LABEL[contract.frequency] ?? contract.frequency}</Value>
                  </div>
                  <div style={{ padding: '14px 18px', background: card, borderRadius: '10px', border: `1px solid ${border}` }}>
                    <Label>Vencimento estimado</Label>
                    <Value>{parcDates[0]}</Value>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Observações da proposta */}
          {proposal?.notes && (
            <div style={{ padding: '20px 32px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Observações</p>
              <p style={{ fontSize: '13px', color: text, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{proposal.notes}</p>
            </div>
          )}

          {/* Notas do contrato */}
          {contract.notes && !contract.notes.startsWith('\nAssinado') && (
            <div style={{ padding: '20px 32px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Notas</p>
              <p style={{ fontSize: '13px', color: text, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{contract.notes}</p>
            </div>
          )}

          {/* Termos gerais */}
          <div style={{ padding: '20px 32px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Termos Gerais</p>
            <p style={{ fontSize: '12px', color: muted, lineHeight: 1.8, margin: 0 }}>
              Ao assinar este contrato, o cliente confirma que leu, compreendeu e concorda com todos os
              termos e condições aqui descritos, incluindo os valores, formas e datas de pagamento indicados.
              O serviço será prestado conforme especificado nos itens acima. Em caso de cancelamento,
              aplica-se a política de rescisão contratual vigente.
            </p>
          </div>
        </div>

        {/* ── Assinatura ── */}
        {signed ? (
          <div style={{ background: '#e8f3ee', border: '1px solid #a8d5bc', borderRadius: '20px', padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>✅</div>
            <p style={{ fontSize: '20px', fontWeight: 800, color: '#1a3d2b', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Contrato assinado!</p>
            <p style={{ fontSize: '14px', color: '#2c5545', margin: 0 }}>
              {contract.signed_at ? `Assinado em ${fmtDate(contract.signed_at)}` : 'Assinatura registada no sistema.'}
            </p>
          </div>
        ) : (
          <div style={{ background: card, borderRadius: '20px', border: `1px solid ${border}`, padding: '28px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '16px', fontWeight: 800, color: text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Assinar contrato</p>
            <p style={{ fontSize: '12px', color: muted, margin: '0 0 20px' }}>A assinatura é registada digitalmente com data, hora e identificação.</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: muted, display: 'block', marginBottom: '6px' }}>
                Nome completo de quem assina <span style={{ fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: João Silva"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${border}`, fontSize: '14px', color: text, background: '#faf9f7', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = green}
                onBlur={e => e.target.style.borderColor = border}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '14px', background: '#faf9f7', borderRadius: '10px', border: `1px solid ${border}`, marginBottom: '20px' }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '1px', accentColor: green, width: '18px', height: '18px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: text, lineHeight: 1.6 }}>
                Li e concordo com todos os termos, condições e{isParc ? ` o plano de ${parcelas} parcelas de ${fmt(valorParc)}` : ` o valor de ${fmt(total)}`} descritos neste contrato.
              </span>
            </label>

            <button
              onClick={handleSign}
              disabled={!agreed || signing}
              style={{
                width: '100%', padding: '15px', borderRadius: '12px', border: 'none',
                background: agreed ? green : '#c4bfb8', color: '#fff',
                fontSize: '15px', fontWeight: 800, cursor: agreed ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s', letterSpacing: '-0.01em',
                boxShadow: agreed ? '0 4px 16px rgba(44,85,69,0.3)' : 'none',
              }}
            >
              {signing ? 'Registando assinatura...' : '✍ Confirmar e assinar'}
            </button>
          </div>
        )}

        {/* Botão imprimir/baixar */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '8px', border: `1px solid ${border}`, background: card, color: muted, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            🖨 Imprimir / Salvar como PDF
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#c4bfb8', marginTop: '16px' }}>
          Esquire CRM · Documento gerado automaticamente em {new Date().toLocaleDateString('pt-BR')}
        </p>

        <style>{`
          @media print {
            button, input, label { display: none !important; }
            body { background: #fff !important; }
          }
          @keyframes spin { to { transform: rotate(360deg) } }
        `}</style>
      </div>
    </div>
  )
}
