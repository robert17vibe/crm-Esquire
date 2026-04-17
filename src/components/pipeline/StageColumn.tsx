import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useThemeStore } from '@/store/useThemeStore'
import { DealCard } from './DealCard'
import type { Stage, StageId } from '@/constants/pipeline'
import type { Deal } from '@/types/deal.types'

function formatStageValue(value: number): string {
  if (value === 0) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

interface StageColumnProps {
  stage: Stage
  deals: Deal[]
  dimmedIds?: Set<string>
  onMoveDeal: (dealId: string, targetStage: StageId) => void
  onEditDeal?: (deal: Deal) => void
  onDeleteDeal?: (dealId: string) => void
}

export function StageColumn({ stage, deals, dimmedIds, onMoveDeal, onEditDeal, onDeleteDeal }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const isDark = useThemeStore((s) => s.isDark)

  const colBg   = isDark ? (isOver ? '#1c1c1c' : '#141414') : (isOver ? '#f1f5f9' : '#f8fafc')
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)

  return (
    <div
      className="deal-column"
      style={{
        width: '234px',
        minWidth: '234px',
        maxWidth: '234px',
        flexShrink: 0,
        borderRadius: '8px',
        backgroundColor: colBg,
        borderLeft: `3px solid ${stage.color}`,
        border: `1px solid ${isDark ? '#242424' : '#e2e8f0'}`,
        borderLeftWidth: '3px',
        borderLeftColor: stage.color,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'background-color 0.15s ease',
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '12px 14px 10px', flexShrink: 0, borderBottom: `1px solid ${isDark ? '#1e1e1e' : '#e8edf2'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: stage.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: isDark ? '#c8d0da' : '#334155',
                textTransform: 'uppercase',
              }}
            >
              {stage.label}
            </span>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: isDark ? '#4a5568' : '#94a3b8',
              backgroundColor: isDark ? '#1e1e1e' : '#f1f5f9',
              borderRadius: '4px',
              padding: '2px 7px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {deals.length}
          </span>
        </div>

        <p
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: isDark ? '#6b7280' : '#64748b',
            marginTop: '5px',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'monospace',
            letterSpacing: '-0.01em',
          }}
        >
          {formatStageValue(totalValue)}
        </p>
      </div>

      {/* ── Cards ── */}
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minHeight: '80px',
            scrollbarWidth: 'thin',
            scrollbarColor: `${isDark ? '#2a2a2a' : '#e2e8f0'} transparent`,
          }}
        >
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onMoveDeal={onMoveDeal}
              onEditDeal={onEditDeal}
              onDeleteDeal={onDeleteDeal}
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
                color: isDark ? '#2d3748' : '#cbd5e1',
                userSelect: 'none',
                letterSpacing: '0.02em',
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
