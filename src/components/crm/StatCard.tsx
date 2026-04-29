import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { IconBadge, type IconBadgeColor } from './IconBadge'
import { motionPresets } from '@/lib/motion'
import { Sparkline } from './charts/Sparkline'

export interface StatCardProps {
  icon: ReactNode
  label: string
  value: string
  delta?: string
  deltaType?: 'positive' | 'negative' | 'neutral'
  sparklineData?: number[]
  color?: IconBadgeColor
  onClick?: () => void
  index?: number
}

export function StatCard({
  icon, label, value, delta, deltaType = 'neutral',
  sparklineData, color = 'neutral', onClick, index = 0,
}: StatCardProps) {
  const isDark = useThemeStore((s) => s.isDark)

  const border   = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const cardBg   = isDark ? '#111110' : '#ffffff'
  const textMain = isDark ? '#edeae4' : '#101828'
  const textMute = isDark ? '#6b6760' : '#667085'
  const shadow   = isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)'

  const deltaColors = {
    positive: { color: '#15803d', bg: 'rgba(21,128,61,0.08)', icon: <TrendingUp size={11} /> },
    negative: { color: '#9b1c1c', bg: 'rgba(155,28,28,0.08)', icon: <TrendingDown size={11} /> },
    neutral:  { color: '#667085', bg: 'rgba(16,24,40,0.06)', icon: <Minus size={11} /> },
  }
  const dc = deltaColors[deltaType]

  return (
    <motion.div
      {...motionPresets.listItem(index)}
      onClick={onClick}
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${border}`,
        borderRadius: '10px',
        padding: '18px 20px',
        boxShadow: shadow,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      whileHover={onClick ? { y: -1 } : {}}
    >
      {/* Top row: icon + delta */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <IconBadge icon={icon} color={color} size="md" />
        {delta && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            fontSize: '11px', fontWeight: 600,
            color: dc.color, backgroundColor: dc.bg,
            borderRadius: '5px', padding: '2px 7px',
          }}>
            {dc.icon}
            {delta}
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <div style={{
          fontSize: '26px', fontWeight: 600, letterSpacing: '-0.04em',
          color: textMain, lineHeight: 1,
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </div>
        <div style={{ fontSize: '12px', color: textMute, marginTop: '4px', fontWeight: 500 }}>
          {label}
        </div>
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <Sparkline data={sparklineData} color={dc.color} height={32} />
      )}
    </motion.div>
  )
}
