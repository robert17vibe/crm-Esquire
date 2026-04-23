import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer } from '@/components/ui/Toast'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { useDealStore } from '@/store/useDealStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useOperationalAlerts } from '@/hooks/useOperationalAlerts'

export function AppLayout() {
  useOperationalAlerts()
  const location     = useLocation()
  const [cmdOpen, setCmdOpen] = useState(false)
  const initDeals             = useDealStore((s) => s.initialize)
  const subscribeDeals        = useDealStore((s) => s.subscribeRealtime)
  const initMeetings          = useMeetingStore((s) => s.initialize)
  const subscribeMeetings     = useMeetingStore((s) => s.subscribeRealtime)
  const initOwners            = useOwnerStore((s) => s.initialize)
  const subscribeOwners       = useOwnerStore((s) => s.subscribeRealtime)
  const subscribeActivities   = useActivityStore((s) => s.subscribeRealtime)
  const initTeams             = useTeamStore((s) => s.initialize)

  useEffect(() => {
    initOwners()
    initDeals()
    initMeetings()
    initTeams()
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
    <div className="flex h-screen bg-surface-base" style={{ overflow: 'visible' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden p-5">
          <ErrorBoundary key={location.pathname}>
            <div className="page-fade h-full">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>

      <ToastContainer />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
