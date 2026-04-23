import * as Tooltip from '@radix-ui/react-tooltip'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export function getAvatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue}, 42%, 36%)`
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZE: Record<string, { px: number; font: number }> = {
  xs: { px: 20, font: 7  },
  sm: { px: 28, font: 9  },
  md: { px: 32, font: 11 },
  lg: { px: 40, font: 13 },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UserAvatarProps {
  name: string
  initials: string
  color: string
  email?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showEmail?: boolean
  showTooltip?: boolean
  style?: React.CSSProperties
}

function AvatarCircle({
  initials, color, size = 'sm',
}: { initials: string; color: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const { px, font } = SIZE[size]
  return (
    <div style={{
      width: `${px}px`, height: `${px}px`, borderRadius: '50%',
      backgroundColor: color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: `${font}px`, fontWeight: 700,
      userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}

export function UserAvatar({
  name, initials, color, email,
  size = 'sm',
  showEmail: _showEmail = false,
  showTooltip = true,
  style,
}: UserAvatarProps) {
  const avatar = <AvatarCircle initials={initials} color={color} size={size} />

  if (!showTooltip || (!name && !email)) {
    return avatar
  }

  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild style={style}>
          {avatar}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            style={{
              backgroundColor: '#1a1a18', color: '#f0ede5', fontSize: '11px',
              padding: '5px 8px', borderRadius: '5px', lineHeight: 1.4,
              maxWidth: '200px',
            }}
          >
            <p style={{ fontWeight: 600 }}>{name}</p>
            {email && <p style={{ color: '#9a9a9a', marginTop: '1px' }}>{email}</p>}
            <Tooltip.Arrow style={{ fill: '#1a1a18' }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

// ─── Row variant (for dropdown items) ────────────────────────────────────────

interface UserAvatarRowProps {
  name: string
  initials: string
  color: string
  email?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showEmail?: boolean
  textColor?: string
  mutedColor?: string
}

export function UserAvatarRow({
  name, initials, color, email,
  size = 'sm',
  showEmail = false,
  textColor = '#f0ede5',
  mutedColor = '#6b6b6b',
}: UserAvatarRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
      <AvatarCircle initials={initials} color={color} size={size} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          fontSize: '12px', fontWeight: 500, color: textColor,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {name}
        </p>
        {showEmail && email && (
          <p style={{
            fontSize: '10px', color: mutedColor,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3, marginTop: '1px',
          }}>
            {email}
          </p>
        )}
      </div>
    </div>
  )
}
