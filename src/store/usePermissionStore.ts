import { create } from 'zustand'
import { useAuthStore } from '@/store/useAuthStore'

export type Action =
  | 'create_deal'
  | 'edit_deal'
  | 'delete_deal'
  | 'view_all_deals'
  | 'manage_teams'
  | 'impersonate'
  | 'manage_settings'

const ADMIN_ACTIONS: Action[] = [
  'create_deal', 'edit_deal', 'delete_deal', 'view_all_deals',
  'manage_teams', 'impersonate', 'manage_settings',
]

const USER_ACTIONS: Action[] = [
  'create_deal', 'edit_deal', 'view_all_deals',
]

interface PermissionStore {
  canPerform: (action: Action) => boolean
}

export const usePermissionStore = create<PermissionStore>(() => ({
  canPerform: (action) => {
    const profile = useAuthStore.getState().profile
    const isAdmin = profile?.is_admin || profile?.role === 'admin'
    const allowed = isAdmin ? ADMIN_ACTIONS : USER_ACTIONS
    return allowed.includes(action)
  },
}))

// Convenience hook
export function usePermission(action: Action): boolean {
  return usePermissionStore((s) => s.canPerform(action))
}
