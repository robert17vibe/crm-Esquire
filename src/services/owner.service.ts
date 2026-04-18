import { supabase } from '@/lib/supabase'
import type { Owner } from '@/types/deal.types'

interface DealOwnerRow {
  owner_id: string
  owner: Owner | null
}

export async function fetchOwnersFromDeals(): Promise<Owner[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('owner_id, owner')

  if (error) throw error

  const byId = new Map<string, Owner>()
  for (const row of (data ?? []) as DealOwnerRow[]) {
    if (!row.owner_id) continue
    if (row.owner && row.owner.id && row.owner.name) {
      byId.set(row.owner_id, row.owner)
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}
