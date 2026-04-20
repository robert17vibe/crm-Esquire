import { supabase } from '@/lib/supabase'
import type { DealEvent } from '@/types/deal.types'

export async function fetchDealEvents(dealId: string): Promise<DealEvent[]> {
  const { data, error } = await supabase
    .from('deal_events')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as DealEvent[]
}
