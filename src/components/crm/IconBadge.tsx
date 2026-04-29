import { type ReactNode } from 'react'
import { useThemeStore } from '@/store/useThemeStore'

export type IconBadgeColor = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export type IconBadgeSize  = 'sm' | 'md' | 'lg'

const COLOR_MAP: Record<IconBadgeColor, { bg: string; bgDark: string; color: string; colorDark: string }> = {
  accent:  { bg: 'rgba(107,18,18,0.10)',  bgDark: 'rgba(155,32,32,0.15)',  color: '#6b1212', colorDark: '#c44040' },
  success: { bg: 'rgba(21,128,61,0.10)',  bgDark: 'rgba(21,128,61,0.15)',  color: '#15803d', colorDark: '#4ade80' },
  warning: { bg: 'rgba(146,64,14,0.10)',  bgDark: 'rgba(180,83,9,0.15)',   color: '#92400e', colorDark: '#fbbf24' },
  danger:  { bg: 'rgba(155,28,28,0.10)',  bgDark: 'rgba(185,28,28,0.15)',  color: '#9b1c1c', colorDark: '#f87171' },
  info:    { bg: 'rgba(30,64,175,0.10)',  bgDark: 'rgba(59,130,246,0.15)', color: '#1e40af', colorDark: '#60a5fa' },
  neutral: { bg: 'rgba(16,24,40,0.06)',   bgDark: 'rgba(255,255,255,0.08)', color: '#475467', colorDark: '#98a2b3' },
}

const SIZE_MAP: Record<IconBadgeSize, { box: number; radius: number }> = {
  sm: { box: 28, radius: 6 },
  md: { box: 34, radius: 8 },
  lg: { box: 42, radius: 10 },
}

interface IconBadgeProps {
  icon: ReactNode
  color?: IconBadgeColor
  size?: IconBadgeSize
  style?: React.CSSProperties
}

export function IconBadge({ icon, color = 'neutral', size = 'md', style }: IconBadgeProps) {
  const isDark = useThemeStore((s) => s.isDark)
  const c = COLOR_MAP[color]
  const s = SIZE_MAP[size]

  return (
    <div style={{
      width:  s.box,
      height: s.box,
      borderRadius: s.radius,
      backgroundColor: isDark ? c.bgDark : c.bg,
      color: isDark ? c.colorDark : c.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...style,
    }}>
      {icon}
    </div>
  )
}
