import { useThemeStore } from '@/store/useThemeStore'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'

interface DataPoint { label: string; value: number; highlight?: boolean }

interface CrmBarChartProps {
  data: DataPoint[]
  color?: string
  highlightColor?: string
  height?: number
  formatY?: (v: number) => string
  formatTooltip?: (v: number) => string
  radius?: number
}

export function CrmBarChart({
  data, color = '#6b1212', highlightColor = '#2c5545',
  height = 160, formatY, formatTooltip, radius = 4,
}: CrmBarChartProps) {
  const isDark = useThemeStore((s) => s.isDark)
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'
  const textColor = isDark ? '#6b6760' : '#98a2b3'
  const barBg     = isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="35%">
        <CartesianGrid stroke={gridColor} strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: textColor }}
          axisLine={false} tickLine={false} dy={6}
        />
        <YAxis
          tick={{ fontSize: 11, fill: textColor }}
          axisLine={false} tickLine={false}
          tickFormatter={formatY}
          width={formatY ? 52 : 0}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1c1c1a' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#eaecf0'}`,
            borderRadius: '8px', fontSize: '12px',
            boxShadow: '0 4px 12px rgba(16,24,40,0.12)',
            color: isDark ? '#edeae4' : '#101828',
          }}
          formatter={(v) => [formatTooltip ? formatTooltip(Number(v)) : v, '']}
          labelStyle={{ color: isDark ? '#98a2b3' : '#667085' }}
          cursor={{ fill: barBg }}
        />
        <Bar dataKey="value" radius={[radius, radius, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.highlight ? highlightColor : color} opacity={d.highlight ? 1 : 0.75} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
