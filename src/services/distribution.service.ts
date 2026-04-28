import { supabase } from '@/lib/supabase'
import type { Owner } from '@/types/deal.types'

export interface UnassignedDeal {
  id: string
  title: string
  company_name: string
  segment?: string | null
  lead_source?: string | null
  created_at: string
}

export interface AllDeal extends UnassignedDeal {
  owner_id: string | null
}

export interface OwnerWorkload {
  owner: Owner
  dealCount: number
}

export interface DistributionLogEntry {
  id: string
  deal_ids: string[]
  distributed_by: string
  distribution_type: 'manual' | 'auto_equal'
  assignments: Record<string, string[]>
  notes?: string | null
  created_at: string
}

export async function fetchAllDeals(): Promise<AllDeal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('id, title, company_name, segment, lead_source, created_at, owner_id')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchUnassignedDeals(): Promise<UnassignedDeal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('id, title, company_name, segment, lead_source, created_at')
    .is('owner_id', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchOwnerWorkload(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('deals')
    .select('owner_id')
    .not('owner_id', 'is', null)
    .is('deleted_at', null)
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.owner_id) counts[row.owner_id] = (counts[row.owner_id] ?? 0) + 1
  }
  return counts
}

export async function assignDealToOwner(dealId: string, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .update({ owner_id: ownerId })
    .eq('id', dealId)
  if (error) throw error
}

export async function assignDealsToOwner(dealIds: string[], ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .update({ owner_id: ownerId })
    .in('id', dealIds)
  if (error) throw error
}

export async function unassignDeal(dealId: string): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .update({ owner_id: null })
    .eq('id', dealId)
  if (error) throw error
}

export async function reassignDeal(dealId: string, newOwnerId: string): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .update({ owner_id: newOwnerId })
    .eq('id', dealId)
  if (error) throw error
}

export async function distributeDealsEqually(dealIds: string[], owners: Owner[]): Promise<Record<string, string[]>> {
  if (owners.length === 0) throw new Error('Nenhum proprietário disponível')
  const unique = [...new Set(dealIds)]
  const assignments: Record<string, string[]> = {}
  owners.forEach((o) => { assignments[o.id] = [] })

  unique.forEach((dealId, i) => {
    const owner = owners[i % owners.length]
    assignments[owner.id].push(dealId)
  })

  for (const [ownerId, ids] of Object.entries(assignments)) {
    if (ids.length === 0) continue
    const { error } = await supabase
      .from('deals')
      .update({ owner_id: ownerId })
      .in('id', ids)
    if (error) throw error
  }

  return Object.fromEntries(Object.entries(assignments).filter(([, ids]) => ids.length > 0))
}

export async function logDistribution(payload: {
  dealIds: string[]
  distributedBy: string
  distributionType: 'manual' | 'auto_equal'
  assignments: Record<string, string[]>
  notes?: string
}): Promise<void> {
  await supabase.from('lead_distribution_log').insert({
    deal_ids: payload.dealIds,
    distributed_by: payload.distributedBy,
    distribution_type: payload.distributionType,
    assignments: payload.assignments,
    notes: payload.notes ?? null,
  })
}

export async function fetchDistributionHistory(): Promise<DistributionLogEntry[]> {
  const { data, error } = await supabase
    .from('lead_distribution_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data ?? []
}
