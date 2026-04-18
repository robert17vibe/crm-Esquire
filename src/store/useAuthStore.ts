import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user'
  avatar_color: string
  team: string | null
}

interface AuthStore {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  init: () => () => void
  signIn: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  loadProfile: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  loadProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    set({ user, profile: data ?? null })
  },

  init: () => {
    supabase.auth.getSession().then(async ({ data }) => {
      set({ session: data.session, loading: false })
      if (data.session) await get().loadProfile()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, loading: false })
      if (session) await get().loadProfile()
      else set({ user: null, profile: null })
    })
    return () => subscription.unsubscribe()
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    await get().loadProfile()
    return null
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },
}))
