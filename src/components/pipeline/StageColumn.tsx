import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Inbox, TrendingDown } from 'lucide-react'
import { DealCard } from './DealCard'
import { LOSS_REASON_PRESETS } from './LostDealCard'
import { evaluateDealScore } from '@/lib/dealScore'
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
  sortMode?: 'manual' | 'score'
  onAddDeal?: (stageId: StageId) => void
}

export function StageColumn({ stage, deals, dimmedIds, onMoveDeal: _onMoveDeal, showScore, highlightNew, sortMode, onAddDeal: _onAddDeal }: StageColumnProps) {
  const totalValue = deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0)
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const isLostStage = stage.id === 'closed_lost'

  const avgDays = deals.length > 0
    ? Math.round(deals.reduce((s, d) => s + (d.days_in_stage ?? 0), 0) / deals.length)
    : null

  // ── Lost-stage stats ──────────────────────────────────────────────────────
  const lostStats = (() => {
    if (!isLostStage || deals.length === 0) return null
    const withReason = deals.filter((d) => d.loss_reason)
    const topReason = (() => {
      const counts: Record<string, number> = {}
      for (const preset of LOSS_REASON_PRESETS) {
        counts[preset.key] = 0
      }
      for (const d of withReason) {
        const lower = (d.loss_reason ?? '').toLowerCase()
        for (const p of LOSS_REASON_PRESETS) {
          const terms: Record<string, string[]> = {
            preco: ['preço', 'preco', 'caro'],
            orcamento: ['orçamento', 'orcamento', 'budget'],
            concorrente: ['concorrente', 'competitor'],
            timing: ['timing', 'momento', 'prazo'],
            necessidade: ['necessidade', 'need'],
            decisor: ['decisor', 'decisão', 'decision'],
            interesse: ['interesse', 'interest'],
            proposta: ['proposta', 'proposal'],
          }
          if (terms[p.key]?.some((t) => lower.includes(t))) {
            counts[p.key]++
            break
          }
        }
      }
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      if (!top || top[1] === 0) return null
      return LOSS_REASON_PRESETS.find((p) => p.key === top[0]) ?? null
    })()
    return { withReason: withReason.length, topReason }
  })()

  // Sort deals based on mode
  const sortedDeals = (() => {
    if (isLostStage) {
      // Most recent lost first
      return [...deals].sort((a, b) => {
        const aDate = a.stage_changed_at ?? a.updated_at
        const bDate = b.stage_changed_at ?? b.updated_at
        return bDate.localeCompare(aDate)
      })
    }
    if (sortMode === 'score') {
      return [...deals].sort((a, b) => evaluateDealScore(b) - evaluateDealScore(a))
    }
    if (highlightNew) {
      return [...deals].sort((a, b) => {
        const aNew = a.created_at ? (Date.now() - new Date(a.created_at).getTime()) / 86_400_000 <= 7 : false
        const bNew = b.created_at ? (Date.now() - new Date(b.created_at).getTime()) / 86_400_000 <= 7 : false
        if (aNew && !bNew) return -1
        if (!aNew && bNew) return 1
        return 0
      })
    }
    return deals
  })()

  return (
    <div
      style={{
        width: '280px',
        minWidth: '280px',
        maxWidth: '280px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* ── Header — altura fixa para todas as colunas alinharem ── */}
      <div style={{
        height: isLostStage ? 'auto' : '44px',
        flexShrink: 0,
        padding: isLostStage ? '6px 4px 8px' : '4px 4px 0',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {isLostStage && <TrendingDown size={12} color={stage.color} strokeWidth={2.5} />}
            <span style={{ fontSize: '12px', fontWeight: 700, color: stage.color, letterSpacing: '0.01em' }}>
              {stage.label}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700,
              color: stage.color,
              backgroundColor: `${stage.color}18`,
              borderRadius: '999px', padding: '1px 7px',
              fontFamily: "'Geist Mono', monospace",
            }}>
              {deals.length}
            </span>
          </div>
          {totalValue > 0 && (
            <span style={{
              fontSize: '10px', fontWeight: 600,
              color: stage.color,
              fontFamily: "'Geist Mono', monospace",
              opacity: 0.75,
              textDecoration: isLostStage ? 'line-through' : 'none',
            }}>
              {fmtCompact(totalValue)}
            </span>
          )}
        </div>
        {isLostStage && lostStats ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
            {lostStats.topReason && (() => {
              const Icon = lostStats.topReason.icon
              return (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  fontSize: '9px', fontWeight: 700,
                  color: lostStats.topReason!.color,
                  backgroundColor: `${lostStats.topReason!.color}18`,
                  borderRadius: '999px', padding: '2px 7px',
                }}>
                  <Icon size={8} />
                  {lostStats.topReason.label}
                </span>
              )
            })()}
            <span style={{ fontSize: '9px', color: `${stage.color}70` }}>
              {lostStats.withReason}/{deals.length} com motivo
            </span>
          </div>
        ) : (
          avgDays !== null && avgDays > 0 && (
            <p style={{ fontSize: '10px', color: stage.color, opacity: 0.55, marginTop: '2px' }}>
              média {avgDays}d na etapa
            </p>
          )
        )}
      </div>

      {/* ── Cards container ── */}
      <SortableContext items={sortedDeals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="kanban-cards-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            borderRadius: '12px',
            backgroundColor: 'var(--surface-raised)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: '300px',
            border: isOver ? `2px dashed ${stage.color}` : '1px solid var(--line)',
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
            ...(isOver ? { backgroundColor: 'var(--surface-col)' } : {}),
          }}
        >
          {deals.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '32px 0',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                backgroundColor: `${stage.color}14`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: stage.color,
              }}>
                {isLostStage ? <TrendingDown size={18} /> : <Inbox size={18} />}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                {isOver ? 'Soltar aqui' : isLostStage ? 'Nenhum perdido' : 'Sem leads'}
              </span>
              {!isOver && !isLostStage && (
                <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>
                  Arraste ou clique abaixo
                </span>
              )}
            </div>
          ) : (
            sortedDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                dimmed={dimmedIds?.size ? !dimmedIds.has(deal.id) : false}
                showScore={showScore}
                highlightNew={highlightNew}
              />
            ))
          )}
        </div>
      </SortableContext>

    </div>
  )
}
