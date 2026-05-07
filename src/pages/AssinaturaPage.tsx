import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

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
    lines: Array<{ description: string; qty: number; unit_price: number }>
    discount_pct: number | null
    installments: number | null
    notes: string | null
  } | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—'

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
    if (err || res?.error) {
      alert('Erro ao assinar. Tente novamente.')
      return
    }
    setSigned(true)
  }

  const bg = '#f5f4f0'
  const card = '#ffffff'
  const green = '#2c5545'
  const text = '#1a1916'
  const muted = '#8a857d'
  const border = '#e4e0d8'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <p style={{ color: muted, fontSize: '14px' }}>Carregando contrato...</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ color: text, fontWeight: 600, fontSize: '16px' }}>{error}</p>
        <p style={{ color: muted, fontSize: '13px', marginTop: '8px' }}>Entre em contacto com o responsável comercial.</p>
      </div>
    </div>
  )

  if (!data) return null

  const { contract, deal, proposal } = data
  const lines = proposal?.lines ?? []
  const subTotal = lines.reduce((s, l) => s + (l.qty ?? 1) * (l.unit_price ?? 0), 0)
  const disc = proposal?.discount_pct ?? 0
  const total = subTotal * (1 - disc / 100)
  const installAmt = contract.installments > 1 ? total / contract.installments : total

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '32px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: green, color: '#fff', fontSize: '22px', marginBottom: '12px',
          }}>⚖</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: text, margin: 0 }}>Contrato Comercial</h1>
          <p style={{ fontSize: '13px', color: muted, marginTop: '4px' }}>Reveja os termos e assine digitalmente</p>
        </div>

        {/* Contract document */}
        <div style={{
          background: card, borderRadius: '16px', border: `1px solid ${border}`,
          overflow: 'hidden', marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          {/* Client & deal */}
          <div style={{ padding: '28px 32px', borderBottom: `1px solid ${border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Empresa</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: text }}>{deal.company_name || '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Contacto</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: text }}>{deal.contact_name || '—'}</p>
                {deal.contact_email && <p style={{ fontSize: '12px', color: muted }}>{deal.contact_email}</p>}
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Proposta</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: text }}>{deal.title}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Data início</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: text }}>{fmtDate(contract.start_date)}</p>
              </div>
            </div>
          </div>

          {/* Line items */}
          {lines.length > 0 && (
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Itens contratados</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Descrição', 'Qtd', 'Preço unit.', 'Total'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Descrição' ? 'left' : 'right', fontSize: '11px', fontWeight: 600, color: muted, paddingBottom: '8px', borderBottom: `1px solid ${border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '13px', color: text, padding: '10px 0', borderBottom: `1px solid ${border}` }}>{l.description}</td>
                      <td style={{ fontSize: '13px', color: text, textAlign: 'right', padding: '10px 0', borderBottom: `1px solid ${border}` }}>{l.qty}</td>
                      <td style={{ fontSize: '13px', color: text, textAlign: 'right', padding: '10px 0', borderBottom: `1px solid ${border}` }}>{fmt(l.unit_price)}</td>
                      <td style={{ fontSize: '13px', color: text, textAlign: 'right', padding: '10px 0', borderBottom: `1px solid ${border}` }}>{fmt((l.qty ?? 1) * (l.unit_price ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                {disc > 0 && <>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: muted }}>
                    <span>Subtotal</span><span>{fmt(subTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#a05c00' }}>
                    <span>Desconto ({disc}%)</span><span>-{fmt(subTotal * disc / 100)}</span>
                  </div>
                </>}
                <div style={{ display: 'flex', gap: '24px', fontSize: '15px', fontWeight: 700, color: text }}>
                  <span>Total</span><span>{fmt(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment terms */}
          <div style={{ padding: '24px 32px', borderBottom: `1px solid ${border}`, background: '#faf9f7' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Condições de pagamento</p>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '11px', color: muted }}>Valor total</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: green }}>{fmt(contract.value)}</p>
              </div>
              {contract.installments > 1 && <div>
                <p style={{ fontSize: '11px', color: muted }}>Parcelas</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: text }}>{contract.installments}× {fmt(installAmt)}</p>
              </div>}
              <div>
                <p style={{ fontSize: '11px', color: muted }}>Frequência</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: text }}>
                  {{ one_time: 'Pagamento único', monthly: 'Mensal', quarterly: 'Trimestral', yearly: 'Anual' }[contract.frequency] ?? contract.frequency}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {proposal?.notes && (
            <div style={{ padding: '20px 32px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Observações</p>
              <p style={{ fontSize: '13px', color: text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{proposal.notes}</p>
            </div>
          )}

          {/* Terms */}
          <div style={{ padding: '20px 32px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Termos gerais</p>
            <p style={{ fontSize: '12px', color: muted, lineHeight: 1.7 }}>
              Ao assinar este contrato, o cliente confirma que leu, compreendeu e concorda com todos os termos e condições aqui descritos.
              O serviço será prestado conforme especificado nos itens acima.
              Em caso de cancelamento, aplica-se a política de rescisão vigente.
            </p>
          </div>
        </div>

        {/* Signing section */}
        {signed ? (
          <div style={{
            background: '#e8f3ee', border: `1px solid #a8d5bc`,
            borderRadius: '16px', padding: '32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#1a3d2b' }}>Contrato assinado com sucesso!</p>
            <p style={{ fontSize: '13px', color: '#2c5545', marginTop: '6px' }}>
              {contract.signed_at ? `Assinado em ${fmtDate(contract.signed_at)}` : 'Assinatura registada no sistema.'}
            </p>
          </div>
        ) : (
          <div style={{
            background: card, borderRadius: '16px', border: `1px solid ${border}`,
            padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: text, marginBottom: '20px' }}>Assinar contrato</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: muted, display: 'block', marginBottom: '6px' }}>
                Seu nome completo <span style={{ color: muted, fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome de quem assina"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: `1px solid ${border}`, fontSize: '14px', color: text,
                  background: '#faf9f7', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '2px', accentColor: green, width: '16px', height: '16px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: text, lineHeight: 1.5 }}>
                Li e concordo com todos os termos e condições deste contrato, bem como com os valores e condições de pagamento acima descritos.
              </span>
            </label>

            <button
              onClick={handleSign}
              disabled={!agreed || signing}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                background: agreed ? green : '#c4bfb8', color: '#fff',
                fontSize: '15px', fontWeight: 700, cursor: agreed ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
              }}
            >
              {signing ? 'A assinar...' : 'Confirmar assinatura'}
            </button>
            <p style={{ fontSize: '11px', color: muted, textAlign: 'center', marginTop: '10px' }}>
              A assinatura é registada com data, hora e identificador único.
            </p>
          </div>
        )}

        {/* Print/download button */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: `1px solid ${border}`, background: card, color: muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            🖨 Baixar / Imprimir contrato
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: muted, marginTop: '16px' }}>
          Esquire CRM · Documento gerado automaticamente
        </p>

        <style>{`
          @media print {
            button { display: none !important; }
            body { background: #fff !important; }
            input[type="checkbox"] { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
