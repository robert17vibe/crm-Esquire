import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer } from '@/components/ui/Toast'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { NewLeadModal } from '@/components/pipeline/NewLeadModal'
import { useDealStore } from '@/store/useDealStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useWebhookStore } from '@/store/useWebhookStore'
import { useOperationalAlerts } from '@/hooks/useOperationalAlerts'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import { useNotificationStore } from '@/store/useNotificationStore'

export function AppLayout() {
  useOperationalAlerts()
  const impersonation = useImpersonationStore((s) => s.impersonation)
  const stopImpersonation = useImpersonationStore((s) => s.stop)
  const location     = useLocation()
  const [cmdOpen, setCmdOpen]         = useState(false)
  const [globalNewDeal, setGlobalNewDeal] = useState(false)
  const initDeals             = useDealStore((s) => s.initialize)
  const subscribeDeals        = useDealStore((s) => s.subscribeRealtime)
  const initMeetings          = useMeetingStore((s) => s.initialize)
  const subscribeMeetings     = useMeetingStore((s) => s.subscribeRealtime)
  const initOwners            = useOwnerStore((s) => s.initialize)
  const subscribeOwners       = useOwnerStore((s) => s.subscribeRealtime)
  const subscribeActivities   = useActivityStore((s) => s.subscribeRealtime)
  const initTeams             = useTeamStore((s) => s.initialize)
  const initWebhooks          = useWebhookStore((s) => s.initialize)

  useEffect(() => {
    initOwners()
    initDeals()
    initMeetings()
    initTeams()
    initWebhooks().catch(() => {})
    const unsubDeals       = subscribeDeals()
    const unsubMeetings    = subscribeMeetings()
    const unsubOwners      = subscribeOwners()
    const unsubActivities  = subscribeActivities()
    return () => {
      unsubDeals()
      unsubMeetings()
      unsubOwners()
      unsubActivities()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-mark notifications as read when user navigates to relevant pages
  const markAllRead   = useNotificationStore((s) => s.markAllRead)
  const clearByDeal   = useNotificationStore((s) => s.clearByDeal)
  useEffect(() => {
    const path = location.pathname
    const dealMatch = path.match(/^\/deal\/(.+)$/)
    if (dealMatch) {
      clearByDeal(dealMatch[1])
    } else if (['/tarefas', '/calendar', '/pipeline', '/clients', '/meetings', '/dashboard'].some((p) => path.startsWith(p))) {
      markAllRead()
    }
  }, [location.pathname, markAllRead, clearByDeal])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-screen bg-surface-base" style={{ overflow: 'visible', flexDirection: 'column' }}>
      {/* Impersonation banner */}
      {impersonation && (
        <div style={{
          height: '36px', minHeight: '36px', flexShrink: 0,
          backgroundColor: '#92400e', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '12px', zIndex: 50,
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#fef3c7' }}>
            👁 Visualizando como <strong>{impersonation.ownerName}</strong>
          </span>
          <button
            type="button"
            onClick={stopImpersonation}
            style={{
              fontSize: '11px', fontWeight: 700, color: '#92400e',
              backgroundColor: '#fef3c7', border: 'none', borderRadius: '4px',
              padding: '2px 10px', cursor: 'pointer',
            }}
          >Sair</button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenSearch={() => setCmdOpen(true)} />
        <main className="flex-1 overflow-hidden p-5">
          <ErrorBoundary key={location.pathname}>
            <div className="page-fade h-full">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>

      <ToastContainer />
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onCreateDeal={() => { setCmdOpen(false); setGlobalNewDeal(true) }}
        onCreateTask={() => setCmdOpen(false)}
      />
      <NewLeadModal
        open={globalNewDeal}
        onClose={() => setGlobalNewDeal(false)}
        onCreated={() => setGlobalNewDeal(false)}
      />
      </div>
    </div>
  )
}
