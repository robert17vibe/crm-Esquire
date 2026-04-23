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

export function StageColumn({ stage, deals, dimmedIds, onMoveDeal: _onMoveDeal }: StageColumnProps) {
  // Attach droppable to the outer column so even empty columns are a large drop target
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const isDark = useThemeStore((s) => s.isDark)

  const colBg = isDark ? (isOver ? '#1c1c1c' : '#141414') : (isOver ? '#f1f5f9' : '#f8fafc')

  return (
    <div
      ref={setNodeRef}
      className="deal-column"
      style={{
        width: '234px',
        minWidth: '234px',
        maxWidth: '234px',
        flexShrink: 0,
        borderRadius: '8px',
        backgroundColor: colBg,
        border: isOver
          ? `1px solid ${isDark ? '#3a3a3a' : '#94a3b8'}`
          : `1px solid ${isDark ? '#242424' : '#e2e8f0'}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '12px 14px 10px', flexShrink: 0, borderBottom: `1px solid ${isDark ? '#1e1e1e' : '#e8edf2'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
            color: stage.color, textTransform: 'uppercase',
          }}>
            {stage.label}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 500,
            color: isDark ? '#4a5568' : '#94a3b8',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {deals.length}
          </span>
        </div>
      </div>

      {/* ── Cards (scrollable) ── */}
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div
          className="kanban-cards-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minHeight: '80px',
          }}
        >
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              dimmed={dimmedIds?.size ? !dimmedIds.has(deal.id) : false}
            />
          ))}
          {deals.length === 0 && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60px',
              fontSize: '11px',
              color: isOver ? (isDark ? '#6b6b6b' : '#94a3b8') : (isDark ? '#2d3748' : '#cbd5e1'),
              userSelect: 'none',
              letterSpacing: '0.02em',
              border: isOver ? `1px dashed ${isDark ? '#3a3a3a' : '#94a3b8'}` : '1px dashed transparent',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
            }}>
              {isOver ? 'Soltar aqui' : 'Arraste um lead aqui'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
