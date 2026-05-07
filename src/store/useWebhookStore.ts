import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type WebhookEvent = 'deal.created' | 'deal.stage_changed' | 'deal.deleted' | 'payment.received'

export interface WebhookConfig {
  id: string
  url: string
  events: WebhookEvent[]
  secret: string | null
  active: boolean
  created_at: string
}

interface WebhookStore {
  configs: WebhookConfig[]
  loading: boolean
  initialized: boolean
  initialize: () => Promise<void>
  addWebhook: (url: string, events: WebhookEvent[], secret?: string) => Promise<void>
  removeWebhook: (id: string) => Promise<void>
  toggleWebhook: (id: string, active: boolean) => Promise<void>
  fire: (event: WebhookEvent, payload: Record<string, unknown>) => void
}

export const useWebhookStore = create<WebhookStore>((set, get) => ({
  configs: [],
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().loading || get().initialized) return
    set({ loading: true })
    const { data } = await supabase.from('webhook_configs').select('*').order('created_at')
    set({ configs: (data ?? []) as WebhookConfig[], loading: false, initialized: true })
  },

  addWebhook: async (url, events, secret) => {
    const { data } = await supabase
      .from('webhook_configs')
      .insert({ url, events, secret: secret || null })
      .select()
      .single()
    if (data) set((s) => ({ configs: [...s.configs, data as WebhookConfig] }))
  },

  removeWebhook: async (id) => {
    await supabase.from('webhook_configs').delete().eq('id', id)
    set((s) => ({ configs: s.configs.filter((c) => c.id !== id) }))
  },

  toggleWebhook: async (id, active) => {
    await supabase.from('webhook_configs').update({ active }).eq('id', id)
    set((s) => ({ configs: s.configs.map((c) => c.id === id ? { ...c, active } : c) }))
  },

  fire: (event, payload) => {
    const active = get().configs.filter((c) => c.active && c.events.includes(event))
    if (!active.length) return

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload })

    active.forEach((cfg) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (cfg.secret) headers['X-Webhook-Secret'] = cfg.secret
      fetch(cfg.url, { method: 'POST', headers, body }).catch(() => {})
    })
  },
}))
