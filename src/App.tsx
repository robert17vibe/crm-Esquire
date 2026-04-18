import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { PipelinePage } from '@/pages/PipelinePage'
import { ClientsPage } from '@/pages/ClientsPage'
import { MeetingsPage } from '@/pages/MeetingsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DealDetailPage } from '@/pages/DealDetailPage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { useThemeStore } from '@/store/useThemeStore'

export default function App() {
  const isDark = useThemeStore((s) => s.isDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/landing"   element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pipeline"  element={<PipelinePage />} />
        <Route path="/clients"   element={<ClientsPage />} />
        <Route path="/meetings"  element={<MeetingsPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
        <Route path="/deal/:id"  element={<DealDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
