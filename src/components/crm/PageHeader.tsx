import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/store/useThemeStore'
import { motionPresets } from '@/lib/motion'

interface Crumb { label: string; href?: string }

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  breadcrumb?: Crumb[]
}

export function PageHeader({ title, subtitle, icon, actions, breadcrumb }: PageHeaderProps) {
  const isDark   = useThemeStore((s) => s.isDark)
  const navigate = useNavigate()

  const border   = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const textMain = isDark ? '#edeae4' : '#101828'
  const textMute = isDark ? '#6b6760' : '#667085'
  const pageBg   = isDark ? '#0a0a08' : '#f9fafb'

  return (
    <motion.div
      {...motionPresets.fadeIn}
      style={{
        backgroundColor: pageBg,
        borderBottom: `1px solid ${border}`,
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexShrink: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {/* Breadcrumb */}
        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            {breadcrumb.map((crumb, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {i > 0 && <ChevronRight size={10} color={textMute} />}
                {crumb.href ? (
                  <button
                    type="button"
                    onClick={() => navigate(crumb.href!)}
                    style={{ fontSize: '11px', color: textMute, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: textMute }}>{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        {/* Title + subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: subtitle ? '2px' : 0 }}>
          {icon && <span style={{ color: textMain, display: 'flex', alignItems: 'center' }}>{icon}</span>}
          <h1 style={{
            fontSize: '20px', fontWeight: 600,
            color: textMain, letterSpacing: '-0.03em',
            margin: 0, lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </h1>
        </div>
        {subtitle && (
          <p style={{ fontSize: '13px', color: textMute, margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </motion.div>
  )
}
