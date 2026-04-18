import { supabase } from '@/lib/supabase'
import type { DealMeeting } from '@/types/deal.types'

export async function fetchAllMeetings(): Promise<DealMeeting[]> {
  const { data, error } = await supabase
    .from('deal_meetings')
    .select('*')
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DealMeeting[]
}

export async function insertMeeting(
  payload: Omit<DealMeeting, 'id' | 'created_at'>,
): Promise<DealMeeting> {
  const { data, error } = await supabase
    .from('deal_meetings')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as DealMeeting
}
