import { useThemeStore } from '@/store/useThemeStore'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

interface DataPoint { label: string; value: number; value2?: number }

interface CrmAreaChartProps {
  data: DataPoint[]
  color?: string
  color2?: string
  height?: number
  showGrid?: boolean
  formatY?: (v: number) => string
  formatTooltip?: (v: number) => string
  label2?: string
}

export function CrmAreaChart({
  data, color = '#6b1212', color2, height = 200,
  showGrid = true, formatY, formatTooltip,
}: CrmAreaChartProps) {
  const isDark = useThemeStore((s) => s.isDark)
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'
  const textColor = isDark ? '#6b6760' : '#98a2b3'
  const gId = color.replace(/[^a-z0-9]/gi, '')

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`ca-${gId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={isDark ? 0.25 : 0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {color2 && (
            <linearGradient id={`ca2-${gId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color2} stopOpacity={isDark ? 0.25 : 0.15} />
              <stop offset="95%" stopColor={color2} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        {showGrid && <CartesianGrid stroke={gridColor} strokeDasharray="0" vertical={false} />}
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: textColor }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 11, fill: textColor }}
          axisLine={false}
          tickLine={false}
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
          formatter={(v: number) => [formatTooltip ? formatTooltip(v) : v, '']}
          labelStyle={{ color: isDark ? '#98a2b3' : '#667085', marginBottom: '4px' }}
        />
        <Area
          type="monotone" dataKey="value"
          stroke={color} strokeWidth={2}
          fill={`url(#ca-${gId})`}
          dot={false} activeDot={{ r: 4, fill: color }}
        />
        {color2 && (
          <Area
            type="monotone" dataKey="value2"
            stroke={color2} strokeWidth={2}
            fill={`url(#ca2-${gId})`}
            dot={false} activeDot={{ r: 4, fill: color2 }}
            strokeDasharray="4 2"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
