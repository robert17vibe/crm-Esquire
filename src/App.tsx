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
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { useThemeStore } from '@/store/useThemeStore'
import { useDealStore } from '@/store/useDealStore'
import { useMeetingStore } from '@/store/useMeetingStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOwnerStore } from '@/store/useOwnerStore'

export default function App() {
  const isDark       = useThemeStore((s) => s.isDark)
  const init         = useDealStore((s) => s.init)
  const initMeetings = useMeetingStore((s) => s.init)
  const initOwners   = useOwnerStore((s) => s.init)
  const { session, init: initAuth } = useAuthStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    const unsub = initAuth()
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    initOwners()
    init()
    initMeetings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/pipeline" replace /> : <LoginPage />}
      />
      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />
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
