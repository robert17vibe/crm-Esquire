import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function AppLayout() {
  const location = useLocation()

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
    </div>
  )
}
