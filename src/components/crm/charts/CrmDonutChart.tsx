import { useThemeStore } from '@/store/useThemeStore'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

interface DataPoint { label: string; value: number }

const COLORS = ['#6b1212', '#15803d', '#92400e', '#1e40af', '#7c3aed', '#0e7490']

interface CrmDonutChartProps {
  data: DataPoint[]
  centerLabel?: string
  centerValue?: string
  height?: number
  formatTooltip?: (v: number) => string
}

export function CrmDonutChart({
  data, centerLabel, centerValue, height = 180, formatTooltip,
}: CrmDonutChartProps) {
  const isDark = useThemeStore((s) => s.isDark)
  const text   = isDark ? '#edeae4' : '#101828'
  const muted  = isDark ? '#6b6760' : '#667085'

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius="60%" outerRadius="82%"
            dataKey="value"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1c1c1a' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#eaecf0'}`,
              borderRadius: '8px', fontSize: '12px',
              boxShadow: '0 4px 12px rgba(16,24,40,0.12)',
            }}
            formatter={(v: number) => [formatTooltip ? formatTooltip(v) : v, '']}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      {centerValue && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: '18px', fontWeight: 600, color: text,
            fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.03em',
          }}>{centerValue}</div>
          {centerLabel && (
            <div style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{centerLabel}</div>
          )}
        </div>
      )}
    </div>
  )
}
