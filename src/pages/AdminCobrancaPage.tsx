import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/store/useThemeStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type PayStatus = 'pago' | 'pendente' | 'atrasado'

interface CobrancaRow {
  id: string
  deal_id: string
  company_name: string
  contact_name: string | null
  owner_name: string
  valor: number
  installments: number
  created_at: string
  validity: string
  status: PayStatus
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

// Deriva status a partir da data de criação + validade (ex: "30 dias")
function deriveStatus(createdAt: string, validity: string, manual?: PayStatus): PayStatus {
  if (manual) return manual
  const days = parseInt(validity) || 30
  const expiry = new Date(createdAt)
  expiry.setDate(expiry.getDate() + days)
  const now = new Date()
  if (expiry < now) return 'atrasado'
  // dentro do prazo = pendente por default
  return 'pendente'
}

const STATUS_CFG: Record<PayStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  pago:     { label: 'Pago',     color: '#2c5545', bg: 'rgba(42,154,90,0.10)',   icon: CheckCircle },
  pendente: { label: 'Pendente', color: '#a88030', bg: 'rgba(168,128,48,0.10)',  icon: Clock },
  atrasado: { label: 'Atrasado', color: '#b83535', bg: 'rgba(184,53,53,0.10)',   icon: AlertCircle },
}

// Chave localStorage para overrides manuais de status
const LS_KEY = 'esq_cobranca_status_v1'

