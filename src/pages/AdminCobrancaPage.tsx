import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, Clock, AlertCircle, Search,
  TrendingUp, ArrowUpRight, X, FileText, DollarSign,
  ChevronRight, CreditCard, PenLine, Package,
  Truck, PartyPopper, Pen, Download, Copy,
  Calendar, History,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { usePaymentStore } from '@/store/usePaymentStore'
import { useDealStore } from '@/store/useDealStore'
import type { PaymentWithDeal, DeliveryStatus, SigningStatus, Contract } from '@/types/payment.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}
function fmtBRLFull(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v)
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}
function fmtDateShort(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso))
}
function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
function daysUntil(iso: string): { label: string; urgent: boolean } {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (diff < 0)   return { label: `${Math.abs(diff)}d em atraso`, urgent: true }
  if (diff === 0) return { label: 'vence hoje', urgent: true }
  if (diff <= 3)  return { label: `em ${diff}d`, urgent: true }
  return { label: `em ${diff}d`, urgent: false }
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'
}
function hashColor(name: string) {
  const colors = ['#2c5545','#4d7aa8','#8b5e3c','#6b4c8b','#a88030','#3c6b6b','#5a7d4d','#8b4545']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return colors[h % colors.length]
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichedContract = Contract & {
  deals?: { company_name?: string | null; contact_name?: string | null } | null
}

interface ContractGroup {
  dealId:           string
  contractId?:      string
  companyName:      string
  contactName:      string | null
  totalValue:       number
  installments:     PaymentWithDeal[]
  paidCount:        number
  overdueCount:     number
  pendingCount:     number
  overallStatus:    'paid' | 'overdue' | 'partial' | 'pending'
  nextDue:          PaymentWithDeal | null
  paidValue:        number
  pendingValue:     number
  signedAt?:         string | null
  signingStatus:     SigningStatus
  createdAt?:        string | null
  deliveryStatus:    DeliveryStatus
  deliveryNotes?:    string | null
  signingToken?:     string | null
  contractStatus:    import('@/types/payment.types').ContractStatus
  isCurrentForDeal:  boolean
}

function groupByContract(rows: PaymentWithDeal[], contracts: EnrichedContract[]): ContractGroup[] {
  // Agrupar pagamentos por contract_id (não deal_id)
  const contractById = new Map(contracts.map(c => [c.id, c]))
  const map = new Map<string, PaymentWithDeal[]>()

  for (const r of rows) {
    const key = r.contract_id
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }

  // Incluir contratos sem pagamentos (ex: one_time ainda não pago)
  for (const c of contracts) {
    if (!map.has(c.id)) map.set(c.id, [])
  }

  // Para cada deal, qual é o contrato mais recente ativo?
  const latestActiveByDeal = new Map<string, string>()
  for (const c of contracts) {
    if (c.status === 'active' || c.status === 'completed') {
      const existing = latestActiveByDeal.get(c.deal_id)
      if (!existing) {
        latestActiveByDeal.set(c.deal_id, c.id)
      } else {
        const cur = contractById.get(existing)
        if (cur && new Date(c.created_at) > new Date(cur.created_at)) {
          latestActiveByDeal.set(c.deal_id, c.id)
        }
      }
    }
  }

  return Array.from(map.entries()).map(([contractId, installments]) => {
    const contract    = contractById.get(contractId)
    const dealId      = contract?.deal_id ?? installments[0]?.deal_id ?? ''
    const sorted      = [...installments].sort((a, b) => a.installment_no - b.installment_no)
    const paidCount   = sorted.filter(r => r.status === 'paid').length
    const overdueCount = sorted.filter(r => r.status === 'overdue').length
    const pendingCount = sorted.filter(r => r.status === 'pending').length
    const paidValue   = sorted.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
    const pendingValue = sorted.filter(r => r.status !== 'paid').reduce((s, r) => s + r.amount, 0)
    const totalValue  = contract?.value ?? sorted.reduce((s, r) => s + r.amount, 0)
    const nextDue     = sorted.find(r => r.status === 'pending' || r.status === 'overdue') ?? null
    let overallStatus: ContractGroup['overallStatus'] = 'pending'
    if (sorted.length > 0 && paidCount === sorted.length) overallStatus = 'paid'
    else if (overdueCount > 0)                            overallStatus = 'overdue'
    else if (paidCount > 0 && pendingCount > 0)           overallStatus = 'partial'
    const companyName = (contract as EnrichedContract)?.deals?.company_name ?? sorted[0]?.deal_company_name ?? '—'
    const contactName = (contract as EnrichedContract)?.deals?.contact_name ?? sorted[0]?.deal_contact_name ?? null
    return {
      dealId, contractId,
      companyName, contactName,
      totalValue, installments: sorted,
      paidCount, overdueCount, pendingCount,
      overallStatus, nextDue, paidValue, pendingValue,
      signedAt:         contract?.signed_at,
      signingStatus:    contract?.signing_status ?? 'unsigned',
      createdAt:        contract?.created_at,
      deliveryStatus:   contract?.delivery_status ?? 'pending',
      deliveryNotes:    contract?.delivery_notes,
      signingToken:     contract?.signing_token,
      contractStatus:   contract?.status ?? 'active',
      isCurrentForDeal: latestActiveByDeal.get(dealId) === contractId,
    }
  })
}

// ─── Status configs ───────────────────────────────────────────────────────────

const CONTRACT_STATUS = {
  paid:    { label: 'Pago',       color: '#2c5545', bg: 'rgba(44,85,69,0.12)',   icon: CheckCircle },
  overdue: { label: 'Em atraso',  color: '#b83535', bg: 'rgba(184,53,53,0.12)',  icon: AlertCircle },
  partial: { label: 'Parcial',    color: '#a88030', bg: 'rgba(168,128,48,0.12)', icon: Clock },
  pending: { label: 'Pendente',   color: '#4d7aa8', bg: 'rgba(77,122,168,0.12)', icon: Clock },
} as const

const DELIVERY_CFG: Record<DeliveryStatus, { label: string; short: string; color: string; bg: string; icon: typeof Package }> = {
  pending:     { label: 'Aguardando entrega', short: 'Aguardando', color: '#6b6560', bg: 'rgba(107,101,96,0.10)', icon: Package },
  in_progress: { label: 'Em entrega',         short: 'Em entrega', color: '#a88030', bg: 'rgba(168,128,48,0.12)', icon: Truck },
  delivered:   { label: 'Entregue',           short: 'Entregue',   color: '#2c5545', bg: 'rgba(44,85,69,0.12)',   icon: PartyPopper },
  cancelled:   { label: 'Cancelado',          short: 'Cancelado',  color: '#b83535', bg: 'rgba(184,53,53,0.12)',  icon: X },
}

// ─── Mini Status Pipeline (table column) ─────────────────────────────────────

function MiniPipeline({ group, isDark }: { group: ContractGroup; isDark: boolean }) {
  const steps = [
    { label: 'Contrato',  done: true,                                     active: false },
    { label: 'Assinado',  done: group.signingStatus === 'signed',         active: group.signingStatus === 'pending_signature' },
    { label: 'Pago',      done: group.overallStatus === 'paid',           active: group.paidCount > 0 && group.overallStatus !== 'paid' },
    { label: 'Entregue',  done: group.deliveryStatus === 'delivered',     active: group.deliveryStatus === 'in_progress' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
      {steps.map((step, i) => {
        const color = step.done ? '#2c5545' : step.active ? '#a88030' : (isDark ? '#2a2a28' : '#dddad5')
        const isLast = i === steps.length - 1
        return (
          <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: color,
                boxShadow: step.done ? `0 0 0 2px ${color}30` : 'none',
                transition: 'all 0.2s',
              }} />
              <span style={{ fontSize: '8px', color: step.done ? color : (isDark ? '#3a3a38' : '#b0aba4'), fontWeight: step.done ? 700 : 400, whiteSpace: 'nowrap' }}>{step.label}</span>
            </div>
            {!isLast && (
              <div style={{ width: '16px', height: '1.5px', backgroundColor: step.done ? '#2c5545' : (isDark ? '#2a2a28' : '#dddad5'), marginBottom: '12px', transition: 'all 0.2s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Contract Funnel ──────────────────────────────────────────────────────────

type FunnelKey = 'accepted' | 'signed' | 'paying' | 'paid' | 'delivered'

const FUNNEL_STAGES: { key: FunnelKey; label: string; sub: string; color: string; icon: typeof FileText; match: (g: ContractGroup) => boolean }[] = [
  { key: 'accepted',  label: 'Proposta Aceite',   sub: 'Contrato gerado',        color: '#4d7aa8', icon: FileText,    match: g => g.contractStatus === 'active' || g.contractStatus === 'completed' },
  { key: 'signed',    label: 'Assinado',           sub: 'Contrato assinado',      color: '#6b4c8b', icon: PenLine,     match: g => g.signingStatus === 'signed' },
  { key: 'paying',    label: 'Pagando',            sub: 'Parcelas em andamento',  color: '#a88030', icon: CreditCard,  match: g => g.paidCount > 0 && g.overallStatus !== 'paid' },
  { key: 'paid',      label: 'Pago',               sub: 'Totalmente liquidado',   color: '#2c5545', icon: CheckCircle, match: g => g.overallStatus === 'paid' },
  { key: 'delivered', label: 'Entregue',           sub: 'Processo concluído',     color: '#2c7a5e', icon: PartyPopper, match: g => g.deliveryStatus === 'delivered' },
]

function ContractFunnel({ groups, isDark, border, text, muted, cardBg, activeKey, onSelect }: {
  groups: ContractGroup[]
  isDark: boolean; border: string; text: string; muted: string; cardBg: string
  activeKey: FunnelKey | 'all'
  onSelect: (k: FunnelKey | 'all') => void
}) {
  const stages = FUNNEL_STAGES.map(s => ({
    ...s,
    count: groups.filter(s.match).length,
    value: groups.filter(s.match).reduce((acc, g) => acc + g.totalValue, 0),
  }))
  const max = Math.max(...stages.map(s => s.count), 1)

  return (
    <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '18px 22px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Funil de Contratos</p>
        {activeKey !== 'all' && (
          <button type="button" onClick={() => onSelect('all')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '22px', padding: '0 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted }}>
            <X style={{ width: '9px', height: '9px' }} /> Limpar
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
        {stages.map((stage, i) => {
          const isActive = activeKey === stage.key
          const pct = Math.round((stage.count / max) * 100)
          const Icon = stage.icon
          const isLast = i === stages.length - 1
          return (
            <div key={stage.key} style={{ position: 'relative' }}>
              <button type="button" onClick={() => onSelect(isActive ? 'all' : stage.key)}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '14px 16px', borderRadius: '12px', border: `1.5px solid ${isActive ? stage.color : border}`, backgroundColor: isActive ? stage.color + '12' : (isDark ? '#141412' : '#faf9f7'), cursor: 'pointer', textAlign: 'left', overflow: 'hidden', transition: 'all 0.15s', boxSizing: 'border-box' }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = stage.color + '60'; e.currentTarget.style.backgroundColor = stage.color + '08' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = border; e.currentTarget.style.backgroundColor = isDark ? '#141412' : '#faf9f7' } }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', backgroundColor: isActive ? stage.color + '25' : stage.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: '14px', height: '14px', color: stage.color }} />
                  </div>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: isActive ? stage.color : text, letterSpacing: '-0.03em' }}>{stage.count}</span>
                </div>

                <p style={{ fontSize: '11px', fontWeight: 700, color: isActive ? stage.color : text, marginBottom: '2px', lineHeight: 1.2 }}>{stage.label}</p>
                <p style={{ fontSize: '10px', color: muted, marginBottom: '10px' }}>{stage.sub}</p>

                <div style={{ width: '100%', height: '4px', borderRadius: '4px', backgroundColor: isDark ? '#242422' : '#e8e4de', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: stage.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </button>
              {!isLast && (
                <div style={{ position: 'absolute', right: '-14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1, color: isDark ? '#2a2a28' : '#ccc8c2', pointerEvents: 'none' }}>
                  <ChevronRight style={{ width: '12px', height: '12px' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Copy Link Button ─────────────────────────────────────────────────────────

function CopyLinkButton({ signingToken, isDark, border, muted }: { signingToken: string; isDark: boolean; border: string; muted: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button type="button"
      onClick={() => {
        const url = `${window.location.origin}/assinar/${signingToken}`
        navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      }}
      title="Copiar link do contrato"
      style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '30px', padding: '0 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${copied ? '#2c5545' : border}`, backgroundColor: copied ? 'rgba(44,85,69,0.10)' : (isDark ? '#161614' : '#f7f6f3'), color: copied ? '#2c5545' : muted, whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s' }}>
      <Copy style={{ width: '11px', height: '11px' }} />
      {copied ? 'Copiado!' : 'Link'}
    </button>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  group, isDark, onClose, onMarkPaid, onSign, onPendingSign, onSetDelivery, paying, signing,
}: {
  group: ContractGroup
  isDark: boolean
  onClose: () => void
  onMarkPaid: (id: string) => void
  onSign: (contractId: string) => void
  onPendingSign: (contractId: string) => void
  onSetDelivery: (contractId: string, status: DeliveryStatus) => void
  paying: string | null
  signing: boolean
}) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const border   = isDark ? '#242422' : '#e8e4de'
  const text     = isDark ? '#e8e4dc' : '#1a1814'
  const muted    = isDark ? '#6b6560' : '#8a857d'
  const cardBg   = isDark ? '#111110' : '#ffffff'
  const subtleBg = isDark ? '#161614' : '#f7f6f3'
  const avatarColor = hashColor(group.companyName)
  const pct = group.installments.length > 0
    ? Math.round((group.paidCount / group.installments.length) * 100) : 0
  const allPaid = group.paidCount === group.installments.length && group.installments.length > 0
  const delivCfg = DELIVERY_CFG[group.deliveryStatus]
  const DelivIcon = delivCfg.icon

  // Build history timeline from available data
  const historyEvents = useMemo(() => {
    const events: { date: string; label: string; sub: string; color: string; icon: typeof CheckCircle }[] = []
    if (group.createdAt)
      events.push({ date: group.createdAt, label: 'Contrato gerado', sub: 'Proposta aceite automaticamente', color: '#4d7aa8', icon: FileText })
    if (group.signingStatus === 'pending_signature')
      events.push({ date: new Date().toISOString(), label: 'Aguardando assinatura', sub: 'Contrato enviado ao cliente', color: '#a88030', icon: PenLine })
    if (group.signingStatus === 'signed' && group.signedAt)
      events.push({ date: group.signedAt, label: 'Contrato assinado', sub: 'Assinatura confirmada', color: '#6b4c8b', icon: PenLine })
    group.installments
      .filter(p => p.status === 'paid' && p.paid_at)
      .forEach(p => events.push({ date: p.paid_at!, label: `Parcela #${p.installment_no} recebida`, sub: fmtBRLFull(p.amount), color: '#2c5545', icon: CreditCard }))
    if (group.deliveryStatus === 'in_progress')
      events.push({ date: new Date().toISOString(), label: 'Entrega iniciada', sub: 'Serviço em andamento', color: '#a88030', icon: Truck })
    if (group.deliveryStatus === 'delivered')
      events.push({ date: new Date().toISOString(), label: 'Entrega concluída', sub: 'Processo encerrado', color: '#2c5545', icon: PartyPopper })
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [group])

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', zIndex: 50,
      backgroundColor: isDark ? '#0f0e0c' : '#ffffff',
      borderLeft: `1px solid ${border}`,
      display: 'flex', flexDirection: 'column',
      boxShadow: '-12px 0 48px rgba(0,0,0,0.18)',
      animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${border}`, flexShrink: 0, backgroundColor: isDark ? '#0f0e0c' : '#fafaf8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Detalhes do Contrato</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {group.signingToken ? (
              <>
                <button type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/assinar/${group.signingToken}`
                    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', padding: '0 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${copied ? '#2c5545' : border}`, backgroundColor: copied ? 'rgba(44,85,69,0.1)' : 'transparent', color: copied ? '#2c5545' : muted, transition: 'all 0.2s' }}>
                  {copied ? '✓ Copiado' : 'Copiar link'}
                </button>
                <button type="button"
                  onClick={() => window.open(`/assinar/${group.signingToken}`, '_blank')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', padding: '0 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#2c5545', color: '#fff' }}>
                  <Download style={{ width: '11px', height: '11px' }} /> Baixar contrato
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => navigate(`/deal/${group.dealId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', padding: '0 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted }}>
              Ver deal <ArrowUpRight style={{ width: '11px', height: '11px' }} />
            </button>
            <button type="button" onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', color: muted }}>
              <X style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        </div>

        {/* 4 Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { icon: FileText,   iconColor: '#4d7aa8', iconBg: 'rgba(77,122,168,0.12)',   label: 'ID do Contrato',  value: group.contractId ? `#${group.contractId.slice(0, 8)}` : '—' },
            { icon: DollarSign, iconColor: '#2c5545', iconBg: 'rgba(44,85,69,0.12)',     label: 'Valor Total',     value: fmtBRLFull(group.totalValue) },
            { icon: Calendar,   iconColor: '#a88030', iconBg: 'rgba(168,128,48,0.12)',   label: 'Criado em',       value: group.createdAt ? fmtDate(group.createdAt) : '—' },
            { icon: () => (
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: avatarColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: avatarColor, flexShrink: 0 }}>
                  {initials(group.companyName)}
                </div>
              ), iconColor: avatarColor, iconBg: avatarColor + '15', label: 'Empresa', value: group.companyName, isAvatar: true },
          ].map((card, i) => {
            const Icon = card.icon as typeof FileText
            return (
              <div key={i} style={{ backgroundColor: subtleBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {card.isAvatar ? (
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: avatarColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: avatarColor, flexShrink: 0 }}>
                    {initials(group.companyName)}
                  </div>
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: '14px', height: '14px', color: card.iconColor }} />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>{card.label}</p>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.value}</p>
                </div>
              </div>
            )
          })}
        </div>
        {group.contactName && (
          <p style={{ fontSize: '11px', color: muted, marginTop: '8px' }}>Contacto: <strong style={{ color: text }}>{group.contactName}</strong></p>
        )}
      </div>

      {/* ── Scroll body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

        {/* ── Status resumo ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div style={{ flex: 1, borderRadius: '10px', padding: '12px 14px', border: `1.5px solid ${group.signingStatus === 'signed' ? 'rgba(107,76,139,0.35)' : group.signingStatus === 'pending_signature' ? 'rgba(168,128,48,0.35)' : border}`, backgroundColor: group.signingStatus === 'signed' ? 'rgba(107,76,139,0.07)' : group.signingStatus === 'pending_signature' ? 'rgba(168,128,48,0.07)' : subtleBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <PenLine style={{ width: '11px', height: '11px', color: group.signingStatus === 'signed' ? '#6b4c8b' : group.signingStatus === 'pending_signature' ? '#a88030' : muted }} />
              <span style={{ fontSize: '9px', fontWeight: 700, color: group.signingStatus === 'signed' ? '#6b4c8b' : group.signingStatus === 'pending_signature' ? '#a88030' : muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {group.signingStatus === 'signed' ? 'Assinado' : group.signingStatus === 'pending_signature' ? 'Aguardando' : 'Não assinado'}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: group.signingStatus === 'signed' ? '#6b4c8b' : muted }}>
              {group.signingStatus === 'signed' && group.signedAt ? fmtDate(group.signedAt) : group.signingStatus === 'pending_signature' ? 'Envio pendente' : 'Sem assinatura'}
            </p>
          </div>
          <div style={{ flex: 1, borderRadius: '10px', padding: '12px 14px', border: `1.5px solid ${allPaid ? 'rgba(44,85,69,0.35)' : group.overdueCount > 0 ? 'rgba(184,53,53,0.35)' : border}`, backgroundColor: allPaid ? 'rgba(44,85,69,0.07)' : group.overdueCount > 0 ? 'rgba(184,53,53,0.05)' : subtleBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <CreditCard style={{ width: '11px', height: '11px', color: allPaid ? '#2c5545' : group.overdueCount > 0 ? '#b83535' : muted }} />
              <span style={{ fontSize: '9px', fontWeight: 700, color: allPaid ? '#2c5545' : group.overdueCount > 0 ? '#b83535' : muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {allPaid ? 'Pago' : group.overdueCount > 0 ? 'Em atraso' : 'Pendente'}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: allPaid ? '#2c5545' : group.overdueCount > 0 ? '#b83535' : muted }}>
              {group.paidCount}/{group.installments.length} parcelas · {fmtBRL(group.paidValue)}
            </p>
          </div>
        </div>

        {/* ── Leitura Financeira ── */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px 18px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <TrendingUp style={{ width: '12px', height: '12px', color: '#2c5545' }} />
            <p style={{ fontSize: '11px', fontWeight: 700, color: text }}>Leitura Financeira</p>
          </div>
          {[
            { label: 'Total estimado', value: fmtBRLFull(group.totalValue), color: text },
            { label: 'Recebido',       value: fmtBRLFull(group.paidValue),   color: '#2c5545' },
            { label: 'A receber',      value: fmtBRLFull(group.pendingValue), color: group.overdueCount > 0 ? '#b83535' : '#4d7aa8' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '9px', marginBottom: '9px', borderBottom: `1px solid ${border}` }}>
              <span style={{ fontSize: '12px', color: muted }}>{item.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: item.color }}>{item.value}</span>
            </div>
          ))}
          <div style={{ marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: muted }}>Progresso de pagamento</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: text }}>{pct}% · {group.paidCount}/{group.installments.length}</span>
            </div>
            <div style={{ height: '6px', borderRadius: '10px', backgroundColor: isDark ? '#242422' : '#e8e4de', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct === 100 ? '#2c5545' : '#4d7aa8', borderRadius: '10px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </div>

        {/* ── Progresso do Contrato ── */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px 18px', marginBottom: '14px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Progresso</p>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '13px', top: '20px', bottom: '20px', width: '2px', backgroundColor: isDark ? '#242422' : '#e8e4de', zIndex: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { label: 'Proposta aceite',    detail: 'Contrato criado automaticamente', done: true,   inProgress: false, color: '#2c5545', icon: FileText },
                { label: 'Contrato assinado',  detail: group.signingStatus === 'signed' ? (group.signedAt ? `Assinado ${fmtDate(group.signedAt)}` : 'Assinado') : group.signingStatus === 'pending_signature' ? 'Aguardando assinatura do cliente' : 'Aguardando assinatura', done: group.signingStatus === 'signed', inProgress: group.signingStatus === 'pending_signature', color: '#6b4c8b', icon: PenLine },
                { label: 'Pagamento completo', detail: `${group.paidCount}/${group.installments.length} parcelas pagas`, done: allPaid, inProgress: group.paidCount > 0 && !allPaid, color: '#2c5545', icon: CreditCard },
                { label: 'Em entrega',         detail: 'Serviço a ser prestado', done: group.deliveryStatus === 'in_progress' || group.deliveryStatus === 'delivered', inProgress: false, color: '#a88030', icon: Truck },
                { label: 'Entregue',           detail: 'Processo concluído', done: group.deliveryStatus === 'delivered', inProgress: false, color: '#2c5545', icon: PartyPopper },
              ].map((step, i, arr) => {
                const StepIcon = step.icon
                const isLast = i === arr.length - 1
                const circleColor = step.done ? step.color : step.inProgress ? '#a88030' : (isDark ? '#2a2a28' : '#d0ccc6')
                const circleBg    = step.done ? step.color : step.inProgress ? 'rgba(168,128,48,0.12)' : (isDark ? '#1a1a18' : '#f0ede8')
                const iconColor   = step.done ? '#fff' : step.inProgress ? '#a88030' : (isDark ? '#3a3a38' : '#aaa')
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative', zIndex: 1, paddingBottom: isLast ? 0 : '14px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, backgroundColor: circleBg, border: `2px solid ${circleColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: step.done ? `0 0 0 3px ${step.color}18` : 'none' }}>
                      <StepIcon style={{ width: '11px', height: '11px', color: iconColor }} />
                    </div>
                    <div style={{ flex: 1, paddingTop: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: step.done ? 600 : 400, color: step.done ? text : muted }}>{step.label}</span>
                        {i === 1 && group.signingStatus !== 'signed' && group.contractId && (
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            {group.signingStatus === 'unsigned' && (
                              <button type="button" disabled={signing} onClick={() => onPendingSign(group.contractId!)}
                                style={{ height: '22px', padding: '0 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, cursor: signing ? 'not-allowed' : 'pointer', border: `1px solid #a88030`, backgroundColor: 'rgba(168,128,48,0.1)', color: '#a88030', opacity: signing ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                                Enviar
                              </button>
                            )}
                            <button type="button" disabled={signing} onClick={() => onSign(group.contractId!)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '22px', padding: '0 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, cursor: signing ? 'not-allowed' : 'pointer', border: 'none', backgroundColor: '#2c5545', color: '#fff', opacity: signing ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                              <Pen style={{ width: '9px', height: '9px' }} />
                              {signing ? '...' : 'Confirmar'}
                            </button>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '10px', color: step.done ? step.color : step.inProgress ? '#a88030' : muted, marginTop: '1px' }}>{step.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Estado de Entrega ── */}
        {group.contractId && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px 18px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estado de Entrega</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: delivCfg.bg, borderRadius: '20px', padding: '3px 10px' }}>
                <DelivIcon style={{ width: '10px', height: '10px', color: delivCfg.color }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: delivCfg.color }}>{delivCfg.short}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['pending','in_progress','delivered'] as DeliveryStatus[]).map(s => {
                const cfg = DELIVERY_CFG[s]
                const active = group.deliveryStatus === s
                return (
                  <button key={s} type="button" onClick={() => onSetDelivery(group.contractId!, s)}
                    style={{ height: '26px', padding: '0 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? cfg.color : border}`, backgroundColor: active ? cfg.bg : 'transparent', color: active ? cfg.color : muted, transition: 'all 0.15s' }}>
                    {cfg.label}
                  </button>
                )
              })}
            </div>
            {group.deliveryNotes && (
              <p style={{ fontSize: '11px', color: muted, marginTop: '10px', fontStyle: 'italic' }}>{group.deliveryNotes}</p>
            )}
            {group.deliveryStatus === 'delivered' && (
              <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(44,85,69,0.08)', border: '1px solid rgba(44,85,69,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#2c5545', marginBottom: '2px' }}>Entrega concluída</p>
                  <p style={{ fontSize: '11px', color: '#2c5545', opacity: 0.7 }}>Cliente pronto para Renovação</p>
                </div>
                <button type="button" onClick={() => { localStorage.setItem('esq_pipeline_view', 'renovacao'); navigate('/pipeline') }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '30px', padding: '0 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: '#2c5545', color: '#fff', whiteSpace: 'nowrap' }}>
                  Renovação <ChevronRight style={{ width: '12px', height: '12px' }} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Parcelas ── */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Parcelas · {group.installments.length}
            </p>
            <span style={{ fontSize: '10px', color: muted }}>{group.paidCount} pag. · {fmtBRL(group.paidValue)} recebido</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '6px' }}>
            {group.installments.map((inst) => {
              const cfg = CONTRACT_STATUS[inst.status as keyof typeof CONTRACT_STATUS] ?? CONTRACT_STATUS.pending
              const isPaying = paying === inst.id
              const canPay = inst.status === 'pending' || inst.status === 'overdue'
              const due = daysUntil(inst.due_date)
              return (
                <div key={inst.id}
                  style={{ borderRadius: '10px', border: `1.5px solid ${inst.status === 'paid' ? 'rgba(44,85,69,0.30)' : inst.status === 'overdue' ? 'rgba(184,53,53,0.30)' : border}`, backgroundColor: inst.status === 'paid' ? 'rgba(44,85,69,0.06)' : inst.status === 'overdue' ? 'rgba(184,53,53,0.04)' : subtleBg, padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>#{inst.installment_no}</span>
                    <span style={{ fontSize: '8px', fontWeight: 700, color: cfg.color, backgroundColor: cfg.bg, borderRadius: '4px', padding: '1px 5px' }}>{cfg.label}</span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: inst.status === 'paid' ? '#2c5545' : text, letterSpacing: '-0.02em' }}>{fmtBRL(inst.amount)}</p>
                  <p style={{ fontSize: '9px', color: inst.status === 'paid' && inst.paid_at ? '#2c5545' : due.urgent ? '#b83535' : muted }}>
                    {inst.status === 'paid' && inst.paid_at ? `✓ ${fmtDateShort(inst.paid_at)}` : fmtDateShort(inst.due_date)}
                  </p>
                  {canPay && (
                    <button type="button" disabled={isPaying} onClick={() => onMarkPaid(inst.id)}
                      style={{ marginTop: '2px', height: '22px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, cursor: isPaying ? 'not-allowed' : 'pointer', border: 'none', backgroundColor: inst.status === 'overdue' ? '#b83535' : '#2c5545', color: '#fff', opacity: isPaying ? 0.6 : 1, width: '100%' }}>
                      {isPaying ? '...' : 'Marcar pago'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {allPaid && (
            <div style={{ marginTop: '10px', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(44,85,69,0.08)', border: '1px solid rgba(44,85,69,0.25)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PartyPopper style={{ width: '14px', height: '14px', color: '#2c5545', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#2c5545' }}>Contrato liquidado!</p>
                <p style={{ fontSize: '10px', color: '#2c5545', opacity: 0.75 }}>Todos os pagamentos recebidos.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Histórico da Compra ── */}
        {historyEvents.length > 0 && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px 18px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <History style={{ width: '12px', height: '12px', color: muted }} />
              <p style={{ fontSize: '11px', fontWeight: 700, color: text }}>Histórico da Compra</p>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '11px', top: '16px', bottom: '8px', width: '1.5px', backgroundColor: isDark ? '#2a2a28' : '#e8e4de', zIndex: 0 }} />
              {historyEvents.map((ev, i) => {
                const EvIcon = ev.icon
                const isLast = i === historyEvents.length - 1
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', position: 'relative', zIndex: 1, paddingBottom: isLast ? 0 : '14px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, backgroundColor: ev.color + '18', border: `1.5px solid ${ev.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <EvIcon style={{ width: '10px', height: '10px', color: ev.color }} />
                    </div>
                    <div style={{ flex: 1, paddingTop: '2px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: text }}>{ev.label}</p>
                      <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>{ev.sub}</p>
                      <p style={{ fontSize: '9px', color: isDark ? '#3a3a38' : '#b8b3ac', marginTop: '2px' }}>{fmtDateTime(ev.date)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Status Tab type ──────────────────────────────────────────────────────────

type StatusTab = 'all' | 'unsigned' | 'awaiting_payment' | 'overdue' | 'delivered'

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AdminCobrancaPage() {
  const isDark = useThemeStore((s) => s.isDark)
  const { payInstallment, signContract, setDeliveryStatus, initialize } = usePaymentStore()

  const border   = isDark ? '#242422' : '#e8e4de'
  const text     = isDark ? '#e8e4dc' : '#1a1814'
  const muted    = isDark ? '#6b6560' : '#8a857d'
  const cardBg   = isDark ? '#111110' : '#ffffff'
  const pageBg   = isDark ? '#0d0c0a' : '#f5f4f0'
  const subtleBg = isDark ? '#161614' : '#faf9f7'
  const inputBg  = isDark ? '#1a1a18' : '#f0ede8'

  // Fonte única de verdade: store (realtime granular, sem polling)
  const storeContracts = usePaymentStore((s) => s.contracts)
  const storePayments  = usePaymentStore((s) => s.payments)
  const loading        = usePaymentStore((s) => s.loading)
  const deals          = useDealStore((s) => s.deals)

  const [search, setSearch]             = useState('')
  const [paying, setPaying]             = useState<string | null>(null)
  const [signing, setSigning]           = useState(false)
  const [selected, setSelected]         = useState<ContractGroup | null>(null)
  const [statusTab, setStatusTab]       = useState<StatusTab>('all')
  const [funnelKey, setFunnelKey]       = useState<FunnelKey | 'all'>('all')
  const [showHistory, setShowHistory]   = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const dateFromRef = useRef<HTMLInputElement>(null)
  const dateToRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Enriquecer contratos com info do deal (join em memória — sem query extra)
  const localContracts = useMemo((): EnrichedContract[] => {
    const dealMap = new Map(deals.map(d => [d.id, d]))
    return storeContracts.map(c => ({
      ...c,
      deals: {
        company_name: dealMap.get(c.deal_id)?.company_name ?? dealMap.get(c.deal_id)?.title ?? null,
        contact_name: dealMap.get(c.deal_id)?.contact_name ?? null,
      },
    }))
  }, [storeContracts, deals])

  // Enriquecer pagamentos com info do deal (join em memória)
  const rows = useMemo((): PaymentWithDeal[] => {
    const dealMap = new Map(deals.map(d => [d.id, d]))
    return storePayments.map(p => ({
      ...p,
      deal_company_name: dealMap.get(p.deal_id)?.company_name ?? dealMap.get(p.deal_id)?.title ?? '—',
      deal_contact_name: dealMap.get(p.deal_id)?.contact_name ?? null,
    }))
  }, [storePayments, deals])

  const handleMarkPaid = useCallback(async (paymentId: string) => {
    setPaying(paymentId)
    await payInstallment(paymentId)
    setPaying(null)
  }, [payInstallment])

  const handleSign = useCallback(async (contractId: string) => {
    setSigning(true)
    await signContract(contractId)
    setSigning(false)
  }, [signContract])

  const handlePendingSign = useCallback(async (contractId: string) => {
    const { updateContract } = usePaymentStore.getState()
    await updateContract(contractId, { signing_status: 'pending_signature' })
  }, [])

  const handleSetDelivery = useCallback(async (contractId: string, status: DeliveryStatus) => {
    await setDeliveryStatus(contractId, status)
  }, [setDeliveryStatus])

  const groups = useMemo(() => groupByContract(rows, localContracts), [rows, localContracts])

  // Auto-actualizar painel quando o contrato selecionado é pausado/substituído
  useEffect(() => {
    if (!selected) return
    const updated = groups.find(g => g.contractId === selected.contractId)
    if (!updated) { setSelected(null); return }
    // Se o contrato activo foi substituído por um novo, saltar automaticamente para o novo
    if (updated.contractStatus === 'paused' || updated.contractStatus === 'cancelled') {
      const newActive = groups.find(
        g => g.dealId === updated.dealId &&
        (g.contractStatus === 'active' || g.contractStatus === 'completed') &&
        g.contractId !== updated.contractId
      )
      if (newActive) { setSelected(newActive); return }
    }
    setSelected(updated)
  }, [groups]) // eslint-disable-line

  // KPIs — só contratos activos/completos
  const activeGroups = useMemo(() => groups.filter(g => g.contractStatus === 'active' || g.contractStatus === 'completed'), [groups])
  const totalVol     = activeGroups.reduce((s, g) => s + g.totalValue, 0)
  const totalPaid    = activeGroups.reduce((s, g) => s + g.paidValue, 0)
  const totalPending = activeGroups.reduce((s, g) => s + g.pendingValue - (g.installments.filter(i => i.status === 'overdue').reduce((a, i) => a + i.amount, 0)), 0)
  const totalOverdue = activeGroups.reduce((s, g) => s + g.installments.filter(i => i.status === 'overdue').reduce((a, i) => a + i.amount, 0), 0)

  // Status tab definitions
  const STATUS_TABS: { key: StatusTab; label: string; match: (g: ContractGroup) => boolean }[] = [
    { key: 'all',             label: 'Todos',           match: () => true },
    { key: 'unsigned',        label: 'Não assinados',   match: g => g.signingStatus !== 'signed' },
    { key: 'awaiting_payment',label: 'Aguard. pagamento', match: g => g.overallStatus === 'pending' || g.overallStatus === 'partial' },
    { key: 'overdue',         label: 'Em atraso',       match: g => g.overdueCount > 0 },
    { key: 'delivered',       label: 'Entregues',       match: g => g.deliveryStatus === 'delivered' },
  ]

  const visible = useMemo(() => {
    let list = groups

    // Se não está em modo histórico, só mostra contratos activos/completos
    if (!showHistory) {
      list = list.filter(g => g.contractStatus === 'active' || g.contractStatus === 'completed')
    }

    // Funnel filter (só faz sentido para contratos activos)
    if (funnelKey !== 'all') {
      const fs = FUNNEL_STAGES.find(s => s.key === funnelKey)
      if (fs) list = list.filter(fs.match)
    }

    // Status tab filter
    const tabCfg = STATUS_TABS.find(t => t.key === statusTab)
    if (tabCfg && statusTab !== 'all') list = list.filter(tabCfg.match)

    // Date range filter
    const dateInverted = !!(dateFrom && dateTo && dateFrom > dateTo)
    if (!dateInverted) {
      if (dateFrom) {
        const from = new Date(dateFrom).getTime()
        list = list.filter(g => g.createdAt ? new Date(g.createdAt).getTime() >= from : false)
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59').getTime()
        list = list.filter(g => g.createdAt ? new Date(g.createdAt).getTime() <= to : false)
      }
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g => g.companyName.toLowerCase().includes(q) || (g.contactName ?? '').toLowerCase().includes(q))
    }

    // Ordenar: activos primeiro, depois por data desc
    return [...list].sort((a, b) => {
      const aActive = a.contractStatus === 'active' ? 0 : 1
      const bActive = b.contractStatus === 'active' ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    })
  }, [groups, showHistory, funnelKey, statusTab, dateFrom, dateTo, search])

  const kpis = [
    { label: 'Total de Vendas',    value: totalVol,     sub: `${activeGroups.length} contrato${activeGroups.length !== 1 ? 's' : ''} activo${activeGroups.length !== 1 ? 's' : ''}`, color: '#4d7aa8', icon: TrendingUp },
    { label: 'Receita Confirmada', value: totalPaid,    sub: `${activeGroups.reduce((s, g) => s + g.paidCount, 0)} parcelas pagas`, color: '#2c5545', icon: CheckCircle },
    { label: 'Pendente Pagamento', value: totalPending, sub: `${activeGroups.reduce((s, g) => s + g.pendingCount, 0)} pendentes`, color: '#a88030', icon: DollarSign },
    { label: 'Em Atraso',          value: totalOverdue, sub: `${activeGroups.reduce((s, g) => s + g.overdueCount, 0)} vencidas`, color: '#b83535', icon: AlertCircle },
  ]

  return (
    <>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        .esq-date::-webkit-calendar-picker-indicator { display: none; }
      `}</style>
      <div style={{ minHeight: '100%', backgroundColor: pageBg, padding: 'clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)', marginRight: selected ? '460px' : 0, transition: 'margin-right 0.22s cubic-bezier(0.16,1,0.3,1)', boxSizing: 'border-box' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: text, letterSpacing: '-0.025em', marginBottom: '3px' }}>Cobrança</h1>
            <p style={{ fontSize: '13px', color: muted }}>Contratos, pagamentos e entregas</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" onClick={() => setShowHistory(h => !h)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${showHistory ? '#a88030' : border}`, backgroundColor: showHistory ? 'rgba(168,128,48,0.10)' : 'transparent', color: showHistory ? '#a88030' : muted, transition: 'all 0.15s' }}>
              <History style={{ width: '13px', height: '13px' }} />
              {showHistory ? 'Ocultar histórico' : 'Ver histórico'}
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '22px' }}>
          {kpis.map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '13px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: '16px', height: '16px', color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{label}</p>
                <p style={{ fontSize: '19px', fontWeight: 700, color: text, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{fmtBRL(value)}</p>
                <p style={{ fontSize: '10px', color: muted, marginTop: '3px' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <>
            {/* ── Funnel ── */}
            <ContractFunnel groups={activeGroups} isDark={isDark} border={border} text={text} muted={muted} cardBg={cardBg} activeKey={funnelKey} onSelect={setFunnelKey} />

            {/* ── Status Tabs + Month Picker + Search ── */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '16px 20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>

                {/* Status tabs */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {STATUS_TABS.map(tab => {
                    const count = groups.filter(tab.match).length
                    const isActive = statusTab === tab.key
                    return (
                      <button key={tab.key} type="button" onClick={() => setStatusTab(tab.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${isActive ? '#2c5545' : border}`, backgroundColor: isActive ? 'rgba(44,85,69,0.10)' : 'transparent', color: isActive ? '#2c5545' : muted, transition: 'all 0.15s' }}>
                        {tab.label}
                        <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: isActive ? 'rgba(44,85,69,0.15)' : (isDark ? '#1e1e1c' : '#f0ede8'), color: isActive ? '#2c5545' : muted, borderRadius: '20px', padding: '1px 7px' }}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Right: date range + search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Date range picker */}
                  {(() => {
                    const inverted = !!(dateFrom && dateTo && dateFrom > dateTo)
                    const c = inverted ? '#b83535' : (dateFrom || dateTo) ? '#2c5545' : (isDark ? '#9a9590' : '#4a4540')
                    const activeBorder = inverted ? '#b83535' : (dateFrom || dateTo) ? '#2c5545' : border
                    const activeBg = inverted ? 'rgba(184,53,53,0.06)' : (dateFrom || dateTo) ? 'rgba(44,85,69,0.06)' : (isDark ? '#161614' : '#f7f6f3')
                    const fieldStyle: React.CSSProperties = { border: 'none', backgroundColor: 'transparent', fontSize: '12px', outline: 'none', cursor: 'pointer', width: '110px' }
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${activeBorder}`, borderRadius: '8px', overflow: 'hidden', backgroundColor: activeBg, transition: 'all 0.15s' }}>
                        {/* De */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 10px', borderRight: `1px solid ${border}`, height: '32px' }}>
                          <Calendar onClick={() => dateFromRef.current?.showPicker()} style={{ width: '12px', height: '12px', color: c, flexShrink: 0, cursor: 'pointer' }} />
                          <input ref={dateFromRef} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="esq-date"
                            style={{ ...fieldStyle, color: inverted ? '#b83535' : dateFrom ? text : muted }} />
                        </div>
                        {/* Separador */}
                        <span style={{ padding: '0 8px', fontSize: '11px', color: inverted ? '#b83535' : muted, userSelect: 'none', flexShrink: 0 }}>–</span>
                        {/* Até */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 10px', height: '32px' }}>
                          <Calendar onClick={() => dateToRef.current?.showPicker()} style={{ width: '12px', height: '12px', color: c, flexShrink: 0, cursor: 'pointer' }} />
                          <input ref={dateToRef} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="esq-date"
                            style={{ ...fieldStyle, color: inverted ? '#b83535' : dateTo ? text : muted }} />
                        </div>
                        {(dateFrom || dateTo) && (
                          <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }}
                            style={{ width: '28px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderLeft: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', color: muted, flexShrink: 0 }}>
                            <X style={{ width: '11px', height: '11px' }} />
                          </button>
                        )}
                      </div>
                    )
                  })()}
                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: muted, pointerEvents: 'none' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
                      style={{ height: '32px', paddingLeft: '30px', paddingRight: '10px', borderRadius: '8px', fontSize: '12px', border: `1px solid ${border}`, backgroundColor: isDark ? '#161614' : '#f7f6f3', color: text, outline: 'none', width: '180px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Table ── */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', minWidth: 0 }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 180px 120px 130px 200px', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${border}`, backgroundColor: isDark ? '#141412' : '#f5f3ef', minWidth: '680px' }}>
                {['Cliente', 'Status Financeiro', 'Valor Total', 'Data de Venda', 'Acesso'].map(h => (
                  <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${border}`, borderTopColor: '#2c5545', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ fontSize: '13px', color: muted }}>A carregar contratos...</p>
                </div>
              ) : visible.length === 0 ? (
                <div style={{ padding: '64px', textAlign: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <FileText style={{ width: '20px', height: '20px', color: muted }} />
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: text, marginBottom: '4px' }}>Sem contratos</p>
                  <p style={{ fontSize: '12px', color: muted }}>{search ? 'Nenhum resultado para a pesquisa' : 'Nenhum contrato nesta categoria'}</p>
                </div>
              ) : visible.map((group, i) => {
                const isLast = i === visible.length - 1
                const isActive = selected?.contractId === group.contractId
                const avatarColor = hashColor(group.companyName)
                const isSubstituted = group.contractStatus === 'cancelled' || group.contractStatus === 'paused'

                return (
                  <div key={group.contractId ?? group.dealId}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 180px 120px 130px 200px', alignItems: 'center', padding: '14px 20px', borderBottom: isLast ? 'none' : `1px solid ${border}`, backgroundColor: isActive ? (isDark ? 'rgba(44,85,69,0.06)' : 'rgba(44,85,69,0.04)') : isSubstituted ? (isDark ? 'rgba(107,101,96,0.04)' : 'rgba(107,101,96,0.03)') : 'transparent', borderLeft: isActive ? '3px solid #2c5545' : isSubstituted ? `3px solid ${isDark ? '#2a2a28' : '#d4cfc9'}` : '3px solid transparent', transition: 'all 0.12s', cursor: 'default', minWidth: '680px', opacity: isSubstituted ? 0.65 : 1 }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = subtleBg }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = isSubstituted ? (isDark ? 'rgba(107,101,96,0.04)' : 'rgba(107,101,96,0.03)') : 'transparent' }}>

                    {/* Cliente */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, backgroundColor: isSubstituted ? (isDark ? '#1e1e1c' : '#eeebe5') : avatarColor + '18', border: `1px solid ${isSubstituted ? (isDark ? '#2a2a28' : '#d4cfc9') : avatarColor + '30'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: isSubstituted ? muted : avatarColor }}>
                        {initials(group.companyName)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: isSubstituted ? muted : text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.companyName}</p>
                          {isSubstituted && (
                            <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 700, color: '#8a857d', backgroundColor: isDark ? '#1e1e1c' : '#eeebe5', border: `1px solid ${isDark ? '#2a2a28' : '#d4cfc9'}`, borderRadius: '4px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {group.contractStatus === 'cancelled' ? 'Cancelado' : 'Substituído'}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '11px', color: muted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.contactName ?? (group.contractId ? `#${(group.contractId ?? '').slice(0, 8)}` : '—')}</p>
                      </div>
                    </div>

                    {/* Status Financeiro (mini pipeline) */}
                    <MiniPipeline group={group} isDark={isDark} />

                    {/* Valor Total */}
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>{fmtBRL(group.totalValue)}</p>
                      <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>{group.paidCount}/{group.installments.length} pago{group.paidCount !== 1 ? 's' : ''}</p>
                    </div>

                    {/* Data */}
                    <div>
                      <p style={{ fontSize: '12px', color: text }}>{group.createdAt ? fmtDate(group.createdAt) : '—'}</p>
                      {group.nextDue && (
                        <p style={{ fontSize: '10px', color: daysUntil(group.nextDue.due_date).urgent ? '#b83535' : muted, marginTop: '2px' }}>
                          Próx. {fmtDateShort(group.nextDue.due_date)}
                        </p>
                      )}
                    </div>

                    {/* Acesso */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} onClick={e => e.stopPropagation()}>
                      {group.signingToken ? (
                        <>
                          <CopyLinkButton signingToken={group.signingToken} isDark={isDark} border={border} muted={muted} />
                          <button type="button"
                            onClick={() => window.open(`/assinar/${group.signingToken}`, '_blank')}
                            title="Ver contrato"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '30px', padding: '0 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: '#2c5545', color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            <Download style={{ width: '11px', height: '11px' }} /> Contrato
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '10px', color: muted }}>—</span>
                      )}
                      <button type="button" onClick={() => setSelected(isActive ? null : group)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${isActive ? '#2c5545' : border}`, backgroundColor: isActive ? 'rgba(44,85,69,0.10)' : 'transparent', color: isActive ? '#2c5545' : muted, transition: 'all 0.15s', flexShrink: 0 }}
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = '#2c5545'; e.currentTarget.style.color = '#2c5545' } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted } }}>
                        <ChevronRight style={{ width: '13px', height: '13px' }} />
                      </button>
                    </div>
                  </div>
                )
              })}
              </div>{/* end scroll wrapper */}
            </div>

            {visible.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <p style={{ fontSize: '11px', color: muted }}>{visible.length} contrato{visible.length !== 1 ? 's' : ''}{search && ` · "${search}"`}</p>
                <p style={{ fontSize: '11px', color: muted }}>Total: <strong style={{ color: text }}>{fmtBRL(visible.reduce((s, g) => s + g.totalValue, 0))}</strong></p>
              </div>
            )}
          </>
      </div>

      {selected && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 49 }} onClick={() => setSelected(null)} />
          <DetailPanel
            group={selected} isDark={isDark}
            onClose={() => setSelected(null)}
            onMarkPaid={handleMarkPaid}
            onSign={handleSign}
            onPendingSign={handlePendingSign}
            onSetDelivery={handleSetDelivery}
            paying={paying}
            signing={signing}
          />
        </>,
        document.body
      )}
    </>
  )
}



