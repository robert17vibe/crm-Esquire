import { supabase } from '@/lib/supabase'
import type { Owner } from '@/types/deal.types'

export async function fetchOwners(): Promise<Owner[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_color')
    .order('full_name')
  if (error) throw error
  return (data ?? []).map((row) => {
    const name = (row.full_name as string | null)?.trim() || `Usuário ${(row.id as string).slice(0, 6)}`
    return {
      id: row.id as string,
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((p: string) => p[0] ?? '')
        .join('')
        .toUpperCase() || 'U',
      avatar_color: (row.avatar_color as string | null) ?? '#2c5545',
    }
  })
}
