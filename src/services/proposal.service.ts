import { supabase } from '@/lib/supabase'

export interface ProposalLine {
  id: string
  description: string
  qty: number
  unit_price: number
}

export interface Proposal {
  id: string
  deal_id: string
  title: string
  intro: string
  scope: string
  validity: string
  payment: string
  terms: string
  lines: ProposalLine[]
  discount_pct: number
  installments: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
}

export type ProposalInsert = Omit<Proposal, 'id' | 'created_at' | 'updated_at'>

export async function fetchProposalsByDeals(dealIds: string[]): Promise<Proposal[]> {
  if (!dealIds.length) return []
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .in('deal_id', dealIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Proposal[]
}

export async function insertProposal(payload: ProposalInsert): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .insert(payload)
    .select()
    .single()
  if (error) {
    console.error('[insertProposal]', error.code, error.message, error.details, 'deal_id:', payload.deal_id)
    throw error
  }
  return data as Proposal
}

export async function updateProposalStatus(id: string, status: Proposal['status']): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', id)
  if (error) throw error
}
