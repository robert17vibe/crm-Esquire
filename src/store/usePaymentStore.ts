import { create } from 'zustand'
import type { Contract, Payment } from '@/types/payment.types'
import {
  fetchAllContracts,
  fetchPaymentsByContracts,
  fetchReceivableStats,
  patchContract,
  signContract as signContractSvc,
  setDeliveryStatus as setDeliveryStatusSvc,
  markPaymentPaid,
  setPaymentStatus,
  insertPayment,
  regenerateInstallments as regenerateInstallmentsSvc,
  type ReceivableStats,
} from '@/services/payment.service'
import type { DeliveryStatus } from '@/types/payment.types'
import { supabase } from '@/lib/supabase'
import { useToastStore } from './useToastStore'
import { useWebhookStore } from './useWebhookStore'
import { useNotificationStore } from './useNotificationStore'

export interface FinancialKPIs {
  mrr:          number
  arr:          number
  due30dAmount: number
  due30dCount:  number
  overdueAmount: number
  overdueCount:  number
  collectedTotal: number
}

interface PaymentState {
  contracts:    Contract[]
  payments:     Payment[]
  kpis:         FinancialKPIs
  loading:      boolean
  initialized:  boolean

  initialize: () => Promise<void>
  refresh:    () => Promise<void>
  refreshKPIs: () => Promise<void>
  subscribeRealtime: () => () => void

