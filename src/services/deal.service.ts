import { supabase } from '@/lib/supabase'
import type { Deal, DealPatch } from '@/types/deal.types'

// Colunas usadas na listagem/kanban. Campos de detalhe (notes, ai_summary, etc.) carregados por fetchDealById.
const LIST_COLUMNS = [
  'id', 'company_id', 'title', 'stage_id', 'value', 'currency', 'probability',
  'days_in_stage', 'expected_close', 'owner_id', 'owner', 'team_id',
  'next_activity', 'last_activity_at',
  'contact_name', 'contact_title', 'contact_email', 'contact_phone',
  'company_name', 'company_sector', 'company_size',
  'lead_source', 'loss_reason', 'segment', 'lead_temperature', 'tags',
  'health_score', 'health_status', 'stage_changed_at',
  'created_at', 'updated_at',
].join(',')

export async function fetchDeals(opts: { limit?: number; offset?: number } = {}): Promise<Deal[]> {
  const { limit = 300, offset = 0 } = opts
  const { data, error } = await supabase
    .from('deals')
    .select(LIST_COLUMNS)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return (data ?? []) as unknown as Deal[]
}

export async function insertDeal(
  payload: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'days_in_stage' | 'deleted_at' | 'stage_changed_at'>,
): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .insert(payload)
    .select()
    .single()
  if (error) { console.error('[insertDeal]', error.code, error.message, error.details); throw error }
  return data as Deal
}

export async function patchDeal(id: string, patch: DealPatch): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .update(patch)
    .eq('id', id)
  if (error) throw error
}

export async function removeDeal(id: string): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
