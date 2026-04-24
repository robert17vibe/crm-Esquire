import { useState, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Zap } from 'lucide-react'
import { evaluateDealScore } from '@/lib/dealScore'
import * as Tooltip from '@radix-ui/react-tooltip'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { NewLeadModal } from '@/components/pipeline/NewLeadModal'
import { EditDealModal } from '@/components/pipeline/EditDealModal'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import type { Deal } from '@/types/deal.types'

export function PipelinePage() {
  const deals         = useDealStore((s) => s.deals)
  const deleteDeal    = useDealStore((s) => s.deleteDeal)
  const moveDeal      = useDealStore((s) => s.moveDeal)
  const setLossReason = useDealStore((s) => s.setLossReason)
  const isDark        = useThemeStore((s) => s.isDark)

  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery    = searchParams.get('search') ?? ''
  const selectedOwners = useMemo(() => {
    const raw = searchParams.get('owners')
    return raw ? raw.split(',').filter(Boolean) : []
  }, [searchParams])

  type SortMode  = 'manual' | 'score' | 'urgency'

  const [showNewModal, setShowNewModal]     = useState(false)
  const [sortMode, setSortMode]             = useState<SortMode>('manual')
  const [editingDeal, setEditingDeal]       = useState<Deal | null>(null)
  const zapRef                              = useRef<HTMLButtonElement>(null)
  const [zapAnimating, setZapAnimating]     = useState(false)
  const [pendingNewDeal, setPendingNewDeal] = useState<Deal | null>(null)
  const [updatedDeal, setUpdatedDeal]       = useState<Deal | null>(null)

  const handleZapClick = useCallback(() => {
    setSortMode((m) => m === 'manual' ? 'score' : m === 'score' ? 'urgency' : 'manual')
    setZapAnimating(false)
    requestAnimationFrame(() => setZapAnimating(true))
  }, [])

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('owners'); next.delete('search')
      return next
    }, { replace: true })
  }

  // ── All filters + sort ────────────────────────────────────────────────────
  const displayDeals = useMemo<Deal[]>(() => {
    let result = deals

    if (selectedOwners.length > 0) {
      result = result.filter((d) => selectedOwners.includes(d.owner_id))
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((d) => {
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

    if (sortMode === 'score') {
      result = [...result].sort((a, b) => evaluateDealScore(b) - evaluateDealScore(a))
    } else if (sortMode === 'urgency') {
      const today = new Date().toISOString().slice(0, 10)
      result = [...result].sort((a, b) => {
        const aOv = a.next_activity?.due_date && a.next_activity.due_date < today ? 1 : 0
        const bOv = b.next_activity?.due_date && b.next_activity.due_date < today ? 1 : 0
        if (bOv !== aOv) return bOv - aOv
        return b.days_in_stage - a.days_in_stage
      })
    }

    return result
  }, [deals, selectedOwners, searchQuery, sortMode])

  const hasFilter = selectedOwners.length > 0 || !!searchQuery

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const headerBorder = isDark ? '#242424' : '#e8e6e1'
  const filterBg     = isDark ? '#111111' : '#f5f4f1'
  const filterBorder = isDark ? '#2a2a2a' : '#e0ddd8'
  const filterText   = isDark ? '#888888' : '#6b6560'
  const newLeadBg    = isDark ? '#f0ede5' : '#0f0e0c'
  const newLeadText  = isDark ? '#0f0e0c' : '#f0ede5'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        height: '56px', minHeight: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: `1px solid ${headerBorder}`,
        flexShrink: 0, gap: '12px',
      }}>

        {/* Left: title */}
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#e8e4dc' : '#1a1814', letterSpacing: '-0.01em' }}>Jornada</p>
          <p style={{ fontSize: '10px', color: isDark ? '#6b6560' : '#8a857d', marginTop: '1px' }}>
            {deals.length} leads
          </p>
        </div>

        {/* Right: sort + new lead */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

          {/* Sort mode — zap icon only with electrocuted effect */}
          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  ref={zapRef}
                  type="button"
                  onClick={handleZapClick}
                  title={sortMode === 'manual' ? 'Ordenar por score' : sortMode === 'score' ? 'Ordenar por urgência' : 'Voltar à ordem manual'}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                    backgroundColor: sortMode !== 'manual' ? (isDark ? '#1e1e1e' : '#ede9e2') : filterBg,
                    border: `1px solid ${sortMode !== 'manual' ? (isDark ? '#3a3a3a' : '#c8c4be') : filterBorder}`,
                    flexShrink: 0, transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  <Zap
                    className={zapAnimating ? 'zap-shock' : ''}
                    onAnimationEnd={() => setZapAnimating(false)}
                    style={{
                      width: '16px', height: '16px',
                      color: sortMode !== 'manual' ? '#facc15' : filterText,
                      fill: sortMode !== 'manual' ? '#facc15' : 'none',
                      transition: 'color 0.2s ease, fill 0.2s ease',
                    }}
                  />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content sideOffset={6} style={{
                  fontSize: '11px', fontWeight: 500,
                  color: isDark ? '#1a1814' : '#f0ede5',
                  backgroundColor: isDark ? '#e8e4dc' : '#1a1814',
                  borderRadius: '5px', padding: '4px 8px', zIndex: 50, userSelect: 'none',
                }}>
                  {sortMode === 'manual' ? 'Ordenar por score' : sortMode === 'score' ? 'Ordenar por urgência' : 'Voltar à ordem manual'}
                  <Tooltip.Arrow style={{ fill: isDark ? '#e8e4dc' : '#1a1814' }} />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>

          {/* Novo lead button with text */}
          <Tooltip.Provider delayDuration={400}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button type="button" onClick={() => setShowNewModal(true)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  height: '32px', padding: '0 12px', borderRadius: '8px',
                  backgroundColor: newLeadBg, border: 'none', cursor: 'pointer',
                  flexShrink: 0, transition: 'opacity 0.15s ease',
                  fontSize: '12px', fontWeight: 600, color: newLeadText,
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <Plus style={{ width: '14px', height: '14px', color: newLeadText }} />
                  Novo lead
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content sideOffset={6} style={{
                  fontSize: '11px', fontWeight: 500,
                  color: isDark ? '#1a1814' : '#f0ede5',
                  backgroundColor: isDark ? '#e8e4dc' : '#1a1814',
                  borderRadius: '5px', padding: '4px 8px', zIndex: 50, userSelect: 'none',
                }}>
                  Novo lead (N)
                  <Tooltip.Arrow style={{ fill: isDark ? '#e8e4dc' : '#1a1814' }} />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>

      {/* ── Empty state when filters return nothing ─────────────────────── */}
      {displayDeals.length === 0 && hasFilter && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: 0.6 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: filterText }}>Nenhum deal encontrado</p>
          <p style={{ fontSize: '12px', color: filterText }}>Tente outros termos ou limpe os filtros</p>
          <button type="button" onClick={() => { clearFilters(); setSortMode('manual') }}
            style={{ fontSize: '12px', fontWeight: 600, color: '#2c5545', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>
            Limpar filtros
          </button>
        </div>
      )}

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      {(displayDeals.length > 0 || !hasFilter) && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <KanbanBoard
            initialDeals={displayDeals}
            pendingNewDeal={pendingNewDeal}
            onNewDealConsumed={() => setPendingNewDeal(null)}
            pendingUpdatedDeal={updatedDeal}
            onUpdatedDealConsumed={() => setUpdatedDeal(null)}
            onEditDeal={setEditingDeal}
            onDeleteDeal={(id) => { deleteDeal(id) }}
            onStageChange={(id, stageId) => { moveDeal(id, stageId) }}
            onLossReasonConfirmed={(id, reason) => { setLossReason(id, reason) }}
            showScore={sortMode === 'score'}
            onAddDeal={() => setShowNewModal(true)}
          />
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <NewLeadModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={(deal) => { setPendingNewDeal(deal); setShowNewModal(false) }}
      />
      <EditDealModal
        deal={editingDeal}
        open={!!editingDeal}
        onClose={() => setEditingDeal(null)}
        onUpdated={(deal) => { setUpdatedDeal(deal); setEditingDeal(null) }}
      />
    </div>
  )
}