  updateContract: (id: string, patch: Partial<Contract>) => Promise<void>
  regenerateInstallments: (contractId: string, installments: number, frequency: Contract['frequency']) => Promise<void>
  signContract: (contractId: string) => Promise<void>
  setDeliveryStatus: (contractId: string, status: DeliveryStatus, notes?: string) => Promise<void>
  payInstallment: (paymentId: string, method?: string, reference?: string) => Promise<void>
  changePaymentStatus: (paymentId: string, status: Payment['status']) => Promise<void>
  addPayment: (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>

  // derived helpers
  getContractByDeal: (dealId: string) => Contract | undefined
  getPaymentsByContract: (contractId: string) => Payment[]
  getPaymentsByDeal: (dealId: string) => Payment[]
  overduePayments: () => Payment[]
  pendingPayments: () => Payment[]
}

const EMPTY_KPIS: FinancialKPIs = {
  mrr: 0, arr: 0,
  due30dAmount: 0, due30dCount: 0,
  overdueAmount: 0, overdueCount: 0,
  collectedTotal: 0,
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  contracts:   [],
  payments:    [],
  kpis:        EMPTY_KPIS,
  loading:     false,
  initialized: false,

  async initialize() {
    if (get().initialized) return
    await get().refresh()
    get().subscribeRealtime()
  },

  async refresh() {
    set({ loading: true })
    try {
      const contracts = await fetchAllContracts()
      const contractIds = contracts.map((c) => c.id)
      const payments = await fetchPaymentsByContracts(contractIds)
      set({ contracts, payments, initialized: true })
      get().refreshKPIs()
    } catch (err) {
      const isTableMissing = (err as { code?: string })?.code === '42P01'
      if (!isTableMissing) {
        useToastStore.getState().addToast('Erro ao carregar pagamentos', 'error')
      }
      set({ initialized: true }) // evitar loop de retry
    } finally {
      set({ loading: false })
    }
  },

  async refreshKPIs() {
    try {
      // MRR: calculado a partir dos contratos activos em memória
      // (evita query extra à view — a view é o fallback para admins sem impersonation)
      const contracts = get().contracts
      const mrr = contracts
        .filter((c) => c.status === 'active')
        .reduce((sum, c) => {
          if (c.frequency === 'monthly')   return sum + c.value
          if (c.frequency === 'quarterly') return sum + c.value / 3
          if (c.frequency === 'yearly')    return sum + c.value / 12
          return sum // one_time não conta no MRR
        }, 0)

      const stats: ReceivableStats = await fetchReceivableStats()
      set({
        kpis: {
          mrr,
          arr: mrr * 12,
          due30dAmount:  stats.due_30d_amount,
          due30dCount:   stats.due_30d_count,
          overdueAmount: stats.overdue_amount,
          overdueCount:  stats.overdue_count,
          collectedTotal: stats.collected_total,
        },
      })
    } catch { /* KPIs são melhoria — não bloquear em caso de erro */ }
  },

  subscribeRealtime() {
    const channel = supabase
      .channel('payments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contracts' },
        (payload) => {
          const contracts = get().contracts
          if (payload.eventType === 'INSERT') {
            set({ contracts: [payload.new as Contract, ...contracts] })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Contract
            set({ contracts: contracts.map((c) => c.id === updated.id ? updated : c) })
          } else if (payload.eventType === 'DELETE') {
            set({ contracts: contracts.filter((c) => c.id !== (payload.old as Contract).id) })
          }
          get().refreshKPIs()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          const payments = get().payments
          if (payload.eventType === 'INSERT') {
            set({ payments: [...payments, payload.new as Payment] })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Payment
            set({ payments: payments.map((p) => p.id === updated.id ? updated : p) })
            if (updated.status === 'paid' && updated.paid_at) {
              useNotificationStore.getState().addAlertIfNew(
                updated.id,
                `Pagamento #${updated.installment_no}`,
                'payment_received',
                `Parcela de R$ ${updated.amount.toFixed(0)} marcada como paga`,
              )
            }
          } else if (payload.eventType === 'DELETE') {
            set({ payments: payments.filter((p) => p.id !== (payload.old as Payment).id) })
          }
          get().refreshKPIs()
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },

  async updateContract(id, patch) {
    const prev = get().contracts
    set({ contracts: prev.map((c) => c.id === id ? { ...c, ...patch } : c) })
    try {
      await patchContract(id, patch)
    } catch {
      set({ contracts: prev })
      useToastStore.getState().addToast('Erro ao actualizar contrato', 'error')
    }
  },

  async regenerateInstallments(contractId, installments, frequency) {
    const contract = get().contracts.find((c) => c.id === contractId)
    if (!contract) return
    const prevPayments = get().payments
    const prevContracts = get().contracts
    // optimistic: remove pending payments for this contract
    set({
      payments:  prevPayments.filter((p) => p.contract_id !== contractId || p.status === 'paid'),
      contracts: prevContracts.map((c) => c.id === contractId ? { ...c, installments, frequency } : c),
    })
    try {
      await regenerateInstallmentsSvc({ ...contract, installments, frequency }, installments, frequency)
      await get().refresh()
      useToastStore.getState().addToast(`${installments} parcela${installments > 1 ? 's' : ''} gerada${installments > 1 ? 's' : ''}`, 'success')
    } catch {
      set({ payments: prevPayments, contracts: prevContracts })
      useToastStore.getState().addToast('Erro ao regenerar parcelas', 'error')
    }
  },

  async signContract(contractId) {
    const prev = get().contracts
    const now = new Date().toISOString()
    set({ contracts: prev.map((c) => c.id === contractId ? { ...c, signed_at: now, signing_status: 'signed' } : c) })
    try {
      await signContractSvc(contractId)
      useToastStore.getState().addToast('Contrato assinado', 'success')
      useNotificationStore.getState().addAlertIfNew(
        contractId, 'Contrato', 'payment_received', 'Contrato assinado pelo cliente'
      )
    } catch {
      set({ contracts: prev })
      useToastStore.getState().addToast('Erro ao registar assinatura', 'error')
    }
  },

  async setDeliveryStatus(contractId, status, notes) {
    const prev = get().contracts
    set({ contracts: prev.map((c) => c.id === contractId ? { ...c, delivery_status: status, delivery_notes: notes ?? c.delivery_notes } : c) })
    try {
      await setDeliveryStatusSvc(contractId, status, notes)
      const labels: Record<string, string> = { in_progress: 'Entrega iniciada', delivered: 'Entrega concluída', cancelled: 'Entrega cancelada', pending: 'Entrega pendente' }
      useToastStore.getState().addToast(labels[status] ?? 'Estado actualizado', 'success')
    } catch {
      set({ contracts: prev })
      useToastStore.getState().addToast('Erro ao actualizar entrega', 'error')
    }
  },

  async payInstallment(paymentId, method, reference) {
    const prev = get().payments
    const payment = prev.find((p) => p.id === paymentId)
    set({
      payments: prev.map((p) =>
        p.id === paymentId
          ? { ...p, status: 'paid', paid_at: new Date().toISOString(), method: method ?? p.method }
          : p
      ),
    })
    try {
      await markPaymentPaid(paymentId, method, reference)

      // webhook outbound
      useWebhookStore.getState().fire('payment.received', {
        payment_id:     paymentId,
        amount:         payment?.amount,
        installment_no: payment?.installment_no,
        deal_id:        payment?.deal_id,
        paid_at:        new Date().toISOString(),
      })

      // notificação in-app
      if (payment) {
        useNotificationStore.getState().addAlertIfNew(
          paymentId,
          `Parcela #${payment.installment_no}`,
          'payment_received',
          `R$ ${payment.amount.toFixed(0)} recebido`,
        )
      }

      useToastStore.getState().addToast('Pagamento registado', 'success')
      get().refreshKPIs()
    } catch {
      set({ payments: prev })
      useToastStore.getState().addToast('Erro ao registar pagamento', 'error')
    }
  },

  async changePaymentStatus(paymentId, status) {
    const prev = get().payments
    set({ payments: prev.map((p) => p.id === paymentId ? { ...p, status } : p) })
    try {
      await setPaymentStatus(paymentId, status)
      get().refreshKPIs()
    } catch {
      set({ payments: prev })
      useToastStore.getState().addToast('Erro ao actualizar pagamento', 'error')
    }
  },

  async addPayment(payment) {
    try {
      const created = await insertPayment(payment)
      set({ payments: [...get().payments, created] })
      get().refreshKPIs()
    } catch {
      useToastStore.getState().addToast('Erro ao criar pagamento', 'error')
    }
  },

  getContractByDeal: (dealId) => {
    const cs = get().contracts.filter((c) => c.deal_id === dealId)
    return cs.find((c) => c.status === 'active') ?? cs[0]
  },
  getPaymentsByContract: (contractId) => get().payments.filter((p) => p.contract_id === contractId),
  getPaymentsByDeal:    (dealId) => get().payments.filter((p) => p.deal_id === dealId),
  overduePayments: () => get().payments.filter((p) => p.status === 'overdue'),
  pendingPayments: () => get().payments.filter((p) => p.status === 'pending'),
}))
