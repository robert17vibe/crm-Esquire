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
  highlightNew?: boolean
  onAddDeal?: (stageId: StageId) => void
}

export function StageColumn({ stage, deals, dimmedIds, onMoveDeal: _onMoveDeal, showScore, highlightNew }: StageColumnProps) {
  const totalValue = deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0)
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div
      ref={setNodeRef}
      className="deal-column"
      style={{
        width: '240px',
        minWidth: '240px',
        maxWidth: '240px',
        flexShrink: 0,
        borderRadius: 'var(--radius-lg)',
        backgroundColor: isOver ? 'var(--surface-raised)' : 'var(--surface-card)',
        border: isOver ? '1px solid var(--brand)' : '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '12px 14px 11px',
        flexShrink: 0,
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {/* Stage color dot */}
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            backgroundColor: stage.color, flexShrink: 0,
          }} />

          {/* Label */}
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--ink-muted)', textTransform: 'uppercase', flex: 1,
          }}>
            {stage.label}
          </span>

          {/* Count pill */}
          <span style={{
            fontSize: '11px', fontWeight: 600,
            color: 'var(--ink-muted)',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-full)',
            padding: '0 7px',
            lineHeight: '20px',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {deals.length}
          </span>

        </div>

        {/* Total value */}
        {totalValue > 0 && (
          <p style={{
            fontSize: '11px', fontWeight: 700,
            color: 'var(--ink-faint)',
            marginTop: '5px',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
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
            gap: '7px',
            minHeight: '80px',
          }}
        >
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              dimmed={dimmedIds?.size ? !dimmedIds.has(deal.id) : false}
              showScore={showScore}
              highlightNew={highlightNew}
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
              border: isOver ? '1px dashed var(--brand)' : '1px dashed var(--line)',
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.15s ease',
            }}>
              {isOver ? 'Soltar aqui' : 'Sem leads'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
