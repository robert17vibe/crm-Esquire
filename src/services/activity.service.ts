import { supabase } from '@/lib/supabase'
import type { DealActivity } from '@/types/deal.types'

export async function fetchActivitiesByDeal(dealId: string): Promise<DealActivity[]> {
  const { data, error } = await supabase
    .from('deal_activities')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DealActivity[]
}

export async function insertActivity(
  payload: Omit<DealActivity, 'id' | 'created_at'>,
): Promise<DealActivity> {
  const { data, error } = await supabase
    .from('deal_activities')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as DealActivity
}
