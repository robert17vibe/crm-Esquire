import { useState, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { OwnerFilter } from '@/components/pipeline/OwnerFilter'
import { NewLeadModal } from '@/components/pipeline/NewLeadModal'
import { MOCK_DEALS, MOCK_OWNERS } from '@/lib/mock-data'
import type { Deal } from '@/types/deal.types'

export function PipelinePage() {
  const [selectedOwners, setSelectedOwners] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newDeal, setNewDeal] = useState<Deal | null>(null)

  function toggleOwner(id: string) {
    setSelectedOwners((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id],
    )
  }

  const activeDeals = useMemo(
    () => MOCK_DEALS.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id)),
    [],
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

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1
            className="text-ink-base"
            style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1.2 }}
          >
            Pipeline
          </h1>
          {/* Accent indicator — mirrors sidebar active item */}
          <div
            style={{
              height: '2px',
              width: '32px',
              backgroundColor: '#5b50e8',
              borderRadius: '99px',
              marginTop: '4px',
            }}
          />
          <div className="flex items-center gap-2" style={{ marginTop: '6px' }}>
            <span className="font-mono text-[11px] text-ink-muted">{formattedTotal} em aberto</span>
            <span className="text-ink-faint">·</span>
            <span className="text-[11px] text-ink-muted">{activeDeals.length} deals ativos</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar deal, empresa ou responsável..."
              className="w-64 pl-8 pr-3 py-1.5 text-[12px] font-bold text-ink-base placeholder-ink-faint bg-surface-card border border-line rounded-[12px] outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[12px] font-bold text-ink-muted bg-surface-card border border-line hover:border-brand/40 hover:text-brand transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtrar
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[12px] font-bold text-white bg-brand hover:bg-brand-hover transition-colors shadow-[0_2px_8px_rgba(91,80,232,0.35)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* ── Owner filter ── */}
      <div className="shrink-0">
        <OwnerFilter
          owners={MOCK_OWNERS}
          selected={selectedOwners}
          onToggle={toggleOwner}
          onClear={() => setSelectedOwners([])}
        />
      </div>

      {/* ── Board ── */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          initialDeals={MOCK_DEALS}
          visibleOwnerIds={selectedOwners.length > 0 ? selectedOwners : undefined}
          searchQuery={searchQuery}
          pendingNewDeal={newDeal}
          onNewDealConsumed={() => setNewDeal(null)}
        />
      </div>

      <NewLeadModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={(deal) => {
          setNewDeal(deal)
          setShowModal(false)
        }}
      />
    </div>
  )
}
