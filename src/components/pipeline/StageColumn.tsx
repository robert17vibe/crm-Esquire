import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useThemeStore } from '@/store/useThemeStore'
import { DealCard } from './DealCard'
import type { Stage, StageId } from '@/constants/pipeline'
import type { Deal } from '@/types/deal.types'

interface StageColumnProps {
  stage: Stage
  deals: Deal[]
  dimmedIds?: Set<string>
  onMoveDeal: (dealId: string, targetStage: StageId) => void
}

export function StageColumn({ stage, deals, dimmedIds, onMoveDeal }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const isDark = useThemeStore((s) => s.isDark)

  // Column tint: 6% light / 4% dark — doubled on drop-hover
  const tintAlpha    = isDark ? '0a' : '0f'
  const tintAlphaOver = isDark ? '14' : '1a'
  const colBg = isOver ? `${stage.color}${tintAlphaOver}` : `${stage.color}${tintAlpha}`

  return (
    <div
      className="deal-column"
      style={{
        width: '230px',
        minWidth: '230px',
        maxWidth: '230px',
        flexShrink: 0,
        borderRadius: '14px',
        backgroundColor: colBg,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* ── Stage color strip ── */}
      <div
        style={{
          height: '6px',
          borderRadius: '14px 14px 0 0',
          backgroundColor: stage.color,
          flexShrink: 0,
        }}
      />

      {/* ── Header ── */}
      <div
        style={{
          padding: '8px 12px 10px 12px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          className="text-ink-base"
          style={{ fontSize: '13px', fontWeight: 600 }}
        >
          {stage.label}
        </span>

        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: stage.color,
            backgroundColor: `${stage.color}1a`,
            borderRadius: '99px',
            padding: '2px 8px',
          }}
        >
          {deals.length}
        </span>
      </div>

      {/* ── Cards list ── */}
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: '80px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(var(--line-rgb)) transparent',
          }}
        >
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onMoveDeal={onMoveDeal}
              dimmed={dimmedIds?.size ? !dimmedIds.has(deal.id) : false}
            />
          ))}
          {deals.length === 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '64px',
                fontSize: '11px',
                color: 'var(--ink-faint)',
                userSelect: 'none',
              }}
            >
              Arraste um deal aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
