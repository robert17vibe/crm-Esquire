import { supabase } from '@/lib/supabase'
import type { Team } from '@/types/deal.types'

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')
  if (error) throw error
  return (data ?? []) as Team[]
}

export async function insertTeam(name: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data as Team
}

export async function renameTeam(id: string, name: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Team
}

export async function removeTeam(id: string): Promise<void> {
  // First unassign all profiles from this team
  await supabase.from('profiles').update({ team_id: null }).eq('team_id', id)
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}
