import { create } from 'zustand'

const KEY = 'esq_settings_v1'

interface Settings {
  quarterlyGoal: number
  compactMode: boolean
  showClosedDeals: boolean
  defaultCurrency: 'BRL' | 'USD' | 'EUR'
  notifications: boolean
  overdueAlerts: boolean
  followUpReminders: boolean
}

interface SettingsStore extends Settings {
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
}

const DEFAULTS: Settings = {
  quarterlyGoal: 15_000_000,
  compactMode: false,
  showClosedDeals: true,
  defaultCurrency: 'BRL',
  notifications: true,
  overdueAlerts: true,
  followUpReminders: true,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

function persist(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),
  setSetting: (key, value) => {
    const next = { ...get(), [key]: value }
    set(next)
    persist(next)
  },
  reset: () => {
    set(DEFAULTS)
    persist(DEFAULTS)
  },
}))
