import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { STAGES, type StageId } from '@/constants/pipeline'
import { StageColumn } from './StageColumn'
import { DealCard } from './DealCard'
import { LossReasonModal } from './LossReasonModal'
import type { Deal, GroupedDeals } from '@/types/deal.types'

interface KanbanBoardProps {
  initialDeals: Deal[]
  pendingNewDeal?: Deal | null
  onNewDealConsumed?: () => void
  pendingUpdatedDeal?: Deal | null
  onUpdatedDealConsumed?: () => void
  onEditDeal?: (deal: Deal) => void
  onDeleteDeal?: (dealId: string) => void
  onStageChange?: (dealId: string, stageId: StageId) => void
  onLossReasonConfirmed?: (dealId: string, reason: string) => void
}

function groupByStage(deals: Deal[]): GroupedDeals {
  const g = STAGES.reduce<GroupedDeals>((acc, s) => { acc[s.id] = []; return acc }, {} as GroupedDeals)
  for (const d of deals) { g[d.stage_id]?.push(d) }
  return g
}

function findContainerId(grouped: GroupedDeals, id: UniqueIdentifier): StageId | undefined {
  const str = String(id)
  if (STAGES.some((s) => s.id === str)) return str as StageId
  for (const [stageId, deals] of Object.entries(grouped)) {
    if (deals.some((d) => d.id === str)) return stageId as StageId
  }
  return undefined
}

