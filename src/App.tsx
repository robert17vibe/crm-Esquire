import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { PipelinePage } from '@/pages/PipelinePage'
import { DealsPage } from '@/pages/DealsPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { CompaniesPage } from '@/pages/CompaniesPage'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { MeetingsPage } from '@/pages/MeetingsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { DealDetailPage } from '@/pages/DealDetailPage'
import { useThemeStore } from '@/store/useThemeStore'

export default function App() {
  const isDark = useThemeStore((s) => s.isDark)

  // Sync dark class on <html> whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/pipeline" replace />} />
        <Route path="/dashboard"  element={<DashboardPage />} />
        <Route path="/pipeline"   element={<PipelinePage />} />
        <Route path="/deals"      element={<DealsPage />} />
        <Route path="/contacts"   element={<ContactsPage />} />
        <Route path="/companies"  element={<CompaniesPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/meetings"   element={<MeetingsPage />} />
        <Route path="/reports"    element={<ReportsPage />} />
        <Route path="/deal/:id"   element={<DealDetailPage />} />
      </Route>
    </Routes>
  )
}
