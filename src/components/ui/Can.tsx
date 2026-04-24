import type { ReactNode } from 'react'
import { usePermission, type Action } from '@/store/usePermissionStore'

interface CanProps {
  action: Action
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ action, children, fallback = null }: CanProps) {
  const allowed = usePermission(action)
  return allowed ? <>{children}</> : <>{fallback}</>
}