export function KanbanBoard({
  initialDeals,
  pendingNewDeal,
  onNewDealConsumed,
  pendingUpdatedDeal,
  onUpdatedDealConsumed,
  onEditDeal: _onEditDeal,
  onDeleteDeal: _onDeleteDeal,
  onStageChange,
  onLossReasonConfirmed,
}: KanbanBoardProps) {
  const [grouped, setGrouped] = useState<GroupedDeals>(() => groupByStage(initialDeals))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingLossMove, setPendingLossMove] = useState<{ dealId: string; fromStage: StageId } | null>(null)
  const consumedNewRef = useRef<string | null>(null)
  const consumedUpdatedRef = useRef<string | null>(null)
  const groupedRef = useRef(grouped)
  groupedRef.current = grouped
  const dragStartStageRef   = useRef<StageId | null>(null)
  const dragCurrentStageRef = useRef<StageId | null>(null)

  // ── Sync initialDeals when store updates (Supabase load, team filter, etc.) ──
  useEffect(() => {
    if (activeId) return // don't reset during an active drag
    setGrouped(groupByStage(initialDeals))
  }, [initialDeals]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Optimistic insert for new leads ───────────────────────────────────────
  useEffect(() => {
    if (!pendingNewDeal) return
    if (consumedNewRef.current === pendingNewDeal.id) return
    consumedNewRef.current = pendingNewDeal.id
    setGrouped((prev) => ({
      ...prev,
      [pendingNewDeal.stage_id]: [pendingNewDeal, ...prev[pendingNewDeal.stage_id]],
    }))
    onNewDealConsumed?.()
  }, [pendingNewDeal, onNewDealConsumed])

  // ── Sync updated deal into board state ────────────────────────────────────
  useEffect(() => {
    if (!pendingUpdatedDeal) return
    if (consumedUpdatedRef.current === pendingUpdatedDeal.id) return
    consumedUpdatedRef.current = pendingUpdatedDeal.id
    setGrouped((prev) => {
      const next = { ...prev }
      for (const sid of Object.keys(next) as StageId[]) {
        next[sid] = next[sid].filter((d) => d.id !== pendingUpdatedDeal.id)
      }
      const stage = pendingUpdatedDeal.stage_id
      next[stage] = [pendingUpdatedDeal, ...next[stage]]
      return next
    })
    onUpdatedDealConsumed?.()
  }, [pendingUpdatedDeal, onUpdatedDealConsumed])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeDeal = activeId
    ? Object.values(grouped).flat().find((d) => d.id === activeId)
    : null

  // ── Loss reason modal handlers ────────────────────────────────────────────

  function handleLossConfirm(reason: string) {
    if (!pendingLossMove) return
    const { dealId } = pendingLossMove
    // Stamp loss_reason on the card in local state
    setGrouped((prev) => ({
      ...prev,
      closed_lost: prev['closed_lost'].map((d) =>
        d.id === dealId ? { ...d, loss_reason: reason } : d
      ),
    }))
    onStageChange?.(dealId, 'closed_lost')
    onLossReasonConfirmed?.(dealId, reason)
    setPendingLossMove(null)
  }

  function handleLossCancel() {
    if (!pendingLossMove) return
    const { dealId, fromStage } = pendingLossMove
    setGrouped((prev) => {
      const deal = prev['closed_lost'].find((d) => d.id === dealId)
      if (!deal) return prev
      return {
        ...prev,
        closed_lost: prev['closed_lost'].filter((d) => d.id !== dealId),
        [fromStage]: [{ ...deal, stage_id: fromStage }, ...prev[fromStage]],
      }
    })
    setPendingLossMove(null)
  }

  // ── DnD handlers ──────────────────────────────────────────────────────────

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    const aId = String(active.id)
    setActiveId(aId)
    const stage = findContainerId(groupedRef.current, aId) ?? null
    dragStartStageRef.current   = stage
    dragCurrentStageRef.current = stage
  }, [])

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return
    const g   = groupedRef.current
    const aId = String(active.id)
    const oId = String(over.id)
    const from = findContainerId(g, aId)
    const to   = findContainerId(g, oId)
    if (!from || !to || from === to) return
    dragCurrentStageRef.current = to
    setGrouped((prev) => {
      const fromItems = prev[from]
      const toItems   = prev[to]
      const fromIdx   = fromItems.findIndex((d) => d.id === aId)
      const toIdx     = toItems.findIndex((d) => d.id === oId)
      if (fromIdx === -1) return prev
      const insertAt = toIdx >= 0 ? toIdx : toItems.length
      const moved    = { ...fromItems[fromIdx], stage_id: to }
      return {
        ...prev,
        [from]: fromItems.filter((d) => d.id !== aId),
        [to]:   [...toItems.slice(0, insertAt), moved, ...toItems.slice(insertAt)],
      }
    })
  }, [])

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null)
    const aId        = String(active.id)
    const startStage = dragStartStageRef.current
    const currentStage = dragCurrentStageRef.current

    if (!over) return

    const oId = String(over.id)

    // Dropped directly onto an empty column (over.id is a stage id, not a card id)
    const overIsStage        = STAGES.some((s) => s.id === oId)
    const activeCurrentStage = findContainerId(groupedRef.current, aId)

    if (overIsStage && activeCurrentStage !== oId) {
      const targetStage = oId as StageId
      setGrouped((prev) => {
        const from = activeCurrentStage
        if (!from) return prev
        const card = prev[from].find((d) => d.id === aId)
        if (!card) return prev
        return {
          ...prev,
          [from]: prev[from].filter((d) => d.id !== aId),
          [targetStage]: [{ ...card, stage_id: targetStage }, ...prev[targetStage]],
        }
      })
      if (targetStage === 'closed_lost') {
        setPendingLossMove({ dealId: aId, fromStage: startStage! })
      } else {
        onStageChange?.(aId, targetStage)
      }
      return
    }

    // Normal card-to-card drag — onDragOver already moved it visually
    if (startStage && currentStage && startStage !== currentStage) {
      if (currentStage === 'closed_lost') {
        setPendingLossMove({ dealId: aId, fromStage: startStage })
      } else {
        onStageChange?.(aId, currentStage)
      }
    }

    const g    = groupedRef.current
    const from = findContainerId(g, aId)
    const to   = findContainerId(g, oId)
    if (!from || !to || from !== to) return
    const items   = g[from]
    const fromIdx = items.findIndex((d) => d.id === aId)
    const toIdx   = items.findIndex((d) => d.id === oId)
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      setGrouped((prev) => ({
        ...prev,
        [from]: arrayMove(prev[from], fromIdx, toIdx),
      }))
    }
  }, [onStageChange])

  // ── Quick-action move ─────────────────────────────────────────────────────

  const onMoveDeal = useCallback((dealId: string, targetStage: StageId) => {
    if (targetStage === 'closed_lost') {
      let fromStage: StageId | undefined
      for (const [sid, deals] of Object.entries(groupedRef.current)) {
        if (deals.some((d) => d.id === dealId)) { fromStage = sid as StageId; break }
      }
      if (!fromStage || fromStage === 'closed_lost') return
      // Move visually first so modal shows the card in the correct column
      setGrouped((prev) => {
        const deal = prev[fromStage!].find((d) => d.id === dealId)
        if (!deal) return prev
        return {
          ...prev,
          [fromStage!]: prev[fromStage!].filter((d) => d.id !== dealId),
          closed_lost: [{ ...deal, stage_id: 'closed_lost' }, ...prev['closed_lost']],
        }
      })
      setPendingLossMove({ dealId, fromStage })
      return
    }

    setGrouped((prev) => {
      let from: StageId | undefined
      for (const [sid, deals] of Object.entries(prev)) {
        if (deals.some((d) => d.id === dealId)) { from = sid as StageId; break }
      }
      if (!from || from === targetStage) return prev
      const deal = prev[from].find((d) => d.id === dealId)
      if (!deal) return prev
      return {
        ...prev,
        [from]:        prev[from].filter((d) => d.id !== dealId),
        [targetStage]: [{ ...deal, stage_id: targetStage }, ...prev[targetStage]],
      }
    })
    onStageChange?.(dealId, targetStage)
  }, [onStageChange])


  // ── Pending loss deal title ───────────────────────────────────────────────

  const pendingLossDeal = pendingLossMove
    ? Object.values(grouped).flat().find((d) => d.id === pendingLossMove.dealId)
    : null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="kanban-board-scroll flex h-full gap-[14px] overflow-x-auto pb-4 pt-0.5" style={{ paddingLeft: '2px', paddingRight: '24px' }}>
          {STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={grouped[stage.id] ?? []}
              onMoveDeal={onMoveDeal}
            />
          ))}
        </div>

        <DragOverlay
          modifiers={[snapCenterToCursor]}
          dropAnimation={null}
          adjustScale={false}
          style={{ width: '234px', cursor: 'grabbing' }}
        >
          {activeDeal ? <DealCard deal={activeDeal} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {pendingLossMove && pendingLossDeal && (
        <LossReasonModal
          dealTitle={pendingLossDeal.title}
          onConfirm={handleLossConfirm}
          onCancel={handleLossCancel}
        />
      )}
    </>
  )
}
