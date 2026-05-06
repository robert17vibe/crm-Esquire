import { useState, useEffect, lazy, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer } from '@/components/ui/Toast'
import { useDealStore } from '@/store/useDealStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useWebhookStore } from '@/store/useWebhookStore'
import { useOperationalAlerts } from '@/hooks/useOperationalAlerts'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useTeamNotificationStore } from '@/store/useTeamNotificationStore'

const CommandPalette = lazy(() => import('@/components/ui/CommandPalette').then((m) => ({ default: m.CommandPalette })))
const NewLeadModal = lazy(() => import('@/components/pipeline/NewLeadModal').then((m) => ({ default: m.NewLeadModal })))

export function AppLayout() {
  useOperationalAlerts()
  const impersonatedName  = useImpersonationStore((s) => s.impersonatedName)
  const stopImpersonation = useImpersonationStore((s) => s.stopImpersonation)
  const location     = useLocation()
  const [cmdOpen, setCmdOpen]         = useState(false)
  const [globalNewDeal, setGlobalNewDeal] = useState(false)
  const initDeals             = useDealStore((s) => s.initialize)
  const subscribeDeals        = useDealStore((s) => s.subscribeRealtime)
  const initMeetings          = useMeetingStore((s) => s.initialize)
  const subscribeMeetings     = useMeetingStore((s) => s.subscribeRealtime)
  const initOwners            = useOwnerStore((s) => s.initialize)
  const subscribeOwners       = useOwnerStore((s) => s.subscribeRealtime)
  const initTeams             = useTeamStore((s) => s.initialize)
  const initWebhooks          = useWebhookStore((s) => s.initialize)
  const subscribeTasksRealtime  = useTaskStore((s) => s.subscribeRealtime)
  const fetchTeamNotifs         = useTeamNotificationStore((s) => s.fetch)
  const subscribeTeamNotifs     = useTeamNotificationStore((s) => s.subscribeRealtime)

  useEffect(() => {
    initOwners()
    initDeals()
    void fetchTeamNotifs()
    const unsubDeals       = subscribeDeals()
    const unsubOwners      = subscribeOwners()
    const unsubTasks       = subscribeTasksRealtime()
    const unsubTeamNotifs  = subscribeTeamNotifs()
    return () => {
      unsubDeals()
      unsubOwners()
      unsubTasks()
      unsubTeamNotifs()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const path = location.pathname
    const needsMeetings = ['/meetings', '/calendar'].some((prefix) => path.startsWith(prefix)) || path.startsWith('/deal/')
    const needsTeams = ['/teams', '/admin/users', '/admin/notifications'].some((prefix) => path.startsWith(prefix)) || path.startsWith('/deal/')
    const needsWebhooks = path.startsWith('/pipeline') || path.startsWith('/deal/') || globalNewDeal

    let unsubMeetings = () => {}

    if (needsMeetings) {
      void initMeetings()
      unsubMeetings = subscribeMeetings()
    }

    if (needsTeams) {
      void initTeams()
    }

    if (needsWebhooks) {
      initWebhooks().catch(() => {})
    }

    return () => {
      unsubMeetings()
    }
  }, [
    globalNewDeal,
    initMeetings,
    initTeams,
    initWebhooks,
    location.pathname,
    subscribeMeetings,
  ])

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
      {impersonatedName && (
        <div style={{
          height: '36px', minHeight: '36px', flexShrink: 0,
          backgroundColor: '#a88030', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '12px', zIndex: 50,
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#fef3c7' }}>
            👁 A ver como: <strong>{impersonatedName}</strong>
          </span>
          <button
            type="button"
            onClick={stopImpersonation}
            style={{
              fontSize: '11px', fontWeight: 700, color: '#a88030',
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
        <main className="flex-1 overflow-y-auto p-5">
          <ErrorBoundary key={location.pathname}>
            <div className="page-fade h-full">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>

      <ToastContainer />
      <Suspense fallback={null}>
        {(cmdOpen || globalNewDeal) && (
          <>
            <CommandPalette
              open={cmdOpen}
              onClose={() => setCmdOpen(false)}
              onCreateDeal={() => { setCmdOpen(false); setGlobalNewDeal(true) }}
              onCreateTask={() => setCmdOpen(false)}
            />
            <NewLeadModal
              open={globalNewDeal}
              onClose={() => setGlobalNewDeal(false)}
              onCreated={(_deal) => setGlobalNewDeal(false)}
            />
          </>
        )}
      </Suspense>
      </div>
    </div>
  )
}
