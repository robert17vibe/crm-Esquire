import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useThemeStore } from '@/store/useThemeStore'
import { motionPresets } from '@/lib/motion'

export type ActivityColor = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const DOT_COLORS: Record<ActivityColor, { light: string; dark: string }> = {
  accent:  { light: '#6b1212', dark: '#c44040' },
  success: { light: '#2c5545', dark: '#5aaa88' },
  warning: { light: '#a88030', dark: '#c9a040' },
  danger:  { light: '#c94444', dark: '#f87171' },
  info:    { light: '#1e40af', dark: '#60a5fa' },
  neutral: { light: '#98a2b3', dark: '#6b6760' },
}

export interface ActivityItemData {
  id: string
  title: string
  description?: string
  timestamp: string
  color?: ActivityColor
  icon?: ReactNode
}

interface ActivityItemProps extends ActivityItemData {
  isLast?: boolean
  index?: number
}

export function ActivityItem({ title, description, timestamp, color = 'neutral', icon, isLast, index = 0 }: ActivityItemProps) {
  const isDark = useThemeStore((s) => s.isDark)
  const dc     = DOT_COLORS[color]
  const dotColor = isDark ? dc.dark : dc.light
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#6b6760' : '#667085'
  const line   = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'

  return (
    <motion.div
      {...motionPresets.listItem(index)}
      style={{ display: 'flex', gap: '12px', position: 'relative' }}
    >
      {/* Line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: '7px', top: '20px',
          width: '1px', bottom: '-8px',
          backgroundColor: line,
        }} />
      )}

      {/* Dot or icon */}
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%',
        backgroundColor: icon ? 'transparent' : dotColor,
        border: icon ? 'none' : `2px solid ${isDark ? '#111110' : '#fff'}`,
        boxShadow: `0 0 0 2px ${dotColor}30`,
        flexShrink: 0, marginTop: '2px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: dotColor, fontSize: '10px',
      }}>
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '16px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: text }}>{title}</span>
          <span style={{ fontSize: '11px', color: muted, flexShrink: 0 }}>{timestamp}</span>
        </div>
        {description && (
          <p style={{ fontSize: '12px', color: muted, marginTop: '2px', lineHeight: 1.5 }}>{description}</p>
        )}
      </div>
    </motion.div>
  )
}

interface TimelineProps {
  items: ActivityItemData[]
  emptyText?: string
}

export function Timeline({ items, emptyText = 'Sem atividade recente' }: TimelineProps) {
  const isDark = useThemeStore((s) => s.isDark)
  const muted  = isDark ? '#6b6760' : '#667085'

  if (items.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: muted }}>
        {emptyText}
      </div>
    )
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {items.map((item, i) => (
        <ActivityItem key={item.id} {...item} isLast={i === items.length - 1} index={i} />
      ))}
    </div>
  )
}
