---
description: Cria um novo Zustand store para o CRM Esquire
allowed-tools: Read, Write, Glob
---

Cria um Zustand store para gerir: $ARGUMENTS

## Padrão do projecto

```ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'

interface Item {
  id:         string
  created_at: string
  // campos específicos
}

interface NomeState {
  items:   Item[]
  loading: boolean
  fetch:   () => Promise<void>
  create:  (payload: Omit<Item, 'id' | 'created_at'>) => Promise<string | null>
  update:  (id: string, patch: Partial<Item>) => Promise<void>
  remove:  (id: string) => Promise<void>
  subscribeRealtime: () => () => void
}

export const useNomeStore = create<NomeState>((set) => ({
  items:   [],
  loading: false,

  fetch: async () => {
    const userId = useAuthStore.getState().profile?.id
    if (!userId) return
    set({ loading: true })
    const { data } = await supabase
      .from('tabela')
      .select('*')
      .order('created_at', { ascending: false })
    set({ loading: false, items: data ?? [] })
  },

  create: async (payload) => {
    const { data, error } = await supabase.from('tabela').insert(payload).select().single()
    if (error || !data) return error?.message ?? 'Erro'
    set((s) => ({ items: [data, ...s.items] }))
    return null
  },

  update: async (id, patch) => {
    set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...patch } : i) }))
    await supabase.from('tabela').update(patch).eq('id', id)
  },

  remove: async (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
    await supabase.from('tabela').delete().eq('id', id)
  },

  subscribeRealtime: () => {
    const ch = supabase.channel('tabela-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tabela' }, (p) => {
        set((s) => ({ items: [p.new as Item, ...s.items] }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tabela' }, (p) => {
        set((s) => ({ items: s.items.map((i) => i.id === (p.new as Item).id ? { ...i, ...p.new } : i) }))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tabela' }, (p) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== (p.old as { id: string }).id) }))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  },
}))

// Auto-fetch quando auth pronto
useAuthStore.subscribe((s) => {
  if (s.profile?.id) {
    const st = useNomeStore.getState()
    if (st.items.length === 0 && !st.loading) st.fetch()
  }
})
```

## Regras
- Optimistic update sempre: actualiza local primeiro, DB a seguir
- `subscribeRealtime` retorna cleanup function
- `create` retorna `null` (sucesso) ou `string` (mensagem de erro)
