import { cn } from '@/lib/utils'
import type { Owner } from '@/types/deal.types'

interface OwnerFilterProps {
  owners: Owner[]
  selected: string[]
  onToggle: (id: string) => void
  onClear: () => void
}

export function OwnerFilter({ owners, selected, onToggle, onClear }: OwnerFilterProps) {
  const allSelected = selected.length === 0

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[9px] font-bold text-ink-faint uppercase tracking-widest mr-0.5">
        Resp.
      </span>

      <button
        type="button"
        onClick={onClear}
        className={cn(
          'text-[11px] font-semibold px-3 h-6 rounded-full transition-all duration-150',
          allSelected
            ? 'bg-brand text-white shadow-sm'
            : 'bg-surface-card text-ink-muted border border-line/60 hover:border-brand/40 hover:text-brand',
        )}
      >
        Todos
      </button>

      {owners.map((owner) => {
        const isActive = selected.includes(owner.id)
        return (
          <button
            key={owner.id}
            type="button"
            title={owner.name}
            onClick={() => onToggle(owner.id)}
            className={cn(
              'flex items-center gap-1.5 pl-0.5 pr-2.5 h-6 rounded-full text-[11px] font-medium border transition-all duration-150',
              isActive
                ? 'bg-surface-card border-brand/40 text-brand shadow-sm ring-2 ring-brand/15'
                : 'bg-surface-card border-line/60 text-ink-muted hover:border-brand/30 hover:text-brand',
            )}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
              style={{ backgroundColor: owner.avatar_color }}
            >
              {owner.initials}
            </div>
            <span>{owner.name.split(' ')[0]}</span>
          </button>
        )
      })}
    </div>
  )
}
