import { supabase } from '@/lib/supabase'
import type { Owner } from '@/types/deal.types'

export async function fetchOwners(): Promise<Owner[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_color, team_id')
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
      team_id: (row.team_id as string | null) ?? undefined,
    }
  })
}

export async function updateOwnerTeam(ownerId: string, teamId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ team_id: teamId })
    .eq('id', ownerId)
  if (error) throw error
}
