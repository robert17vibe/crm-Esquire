import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'

function RouteFallback() {
  return (
    <div style={{ minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '12px', color: '#8a857d', fontWeight: 600 }}>Carregando pagina...</p>
    </div>
  )
}

function AdminGuard() {
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)
  if (loading || !profile) return <RouteFallback />
  return (profile.is_admin)
    ? <Outlet />
    : <Navigate to="/dashboard" replace />
}

const DashboardPage    = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const PipelinePage     = lazy(() => import('@/pages/PipelinePage').then((m) => ({ default: m.PipelinePage })))
const ClientsPage      = lazy(() => import('@/pages/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const MeetingsPage     = lazy(() => import('@/pages/MeetingsPage').then((m) => ({ default: m.MeetingsPage })))
const CalendarPage     = lazy(() => import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const SettingsPage     = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const DealDetailPage   = lazy(() => import('@/pages/DealDetailPage').then((m) => ({ default: m.DealDetailPage })))
const TeamsPage        = lazy(() => import('@/pages/TeamsPage').then((m) => ({ default: m.TeamsPage })))
const TasksPage        = lazy(() => import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })))
const AdminUsersPage          = lazy(() => import('@/pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AdminNotificationsPage  = lazy(() => import('@/pages/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage })))
const AdminDistribuirLeadsPage = lazy(() => import('@/pages/AdminDistribuirLeadsPage').then((m) => ({ default: m.AdminDistribuirLeadsPage })))
const AdminCobrancaPage    = lazy(() => import('@/pages/AdminCobrancaPage').then((m) => ({ default: m.AdminCobrancaPage })))
const AdminDesempenhoPage  = lazy(() => import('@/pages/AdminDesempenhoPage').then((m) => ({ default: m.AdminDesempenhoPage })))
const LandingPage         = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const LoginPage        = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage  = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const EmailPage          = lazy(() => import('@/pages/EmailPage').then((m) => ({ default: m.EmailPage })))
const RelatoriosPage     = lazy(() => import('@/pages/RelatoriosPage').then((m) => ({ default: m.RelatoriosPage })))
const AtividadesPage     = lazy(() => import('@/pages/AtividadesPage').then((m) => ({ default: m.AtividadesPage })))
const PropostasPage          = lazy(() => import('@/pages/PropostasPage').then((m) => ({ default: m.PropostasPage })))
const ClientRenovacaoPage    = lazy(() => import('@/pages/ClientRenovacaoPage').then((m) => ({ default: m.ClientRenovacaoPage })))
const TvPerformancePage      = lazy(() => import('@/pages/TvPerformancePage').then((m) => ({ default: m.TvPerformancePage })))
const AppLayout          = lazy(() => import('@/components/layout/AppLayout').then((m) => ({ default: m.AppLayout })))

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
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/pipeline" replace /> : <LoginPage />}
      />
      <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
      <Route path="/reset-password"   element={<ResetPasswordPage />} />
      <Route path="/tv/performance"   element={session ? <TvPerformancePage /> : <Navigate to="/login" replace />} />
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
        <Route path="/email"      element={<EmailPage />} />
        <Route path="/tarefas"    element={<TasksPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/atividades" element={<AtividadesPage />} />
        <Route path="/propostas"  element={<PropostasPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
        <Route path="/deal/:id"     element={<DealDetailPage />} />
        <Route path="/renewal/:id"  element={<ClientRenovacaoPage />} />
        <Route path="/admin/integracoes" element={<Navigate to="/settings" replace />} />
        <Route element={<AdminGuard />}>
          <Route path="/teams"            element={<TeamsPage />} />
          <Route path="/admin/users"          element={<AdminUsersPage />} />
          <Route path="/admin/notifications"     element={<AdminNotificationsPage />} />
          <Route path="/admin/distribuir-leads" element={<AdminDistribuirLeadsPage />} />
          <Route path="/admin/cobranca"         element={<AdminCobrancaPage />} />
          <Route path="/admin/desempenho"       element={<AdminDesempenhoPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
    </Routes>
    </Suspense>
  )
}
