import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'

const DashboardPage    = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const PipelinePage     = lazy(() => import('@/pages/PipelinePage').then((m) => ({ default: m.PipelinePage })))
const ClientsPage      = lazy(() => import('@/pages/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const MeetingsPage     = lazy(() => import('@/pages/MeetingsPage').then((m) => ({ default: m.MeetingsPage })))
const CalendarPage     = lazy(() => import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const SettingsPage     = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const DealDetailPage   = lazy(() => import('@/pages/DealDetailPage').then((m) => ({ default: m.DealDetailPage })))
const LandingPage      = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const LoginPage        = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage  = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))

export default function App() {
  const isDark       = useThemeStore((s) => s.isDark)
  const initialize   = useAuthStore((s) => s.initialize)
  const session      = useAuthStore((s) => s.session)
  const loading      = useAuthStore((s) => s.loading)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    const unsub = initialize()
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? '#0d0c0a' : '#f5f4f0',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            border: `2px solid ${isDark ? '#3a3834' : '#c4bfb8'}`,
            borderTopColor: '#2c5545',
            animation: 'spin 0.7s linear infinite',
          }} />
          <p style={{ fontSize: '12px', color: isDark ? '#4a4844' : '#c4bfb8', fontWeight: 500 }}>
            Carregando...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <Suspense fallback={null}>
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/pipeline" replace /> : <LoginPage />}
      />
      <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
      <Route path="/reset-password"   element={<ResetPasswordPage />} />
      <Route
        element={session ? <AppLayout /> : <Navigate to="/login" replace />}
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/landing"   element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pipeline"  element={<PipelinePage />} />
        <Route path="/clients"   element={<ClientsPage />} />
        <Route path="/meetings"  element={<MeetingsPage />} />
        <Route path="/calendar"  element={<CalendarPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
        <Route path="/deal/:id"  element={<DealDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
    </Routes>
    </Suspense>
  )
}
