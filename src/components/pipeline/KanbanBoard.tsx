import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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
  visibleOwnerIds?: string[]
  searchQuery?: string
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
  visibleOwnerIds,
  searchQuery,
  pendingNewDeal,
  onNewDealConsumed,
  pendingUpdatedDeal,
  onUpdatedDealConsumed,
  onEditDeal,
  onDeleteDeal,
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

  // ── Owner filter ──────────────────────────────────────────────────────────
  const ownerFiltered = useMemo<GroupedDeals>(() => {
    if (!visibleOwnerIds?.length) return grouped
    const res = {} as GroupedDeals
    for (const sid of Object.keys(grouped) as StageId[]) {
      res[sid] = grouped[sid].filter((d) => visibleOwnerIds.includes(d.owner_id))
    }
    return res
  }, [grouped, visibleOwnerIds])

  // ── Search filter — hide non-matching cards completely ─────────────────────
  const searchFiltered = useMemo<GroupedDeals>(() => {
    const q = searchQuery?.trim().toLowerCase()
    if (!q) return ownerFiltered
    const res = {} as GroupedDeals
    for (const sid of Object.keys(ownerFiltered) as StageId[]) {
      res[sid] = ownerFiltered[sid].filter((d) => {
        const val = String(d.value ?? '')
        return (
          d.title?.toLowerCase().includes(q) ||
          d.company_name?.toLowerCase().includes(q) ||
          d.contact_name?.toLowerCase().includes(q) ||
          d.contact_email?.toLowerCase().includes(q) ||
          d.contact_phone?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          d.owner?.name?.toLowerCase().includes(q) ||
          d.company_sector?.toLowerCase().includes(q) ||
          val.includes(q) ||
          (d.tags as string[] | null)?.some((t) => t.toLowerCase().includes(q))
        )
      })
    }
    return res
  }, [ownerFiltered, searchQuery])

  const dimmedIds = undefined

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
    const aId = String(active.id)

    const startStage   = dragStartStageRef.current
    const currentStage = dragCurrentStageRef.current

    if (startStage && currentStage && startStage !== currentStage) {
      if (currentStage === 'closed_lost') {
        // Defer: show modal before committing
        setPendingLossMove({ dealId: aId, fromStage: startStage })
      } else {
        onStageChange?.(aId, currentStage)
      }
    }

    if (!over) return
    const g    = groupedRef.current
    const oId  = String(over.id)
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

  // ── Delete from board ─────────────────────────────────────────────────────

  const handleDeleteDeal = useCallback((dealId: string) => {
    setGrouped((prev) => {
      const next = { ...prev }
      for (const sid of Object.keys(next) as StageId[]) {
        next[sid] = next[sid].filter((d) => d.id !== dealId)
      }
      return next
    })
    onDeleteDeal?.(dealId)
  }, [onDeleteDeal])

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
              deals={searchFiltered[stage.id] ?? []}
              dimmedIds={dimmedIds}
              onMoveDeal={onMoveDeal}
              onEditDeal={onEditDeal}
              onDeleteDeal={handleDeleteDeal}
            />
          ))}
        </div>

        <DragOverlay
          modifiers={[snapCenterToCursor]}
          dropAnimation={null}
          adjustScale={false}
          style={{ width: '230px', cursor: 'grabbing' }}
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
