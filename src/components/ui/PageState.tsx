import type { ReactNode } from 'react'

interface PageStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function PageLoadingState({ title, description, icon, action }: PageStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '12px', textAlign: 'center', padding: '32px' }}>
      {icon ?? <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '999px' }} />}
      <div>
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-base)', margin: 0 }}>{title}</p>
        {description && <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '6px 0 0', lineHeight: 1.6 }}>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageEmptyState({ title, description, icon, action }: PageStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '10px', textAlign: 'center', padding: '32px' }}>
      {icon}
      <div>
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-base)', margin: 0 }}>{title}</p>
        {description && <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '6px 0 0', lineHeight: 1.6 }}>{description}</p>}
      </div>
      {action}
    </div>
  )
}
