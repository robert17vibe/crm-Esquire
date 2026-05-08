import { supabase } from '@/lib/supabase'
import type { Contract, Payment, PaymentStatus, PaymentWithDeal } from '@/types/payment.types'

// ─── Contracts ────────────────────────────────────────────────

export async function fetchAllContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function patchContract(id: string, patch: Partial<Contract>): Promise<void> {
  const { error } = await supabase.from('contracts').update(patch).eq('id', id)
  if (error) throw error
}

// Recria as parcelas pendentes com base no novo nº de parcelas + frequência
export async function regenerateInstallments(
  contract: Contract,
  installments: number,
  frequency: import('@/types/payment.types').ContractFrequency,
): Promise<void> {
  // 1. apagar parcelas ainda não pagas
  const { error: delErr } = await supabase
    .from('payments')
    .delete()
    .eq('contract_id', contract.id)
    .in('status', ['pending', 'overdue'])
  if (delErr) throw delErr

  // 2. actualizar contrato
  const { error: upErr } = await supabase
    .from('contracts')
    .update({ installments, frequency })
    .eq('id', contract.id)
  if (upErr) throw upErr

  // 3. calcular intervalo em meses
  const monthsMap: Record<string, number> = {
    one_time: 0, monthly: 1, quarterly: 3, yearly: 12,
  }
  const intervalMonths = monthsMap[frequency] ?? 1
  const each = Math.floor(contract.value / installments * 100) / 100
  const last = Math.round((contract.value - each * (installments - 1)) * 100) / 100
  const start = new Date(contract.start_date ?? new Date())

  const rows = Array.from({ length: installments }, (_, i) => {
    const due = new Date(start)
    if (frequency === 'one_time') {
      due.setDate(due.getDate() + 7)
    } else {
      due.setMonth(due.getMonth() + intervalMonths * (i + 1))
    }
    return {
      contract_id:    contract.id,
      deal_id:        contract.deal_id,
      owner_id:       contract.owner_id ?? null,
      installment_no: i + 1,
      amount:         i === installments - 1 ? last : each,
      due_date:       due.toISOString().slice(0, 10),
      status:         'pending' as const,
    }
  })

  const { error: insErr } = await supabase.from('payments').insert(rows)
  if (insErr) throw insErr
}

export async function signContract(id: string): Promise<void> {
  const { error } = await supabase
    .from('contracts')
    .update({ signed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function setDeliveryStatus(id: string, delivery_status: import('@/types/payment.types').DeliveryStatus, delivery_notes?: string): Promise<void> {
  const patch: Record<string, unknown> = { delivery_status }
  if (delivery_notes !== undefined) patch.delivery_notes = delivery_notes
  const { error } = await supabase.from('contracts').update(patch).eq('id', id)
  if (error) throw error
}

// ─── Payments ─────────────────────────────────────────────────

export async function fetchPaymentsByContracts(contractIds: string[]): Promise<Payment[]> {
  if (!contractIds.length) return []
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .in('contract_id', contractIds)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function patchPayment(id: string, patch: Partial<Payment>): Promise<void> {
  const { error } = await supabase.from('payments').update(patch).eq('id', id)
  if (error) throw error
}

export async function markPaymentPaid(id: string, method?: string, reference?: string): Promise<void> {
  const patch: Partial<Payment> = { status: 'paid', paid_at: new Date().toISOString() }
  if (method)    patch.method    = method
  if (reference) patch.reference = reference
  await patchPayment(id, patch)
}

export async function setPaymentStatus(id: string, status: PaymentStatus): Promise<void> {
  await patchPayment(id, { status })
}

export async function insertPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
  const { data, error } = await supabase.from('payments').insert(payment).select().single()
  if (error) throw error
  return data
}

// ─── Views / KPIs ─────────────────────────────────────────────

export async function fetchAllPaymentsWithDealInfo(): Promise<PaymentWithDeal[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, contracts(value, frequency, installments), deals(company_name, contact_name)')
    .order('due_date', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => {
    const d = row.deals as { company_name?: string; contact_name?: string | null } | null
    const c = row.contracts as { value?: number; frequency?: string; installments?: number } | null
    return {
      ...row,
      contracts: undefined,
      deals: undefined,
      contract: c ? { value: c.value ?? 0, frequency: (c.frequency ?? 'one_time') as import('@/types/payment.types').ContractFrequency, installments: c.installments ?? 1 } : undefined,
      deal_company_name: d?.company_name ?? '—',
      deal_contact_name: d?.contact_name ?? null,
    } as PaymentWithDeal
  })
}

export interface ReceivableStats {
  due_30d_count:   number
  due_30d_amount:  number
  overdue_count:   number
  overdue_amount:  number
  collected_total: number
}

export async function fetchReceivableStats(ownerId?: string): Promise<ReceivableStats> {
  let query = supabase.from('v_receivable').select('*')
  if (ownerId) query = query.eq('owner_id', ownerId)
  const { data, error } = await query
  if (error) throw error
  if (!data?.length) return { due_30d_count: 0, due_30d_amount: 0, overdue_count: 0, overdue_amount: 0, collected_total: 0 }
  // aggregate across owners if no filter
  return data.reduce(
    (acc, r) => ({
      due_30d_count:   acc.due_30d_count   + (r.due_30d_count   ?? 0),
      due_30d_amount:  acc.due_30d_amount  + (r.due_30d_amount  ?? 0),
      overdue_count:   acc.overdue_count   + (r.overdue_count   ?? 0),
      overdue_amount:  acc.overdue_amount  + (r.overdue_amount  ?? 0),
      collected_total: acc.collected_total + (r.collected_total ?? 0),
    }),
    { due_30d_count: 0, due_30d_amount: 0, overdue_count: 0, overdue_amount: 0, collected_total: 0 }
  )
}
