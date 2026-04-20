import { supabase } from '@/lib/supabase'
import type { Deal } from '@/types/deal.types'

export async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Deal[]
}

export async function insertDeal(
  payload: Omit<Deal, 'id' | 'created_at' | 'updated_at'>,
): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Deal
}

export async function patchDeal(id: string, patch: Partial<Deal>): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Deal
}

export async function removeDeal(id: string): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
