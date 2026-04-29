import { type ReactNode } from 'react'
import { useThemeStore } from '@/store/useThemeStore'
import { IconBadge } from './IconBadge'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const isDark  = useThemeStore((s) => s.isDark)
  const text    = isDark ? '#edeae4' : '#101828'
  const muted   = isDark ? '#6b6760' : '#667085'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '12px', padding: '48px 24px', textAlign: 'center',
    }}>
      {icon && <IconBadge icon={icon} color="neutral" size="lg" />}
      <div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: text, margin: 0 }}>{title}</p>
        {description && (
          <p style={{ fontSize: '13px', color: muted, marginTop: '4px', maxWidth: '320px' }}>{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
