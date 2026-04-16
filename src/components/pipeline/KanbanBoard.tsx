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
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { STAGES, type StageId } from '@/constants/pipeline'
import { StageColumn } from './StageColumn'
import { DealCard } from './DealCard'
import type { Deal, GroupedDeals } from '@/types/deal.types'

interface KanbanBoardProps {
  initialDeals: Deal[]
  visibleOwnerIds?: string[] // empty = all owners
  searchQuery?: string       // empty = no filter
  pendingNewDeal?: Deal | null
  onNewDealConsumed?: () => void
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

export function KanbanBoard({ initialDeals, visibleOwnerIds, searchQuery, pendingNewDeal, onNewDealConsumed }: KanbanBoardProps) {
  const [grouped, setGrouped] = useState<GroupedDeals>(() => groupByStage(initialDeals))
  const [activeId, setActiveId] = useState<string | null>(null)
  const groupedRef = useRef(grouped)
  groupedRef.current = grouped

  // ── Optimistic insert for new leads ───────────────────────────────────────
  useEffect(() => {
    if (!pendingNewDeal) return
    setGrouped((prev) => ({
      ...prev,
      [pendingNewDeal.stage_id]: [pendingNewDeal, ...prev[pendingNewDeal.stage_id]],
    }))
    onNewDealConsumed?.()
  }, [pendingNewDeal, onNewDealConsumed])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Owner filter (visual — drag state unaffected) ─────────────────────────
  const ownerFiltered = useMemo<GroupedDeals>(() => {
    if (!visibleOwnerIds?.length) return grouped
    const res = {} as GroupedDeals
    for (const sid of Object.keys(grouped) as StageId[]) {
      res[sid] = grouped[sid].filter((d) => visibleOwnerIds.includes(d.owner_id))
    }
    return res
  }, [grouped, visibleOwnerIds])

  // ── Search: returns Set of matching deal ids (opacity dimming) ────────────
  const dimmedIds = useMemo<Set<string> | undefined>(() => {
    const q = searchQuery?.trim().toLowerCase()
    if (!q) return undefined
    const matching = new Set<string>()
    for (const deals of Object.values(ownerFiltered)) {
      for (const d of deals) {
        if (
          d.title.toLowerCase().includes(q) ||
          d.company_name.toLowerCase().includes(q) ||
          d.owner.name.toLowerCase().includes(q) ||
          d.tags?.some((t) => t.toLowerCase().includes(q))
        ) {
          matching.add(d.id)
        }
      }
    }
    return matching
  }, [ownerFiltered, searchQuery])

  const activeDeal = activeId
    ? Object.values(grouped).flat().find((d) => d.id === activeId)
    : null

  // ── DnD handlers ──────────────────────────────────────────────────────────

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id))
  }, [])

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return
    const g = groupedRef.current
    const aId = String(active.id)
    const oId = String(over.id)
    const from = findContainerId(g, aId)
    const to   = findContainerId(g, oId)
    if (!from || !to || from === to) return
    setGrouped((prev) => {
      const fromItems = prev[from]
      const toItems   = prev[to]
      const fromIdx   = fromItems.findIndex((d) => d.id === aId)
      const toIdx     = toItems.findIndex((d) => d.id === oId)
      if (fromIdx === -1) return prev
      const insertAt  = toIdx >= 0 ? toIdx : toItems.length
      const moved     = { ...fromItems[fromIdx], stage_id: to }
      return {
        ...prev,
        [from]: fromItems.filter((d) => d.id !== aId),
        [to]:   [...toItems.slice(0, insertAt), moved, ...toItems.slice(insertAt)],
      }
    })
  }, [])

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const g    = groupedRef.current
    const aId  = String(active.id)
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
  }, [])

  // ── Quick-action move ─────────────────────────────────────────────────────

  const onMoveDeal = useCallback((dealId: string, targetStage: StageId) => {
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
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-[14px] overflow-x-auto pb-4 pt-0.5 px-0.5">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            deals={ownerFiltered[stage.id] ?? []}
            dimmedIds={dimmedIds}
            onMoveDeal={onMoveDeal}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeDeal ? <DealCard deal={activeDeal} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
