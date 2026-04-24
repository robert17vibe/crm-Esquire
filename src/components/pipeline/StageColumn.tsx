import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DealCard } from './DealCard'
import type { Stage, StageId } from '@/constants/pipeline'
import type { Deal } from '@/types/deal.types'

function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

interface StageColumnProps {
  stage: Stage
  deals: Deal[]
  dimmedIds?: Set<string>
  onMoveDeal: (dealId: string, targetStage: StageId) => void
  showScore?: boolean
}

export function StageColumn({ stage, deals, dimmedIds, onMoveDeal: _onMoveDeal, showScore }: StageColumnProps) {
  const totalValue = deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0)
  // Attach droppable to the outer column so even empty columns are a large drop target
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

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
        backgroundColor: isOver ? 'var(--surface-col-over)' : 'var(--surface-col)',
        border: isOver ? '1px solid var(--brand)' : '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '10px 14px 9px', flexShrink: 0, borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
            color: stage.color, textTransform: 'uppercase',
          }}>
            {stage.label}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 500,
            color: 'var(--ink-faint)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {deals.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p style={{
            fontSize: '11px', fontWeight: 700,
            color: 'var(--ink-muted)',
            marginTop: '2px', fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtCompact(totalValue)}
          </p>
        )}
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
              showScore={showScore}
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
              color: isOver ? 'var(--ink-muted)' : 'var(--ink-faint)',
              userSelect: 'none',
              letterSpacing: '0.02em',
              border: isOver ? '1px dashed var(--brand)' : '1px dashed transparent',
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
