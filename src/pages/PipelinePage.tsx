import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal, Check } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import * as Tooltip from '@radix-ui/react-tooltip'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { NewLeadModal } from '@/components/pipeline/NewLeadModal'
import { EditDealModal } from '@/components/pipeline/EditDealModal'
import { useDealStore } from '@/store/useDealStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useThemeStore } from '@/store/useThemeStore'
import type { Deal } from '@/types/deal.types'
import { UserAvatarRow } from '@/components/ui/UserAvatar'

export function PipelinePage() {
  const deals         = useDealStore((s) => s.deals)
  const deleteDeal    = useDealStore((s) => s.deleteDeal)
  const moveDeal      = useDealStore((s) => s.moveDeal)
  const setLossReason = useDealStore((s) => s.setLossReason)
  const owners        = useOwnerStore((s) => s.owners)
  const isDark        = useThemeStore((s) => s.isDark)

  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery    = searchParams.get('search') ?? ''
  const selectedOwners = useMemo(() => {
    const raw = searchParams.get('owners')
    return raw ? raw.split(',').filter(Boolean) : []
  }, [searchParams])

  const [showNewModal, setShowNewModal]     = useState(false)
  const [editingDeal, setEditingDeal]       = useState<Deal | null>(null)
  const [pendingNewDeal, setPendingNewDeal] = useState<Deal | null>(null)
  const [updatedDeal, setUpdatedDeal]       = useState<Deal | null>(null)

  const setSearch = useCallback((q: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (q) next.set('search', q); else next.delete('search')
      return next
    }, { replace: true })
  }, [setSearchParams])

  function toggleOwner(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      const cur  = (next.get('owners') ?? '').split(',').filter(Boolean)
      const updated = cur.includes(id) ? cur.filter((o) => o !== id) : [...cur, id]
      if (updated.length) next.set('owners', updated.join(',')); else next.delete('owners')
      return next
    }, { replace: true })
  }

  function clearOwners() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('owners')
      return next
    }, { replace: true })
  }

  // ── All filters in one place ──────────────────────────────────────────────
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

    return result
  }, [deals, selectedOwners, searchQuery])

  const hasFilter = selectedOwners.length > 0 || !!searchQuery

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const headerBorder     = isDark ? '#242424' : '#e8e6e1'
  const inputBg          = isDark ? '#111111' : '#f5f4f1'
  const inputBorder      = isDark ? '#2a2a2a' : '#e0ddd8'
  const inputText        = isDark ? '#c8d0da' : '#1e293b'
  const inputPlaceholder = isDark ? '#3a3a3a' : '#a0998c'
  const filterBg         = isDark ? '#111111' : '#f5f4f1'
  const filterBorder     = isDark ? '#2a2a2a' : '#e0ddd8'
  const filterText       = isDark ? '#888888' : '#6b6560'
  const newLeadBg        = isDark ? '#f0ede5' : '#0f0e0c'
  const newLeadText      = isDark ? '#0f0e0c' : '#f0ede5'
  const popoverBg        = isDark ? '#141414' : '#ffffff'
  const popoverBorder    = isDark ? '#2a2a2a' : '#e8e6e1'
  const ownerHover       = isDark ? '#1e1e1e' : '#f5f4f1'
  const ownerActive      = isDark ? '#1c1c1c' : '#f0ede540'
  const ownerText        = isDark ? '#c8d0da' : '#334155'
  const ownerMuted       = isDark ? '#4a5568' : '#94a3b8'
  const filterActive     = selectedOwners.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        height: '56px', minHeight: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: `1px solid ${headerBorder}`,
        flexShrink: 0, gap: '12px',
      }}>

        {/* Left: search + filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '460px' }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              width: '13px', height: '13px', color: inputPlaceholder, pointerEvents: 'none',
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lead, empresa, responsável..."
              style={{
                width: '100%', height: '32px',
                paddingLeft: '30px', paddingRight: searchQuery ? '28px' : '10px',
                fontSize: '12px', fontWeight: 500,
                backgroundColor: inputBg, border: `1px solid ${inputBorder}`,
                borderRadius: '6px', color: inputText, outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = isDark ? '#3a3a3a' : '#c8c4be')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = inputBorder)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: inputPlaceholder, display: 'flex', alignItems: 'center',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Owner filter popover */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button type="button" style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                height: '32px', padding: '0 10px',
                fontSize: '12px', fontWeight: 600,
                color: filterActive ? (isDark ? '#e8e4dc' : '#1a1814') : filterText,
                backgroundColor: filterActive ? (isDark ? '#1e1e1e' : '#ede9e2') : filterBg,
                border: `1px solid ${filterActive ? (isDark ? '#3a3a3a' : '#c8c4be') : filterBorder}`,
                borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}>
                <SlidersHorizontal style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                Filtrar
                {filterActive && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '16px', height: '16px', borderRadius: '50%',
                    backgroundColor: isDark ? '#2a2a2a' : '#1a1814',
                    color: isDark ? '#e8e4dc' : '#f0ede5',
                    fontSize: '9px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {selectedOwners.length}
                  </span>
                )}
              </button>
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Content sideOffset={6} align="end" style={{
                backgroundColor: popoverBg, border: `1px solid ${popoverBorder}`,
                borderRadius: '8px', padding: '12px', width: '220px',
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
                zIndex: 50, outline: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: ownerMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Responsável
                  </p>
                  {filterActive && (
                    <button type="button" onClick={clearOwners}
                      style={{ fontSize: '10px', fontWeight: 600, color: ownerMuted, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                      Limpar
                    </button>
                  )}
                </div>

                <button type="button" onClick={clearOwners}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '6px 8px', borderRadius: '5px',
                    fontSize: '12px', fontWeight: 500, color: ownerText,
                    backgroundColor: !filterActive ? ownerActive : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: '2px',
                  }}
                  onMouseEnter={(e) => { if (filterActive) e.currentTarget.style.backgroundColor = ownerHover }}
                  onMouseLeave={(e) => { if (filterActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <span>Todos</span>
                  {!filterActive && <Check style={{ width: '11px', height: '11px', color: ownerMuted }} />}
                </button>

                <div style={{ height: '1px', backgroundColor: popoverBorder, margin: '6px 0' }} />

                {owners.map((owner) => {
                  const isActive = selectedOwners.includes(owner.id)
                  return (
                    <button key={owner.id} type="button" onClick={() => toggleOwner(owner.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        width: '100%', padding: '6px 8px', borderRadius: '5px',
                        backgroundColor: isActive ? ownerActive : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = ownerHover }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <UserAvatarRow
                        name={owner.name}
                        initials={owner.initials}
                        color={owner.avatar_color}
                        size="xs"
                        textColor={ownerText}
                      />
                      {isActive && <Check style={{ width: '11px', height: '11px', color: ownerMuted, flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        {/* Right: new lead button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <Tooltip.Provider delayDuration={400}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button type="button" onClick={() => setShowNewModal(true)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '8px',
                  backgroundColor: newLeadBg, border: 'none', cursor: 'pointer',
                  flexShrink: 0, transition: 'opacity 0.15s ease',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <Plus style={{ width: '16px', height: '16px', color: newLeadText }} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content sideOffset={6} style={{
                  fontSize: '11px', fontWeight: 500,
                  color: isDark ? '#1a1814' : '#f0ede5',
                  backgroundColor: isDark ? '#e8e4dc' : '#1a1814',
                  borderRadius: '5px', padding: '4px 8px', zIndex: 50, userSelect: 'none',
                }}>
                  Novo lead
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
          <Search style={{ width: '28px', height: '28px', color: filterText }} />
          <p style={{ fontSize: '13px', fontWeight: 600, color: filterText }}>Nenhum deal encontrado</p>
          <p style={{ fontSize: '12px', color: filterText }}>Tente outros termos ou limpe os filtros</p>
          <button type="button" onClick={() => { clearOwners(); setSearch('') }}
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
