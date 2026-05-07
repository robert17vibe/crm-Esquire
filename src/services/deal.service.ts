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

export const DEALS_PAGE_SIZE = 50

export interface DealCursor { updated_at: string; id: string }

export async function fetchDeals(opts: { cursor?: DealCursor; limit?: number } = {}): Promise<{ deals: Deal[]; hasMore: boolean; nextCursor: DealCursor | null }> {
  const { cursor, limit = DEALS_PAGE_SIZE } = opts
  let query = supabase
    .from('deals')
    .select(LIST_COLUMNS)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1) // fetch one extra to detect hasMore

  if (cursor) {
    query = query.or(
      `updated_at.lt.${cursor.updated_at},and(updated_at.eq.${cursor.updated_at},id.lt.${cursor.id})`
    )
  }

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as unknown as Deal[]
  const hasMore = rows.length > limit
  const deals = hasMore ? rows.slice(0, limit) : rows
  const last = deals[deals.length - 1]
  const nextCursor: DealCursor | null = last ? { updated_at: last.updated_at, id: last.id } : null
  return { deals, hasMore, nextCursor }
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

export async function fetchWonDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select(LIST_COLUMNS)
    .is('deleted_at', null)
    .eq('stage_id', 'closed_won')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Deal[]
}

export async function removeDeal(id: string): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
