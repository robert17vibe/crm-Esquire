import { useState, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Zap } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { NewLeadModal } from '@/components/pipeline/NewLeadModal'
import { EditDealModal } from '@/components/pipeline/EditDealModal'
import { PageEmptyState, PageLoadingState } from '@/components/ui/PageState'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import type { Deal } from '@/types/deal.types'

export function PipelinePage() {
  const deals         = useVisibleDeals()
  const deleteDeal    = useDealStore((s) => s.deleteDeal)
  const moveDeal      = useDealStore((s) => s.moveDeal)
  const setLossReason = useDealStore((s) => s.setLossReason)
  const dealsLoading  = useDealStore((s) => s.isLoading)
  const dealsInitialized = useDealStore((s) => s.initialized)
  const dealsError    = useDealStore((s) => s.error)
  const isDark        = useThemeStore((s) => s.isDark)
  const notifications = useNotificationStore((s) => s.notifications)

  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery    = searchParams.get('search') ?? ''
  const selectedOwners = useMemo(() => {
    const raw = searchParams.get('owners')
    return raw ? raw.split(',').filter(Boolean) : []
  }, [searchParams])

  const [showNewModal, setShowNewModal]     = useState(false)
  const [prioritizeNew, setPrioritizeNew]   = useState(false)
  const [editingDeal, setEditingDeal]       = useState<Deal | null>(null)
  const zapRef                              = useRef<HTMLButtonElement>(null)
  const [zapAnimating, setZapAnimating]     = useState(false)
  const [pendingNewDeal, setPendingNewDeal] = useState<Deal | null>(null)
  const [updatedDeal, setUpdatedDeal]       = useState<Deal | null>(null)

  const newDealIds = useMemo(
    () => new Set(notifications.filter((n) => !n.read).map((n) => n.dealId)),
    [notifications],
  )

  const handleZapClick = useCallback(() => {
    setPrioritizeNew((v) => !v)
    setZapAnimating(false)
    requestAnimationFrame(() => setZapAnimating(true))
  }, [])

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('owners')
      next.delete('search')
      return next
    }, { replace: true })
  }

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

    if (prioritizeNew) {
      const now = Date.now()
      result = [...result].sort((a, b) => {
        const aIsNew = (now - new Date(a.created_at).getTime()) <= 5 * 86_400_000 ? 1 : 0
        const bIsNew = (now - new Date(b.created_at).getTime()) <= 5 * 86_400_000 ? 1 : 0
        if (bIsNew !== aIsNew) return bIsNew - aIsNew
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    return result
  }, [deals, selectedOwners, searchQuery, prioritizeNew, newDealIds])

  const hasFilter = selectedOwners.length > 0 || !!searchQuery

  const headerBorder = isDark ? '#242424' : '#e8e6e1'
  const filterBg     = isDark ? '#111111' : '#f5f4f1'
  const filterBorder = isDark ? '#2a2a2a' : '#e0ddd8'
  const filterText   = isDark ? '#888888' : '#6b6560'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          gap: '12px',
        }}
      >
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#e8e4dc' : '#1a1814', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Jornada
          </p>
          <p style={{ fontSize: '10px', color: isDark ? '#6b6560' : '#8a857d', marginTop: '1px' }}>
            {deals.length} leads
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  ref={zapRef}
                  type="button"
                  onClick={handleZapClick}
                  title={prioritizeNew ? 'Desativar score de leads' : 'Ativar score de leads'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: prioritizeNew ? 'rgba(227,30,36,0.08)' : filterBg,
                    border: `1px solid ${prioritizeNew ? '#e31e24' : filterBorder}`,
                    flexShrink: 0,
                    transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  <Zap
                    className={zapAnimating ? 'zap-shock' : ''}
                    onAnimationEnd={() => setZapAnimating(false)}
                    style={{
                      width: '16px',
                      height: '16px',
                      color: prioritizeNew ? '#e31e24' : filterText,
                      fill: prioritizeNew ? '#e31e24' : 'none',
                      transition: 'color 0.2s ease, fill 0.2s ease',
                    }}
                  />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: isDark ? '#1a1814' : '#f0ede5',
                    backgroundColor: isDark ? '#e8e4dc' : '#1a1814',
                    borderRadius: '5px',
                    padding: '4px 8px',
                    zIndex: 50,
                    userSelect: 'none',
                  }}
                >
                  {prioritizeNew ? 'Desativar score' : 'Mostrar score dos leads'}
                  <Tooltip.Arrow style={{ fill: isDark ? '#e8e4dc' : '#1a1814' }} />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>

          <Tooltip.Provider delayDuration={400}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={() => setShowNewModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#e31e24',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '0 16px',
                    height: '34px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <Plus style={{ width: '14px', height: '14px', color: '#fff' }} />
                  Novo lead
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: isDark ? '#1a1814' : '#f0ede5',
                    backgroundColor: isDark ? '#e8e4dc' : '#1a1814',
                    borderRadius: '5px',
                    padding: '4px 8px',
                    zIndex: 50,
                    userSelect: 'none',
                  }}
                >
                  Novo lead (N)
                  <Tooltip.Arrow style={{ fill: isDark ? '#e8e4dc' : '#1a1814' }} />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>

      {dealsLoading || !dealsInitialized ? (
        <PageLoadingState
          title="Carregando pipeline"
          description="Estamos buscando os leads e organizando a jornada."
        />
      ) : displayDeals.length === 0 ? (
        hasFilter ? (
          <PageEmptyState
            icon={<Zap style={{ width: '28px', height: '28px', color: '#e31e24' }} />}
            title="Nenhum lead encontrado"
            description={dealsError || 'Tente ajustar a busca ou limpar os filtros para voltar a ver a jornada completa.'}
            action={
              <button
                type="button"
                onClick={clearFilters}
                style={{ fontSize: '12px', fontWeight: 600, color: '#e31e24', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}
              >
                Limpar filtros
              </button>
            }
          />
        ) : (
          <PageEmptyState
            icon={<Plus style={{ width: '28px', height: '28px', color: '#e31e24' }} />}
            title="Seu pipeline ainda está vazio"
            description={dealsError || 'Crie o primeiro lead para começar a acompanhar oportunidades por etapa.'}
            action={
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                style={{ fontSize: '12px', fontWeight: 600, color: '#e31e24', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}
              >
                Novo lead
              </button>
            }
          />
        )
      ) : (
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
            showScore={prioritizeNew}
            highlightNew={prioritizeNew}
            onAddDeal={() => setShowNewModal(true)}
          />
        </div>
      )}

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
