import type { Owner } from '@/types/deal.types'

const OWNER_FALLBACK_COLORS = ['#2c5545', '#0891b2', '#059669', '#d97706', '#7c3aed', '#334155']

function hashToIndex(input: string, size: number): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % size
}

export function buildOwnerFallback(ownerId: string, displayName?: string): Owner {
  const baseName = (displayName ?? '').trim()
  const name = baseName.length > 0 ? baseName : `Usuário ${ownerId.slice(0, 6)}`
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase() || 'U'

  return {
    id: ownerId,
    name,
    initials,
    avatar_color: OWNER_FALLBACK_COLORS[hashToIndex(`${ownerId}:${name}`, OWNER_FALLBACK_COLORS.length)],
  }
}
