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