function loadOverrides(): Record<string, PayStatus> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return {} }
}
function saveOverrides(o: Record<string, PayStatus>) {
  localStorage.setItem(LS_KEY, JSON.stringify(o))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminCobrancaPage() {
  const isDark   = useThemeStore((s) => s.isDark)
  const navigate = useNavigate()

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'
  const inputBg = isDark ? '#1a1a18' : '#f5f4f0'

  const [rows, setRows]         = useState<CobrancaRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<PayStatus | 'todos'>('todos')
  const [overrides, setOverrides] = useState<Record<string, PayStatus>>(loadOverrides)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('renewal_proposals')
      .select(`
        id, deal_id, lines, discount_pct, installments, created_at, validity,
        deals ( company_name, contact_name, owner, value )
      `)
      .order('created_at', { ascending: false })

    const realRows: CobrancaRow[] = (error || !data) ? [] : data.map((r) => {
      const deal = (r.deals as unknown) as { company_name: string; contact_name: string | null; owner: { name?: string }; value: number } | null
      const lines = (r.lines as { qty: number; unit_price: number }[]) ?? []
      const sub   = lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
      const valor = sub - sub * ((r.discount_pct ?? 0) / 100)
      return {
        id: r.id, deal_id: r.deal_id,
        company_name: deal?.company_name ?? '—',
        contact_name: deal?.contact_name ?? null,
        owner_name: deal?.owner?.name ?? '—',
        valor, installments: r.installments ?? 1,
        created_at: r.created_at,
        validity: r.validity ?? '30 dias',
        status: deriveStatus(r.created_at, r.validity, overrides[r.id]),
      }
    })

    // Dados de demonstração quando não há propostas reais
    const mockRows: CobrancaRow[] = realRows.length > 0 ? [] : [
      { id: 'mock-1', deal_id: 'mock', company_name: 'Grupo Meridian',    contact_name: 'Carlos Mendes',   owner_name: 'Ana Silva',    valor: 18500, installments: 3, created_at: new Date(Date.now() - 2  * 86400000).toISOString(), validity: '30 dias', status: 'pendente' },
      { id: 'mock-2', deal_id: 'mock', company_name: 'Vortex Digital',    contact_name: 'Paula Ferreira',  owner_name: 'João Costa',   valor: 42000, installments: 6, created_at: new Date(Date.now() - 5  * 86400000).toISOString(), validity: '30 dias', status: 'pago'     },
      { id: 'mock-3', deal_id: 'mock', company_name: 'Apex Soluções',     contact_name: 'Ricardo Lima',    owner_name: 'Ana Silva',    valor: 9800,  installments: 1, created_at: new Date(Date.now() - 8  * 86400000).toISOString(), validity: '15 dias', status: 'atrasado' },
      { id: 'mock-4', deal_id: 'mock', company_name: 'Nova Era Mídia',    contact_name: 'Fernanda Torres', owner_name: 'Pedro Rocha',  valor: 27300, installments: 2, created_at: new Date(Date.now() - 12 * 86400000).toISOString(), validity: '30 dias', status: 'pago'     },
      { id: 'mock-5', deal_id: 'mock', company_name: 'Stark Comunicação', contact_name: null,              owner_name: 'João Costa',   valor: 55000, installments: 12,created_at: new Date(Date.now() - 18 * 86400000).toISOString(), validity: '45 dias', status: 'pendente' },
      { id: 'mock-6', deal_id: 'mock', company_name: 'BlueSky Marketing', contact_name: 'Thiago Alves',    owner_name: 'Pedro Rocha',  valor: 13200, installments: 3, created_at: new Date(Date.now() - 35 * 86400000).toISOString(), validity: '30 dias', status: 'atrasado' },
    ]

    setRows([...realRows, ...mockRows])
    setLoading(false)
  }

  function setStatus(id: string, status: PayStatus) {
    const next = { ...overrides, [id]: status }
    setOverrides(next)
    saveOverrides(next)
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
  }

  const visible = filter === 'todos' ? rows : rows.filter((r) => r.status === filter)

  const totalPago    = rows.filter((r) => r.status === 'pago').reduce((s, r) => s + r.valor, 0)
  const totalPendente = rows.filter((r) => r.status === 'pendente').reduce((s, r) => s + r.valor, 0)
  const totalAtrasado = rows.filter((r) => r.status === 'atrasado').reduce((s, r) => s + r.valor, 0)

  return (
    <div style={{ minHeight: '100%', backgroundColor: pageBg, padding: '24px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: text, letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Cobrança
        </h1>
        <p style={{ fontSize: '13px', color: muted }}>
          Acompanhe o status de pagamento das propostas enviadas
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {([
          { label: 'Recebido', valor: totalPago,     status: 'pago'     as PayStatus },
          { label: 'A receber', valor: totalPendente, status: 'pendente' as PayStatus },
          { label: 'Atrasado',  valor: totalAtrasado, status: 'atrasado' as PayStatus },
        ]).map(({ label, valor, status }) => {
          const cfg = STATUS_CFG[status]
          const Icon = cfg.icon
          return (
            <div key={status}
              onClick={() => setFilter(filter === status ? 'todos' : status)}
              style={{
                padding: '18px 20px', borderRadius: '12px', border: `1px solid ${filter === status ? cfg.color + '50' : border}`,
                backgroundColor: filter === status ? cfg.bg : cardBg, cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: '13px', height: '13px', color: cfg.color }} />
                </div>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 700, color: cfg.color, letterSpacing: '-0.03em' }}>{fmtBRL(valor)}</p>
              <p style={{ fontSize: '11px', color: muted, marginTop: '4px' }}>
                {rows.filter((r) => r.status === status).length} proposta{rows.filter((r) => r.status === status).length !== 1 ? 's' : ''}
              </p>
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['todos', 'pago', 'pendente', 'atrasado'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              style={{
                height: '28px', padding: '0 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none',
                backgroundColor: filter === f ? text : inputBg,
                color: filter === f ? (isDark ? '#0d0c0a' : '#fff') : muted,
                transition: 'all 0.15s',
              }}>
              {f === 'todos' ? 'Todos' : STATUS_CFG[f].label}
            </button>
          ))}
        </div>
        <button type="button" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', padding: '0 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted }}>
          <RefreshCw style={{ width: '11px', height: '11px' }} />
          Actualizar
        </button>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px 110px 36px', gap: '0', borderBottom: `1px solid ${border}`, padding: '10px 16px' }}>
          {['Empresa / Contacto', 'Responsável', 'Valor', 'Parcelas', 'Status', ''].map((h) => (
            <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: muted }}>Carregando...</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: muted, fontStyle: 'italic' }}>Nenhuma proposta encontrada</p>
          </div>
        ) : visible.map((row, i) => {
          const cfg = STATUS_CFG[row.status]
          const Icon = cfg.icon
          return (
            <div key={row.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px 110px 36px',
                gap: '0', alignItems: 'center',
                padding: '12px 16px',
                borderBottom: i < visible.length - 1 ? `1px solid ${border}` : 'none',
                backgroundColor: 'transparent',
                transition: 'background-color 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#161614' : '#faf9f7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {/* Empresa */}
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{row.company_name}</p>
                {row.contact_name && <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>{row.contact_name}</p>}
                <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>{fmtDate(row.created_at)}</p>
              </div>

              {/* Owner */}
              <p style={{ fontSize: '12px', color: muted }}>{row.owner_name}</p>

              {/* Valor */}
              <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>{fmtBRL(row.valor)}</p>

              {/* Parcelas */}
              <p style={{ fontSize: '12px', color: muted }}>
                {row.installments}x {fmtBRL(row.valor / row.installments)}
              </p>

              {/* Status dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={row.status}
                  onChange={(e) => setStatus(row.id, e.target.value as PayStatus)}
                  style={{
                    appearance: 'none', width: '100%', height: '26px',
                    padding: '0 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                    color: cfg.color, backgroundColor: cfg.bg,
                    border: `1px solid ${cfg.color}40`, cursor: 'pointer', outline: 'none',
                  }}>
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasado">Atrasado</option>
                </select>
                <Icon style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '10px', height: '10px', color: cfg.color, pointerEvents: 'none' }} />
              </div>

              {/* Link deal */}
              <button type="button" onClick={() => navigate(`/deal/${row.deal_id}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', color: muted }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = text; e.currentTarget.style.color = text }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted }}
              >
                <ChevronRight style={{ width: '12px', height: '12px' }} />
              </button>
            </div>
          )
        })}
      </div>

      {visible.length > 0 && (
        <p style={{ fontSize: '11px', color: muted, marginTop: '10px', textAlign: 'right' }}>
          {visible.length} proposta{visible.length !== 1 ? 's' : ''} · Total: <strong style={{ color: text }}>{fmtBRL(visible.reduce((s, r) => s + r.valor, 0))}</strong>
        </p>
      )}
    </div>
  )
}
