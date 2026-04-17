import { useState, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, Check } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { NewLeadModal } from '@/components/pipeline/NewLeadModal'
import { EditDealModal } from '@/components/pipeline/EditDealModal'
import { MOCK_OWNERS } from '@/lib/mock-data'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import type { Deal } from '@/types/deal.types'

export function PipelinePage() {
  const deals      = useDealStore((s) => s.deals)
  const deleteDeal = useDealStore((s) => s.deleteDeal)
  const isDark     = useThemeStore((s) => s.isDark)

  const [selectedOwners, setSelectedOwners] = useState<string[]>([])
  const [searchQuery, setSearchQuery]       = useState('')
  const [showNewModal, setShowNewModal]     = useState(false)
  const [editingDeal, setEditingDeal]       = useState<Deal | null>(null)
  const [pendingNewDeal, setPendingNewDeal] = useState<Deal | null>(null)
  const [updatedDeal, setUpdatedDeal]       = useState<Deal | null>(null)

  function toggleOwner(id: string) {
    setSelectedOwners((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id],
    )
  }

  const activeDeals = useMemo(
    () => deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id)),
    [deals],
  )

  const pipelineValue = useMemo(
    () => activeDeals.reduce((sum, d) => sum + d.value, 0),
    [activeDeals],
  )

  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(pipelineValue)

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const headerBorder   = isDark ? '#242424' : '#e8e6e1'
  const inputBg        = isDark ? '#111111' : '#f5f4f1'
  const inputBorder    = isDark ? '#2a2a2a' : '#e0ddd8'
  const inputText      = isDark ? '#c8d0da' : '#1e293b'
  const inputPlaceholder = isDark ? '#3a3a3a' : '#a0998c'
  const filterBg       = isDark ? '#111111' : '#f5f4f1'
  const filterBorder   = isDark ? '#2a2a2a' : '#e0ddd8'
  const filterText     = isDark ? '#888888' : '#6b6560'
  const newLeadBg      = isDark ? '#f0ede5' : '#0f0e0c'
  const newLeadText    = isDark ? '#0f0e0c' : '#f0ede5'
  const popoverBg      = isDark ? '#141414' : '#ffffff'
  const popoverBorder  = isDark ? '#2a2a2a' : '#e8e6e1'
  const ownerHover     = isDark ? '#1e1e1e' : '#f5f4f1'
  const ownerActive    = isDark ? '#1c1c1c' : '#f0ede540'
  const ownerText      = isDark ? '#c8d0da' : '#334155'
  const ownerMuted     = isDark ? '#4a5568' : '#94a3b8'
  const subtitleColor  = isDark ? '#4a4a4a' : '#9a9080'

  const filterActive = selectedOwners.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── 56px header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          height: '56px',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: `1px solid ${headerBorder}`,
          flexShrink: 0,
          gap: '16px',
        }}
      >
        {/* ── Zone left: title + subtitle ── */}
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#e8e4dc' : '#1a1814', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            Pipeline
          </p>
          <p style={{ fontSize: '10px', fontWeight: 500, color: subtitleColor, marginTop: '2px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
            <span style={{ fontFamily: 'monospace' }}>{formattedTotal}</span>
            <span style={{ margin: '0 5px', opacity: 0.5 }}>·</span>
            {activeDeals.length} ativos
          </p>
        </div>

        {/* ── Zone center: search + filter ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, maxWidth: '520px' }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                width: '13px', height: '13px', color: inputPlaceholder, pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar deal, empresa..."
              style={{
                width: '100%',
                height: '32px',
                paddingLeft: '30px',
                paddingRight: '10px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: inputBg,
                border: `1px solid ${inputBorder}`,
                borderRadius: '6px',
                color: inputText,
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = isDark ? '#3a3a3a' : '#c8c4be')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = inputBorder)}
            />
          </div>

          {/* Filter Popover */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '32px',
                  padding: '0 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: filterActive ? (isDark ? '#e8e4dc' : '#1a1814') : filterText,
                  backgroundColor: filterActive ? (isDark ? '#1e1e1e' : '#ede9e2') : filterBg,
                  border: `1px solid ${filterActive ? (isDark ? '#3a3a3a' : '#c8c4be') : filterBorder}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <SlidersHorizontal style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                Filtrar
                {filterActive && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: isDark ? '#2a2a2a' : '#1a1814',
                      color: isDark ? '#e8e4dc' : '#f0ede5',
                      fontSize: '9px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {selectedOwners.length}
                  </span>
                )}
              </button>
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Content
                sideOffset={6}
                align="end"
                style={{
                  backgroundColor: popoverBg,
                  border: `1px solid ${popoverBorder}`,
                  borderRadius: '8px',
                  padding: '12px',
                  width: '220px',
                  boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
                  zIndex: 50,
                  outline: 'none',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: ownerMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Responsável
                  </p>
                  {filterActive && (
                    <button
                      type="button"
                      onClick={() => setSelectedOwners([])}
                      style={{ fontSize: '10px', fontWeight: 600, color: ownerMuted, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Todos */}
                <button
                  type="button"
                  onClick={() => setSelectedOwners([])}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: ownerText,
                    backgroundColor: !filterActive ? ownerActive : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: '2px',
                  }}
                  onMouseEnter={(e) => { if (filterActive) e.currentTarget.style.backgroundColor = ownerHover }}
                  onMouseLeave={(e) => { if (filterActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <span>Todos</span>
                  {!filterActive && <Check style={{ width: '11px', height: '11px', color: ownerMuted }} />}
                </button>

                <div style={{ height: '1px', backgroundColor: popoverBorder, margin: '6px 0' }} />

                {/* Owner rows */}
                {MOCK_OWNERS.map((owner) => {
                  const isActive = selectedOwners.includes(owner.id)
                  return (
                    <button
                      key={owner.id}
                      type="button"
                      onClick={() => toggleOwner(owner.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: ownerText,
                        backgroundColor: isActive ? ownerActive : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = ownerHover }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: owner.avatar_color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '8px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {owner.initials}
                      </div>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {owner.name.split(' ')[0]}
                      </span>
                      {isActive && <Check style={{ width: '11px', height: '11px', color: ownerMuted, flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        {/* ── Zone right: new lead ── */}
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            height: '32px',
            padding: '0 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: newLeadText,
            backgroundColor: newLeadBg,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            flexShrink: 0,
            letterSpacing: '-0.01em',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Plus style={{ width: '13px', height: '13px', flexShrink: 0 }} />
          Novo Lead
        </button>
      </div>

      {/* ── Board ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <KanbanBoard
          initialDeals={deals}
          visibleOwnerIds={selectedOwners.length > 0 ? selectedOwners : undefined}
          searchQuery={searchQuery}
          pendingNewDeal={pendingNewDeal}
          onNewDealConsumed={() => setPendingNewDeal(null)}
          pendingUpdatedDeal={updatedDeal}
          onUpdatedDealConsumed={() => setUpdatedDeal(null)}
          onEditDeal={setEditingDeal}
          onDeleteDeal={deleteDeal}
        />
      </div>

      {/* ── Modals ── */}
      <NewLeadModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={(deal) => {
          setPendingNewDeal(deal)
          setShowNewModal(false)
        }}
      />

      <EditDealModal
        deal={editingDeal}
        open={!!editingDeal}
        onClose={() => setEditingDeal(null)}
        onUpdated={(deal) => {
          setUpdatedDeal(deal)
          setEditingDeal(null)
        }}
      />
    </div>
  )
}
