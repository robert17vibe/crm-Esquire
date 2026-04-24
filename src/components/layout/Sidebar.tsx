import { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Kanban, Users, Mic, CalendarDays, CheckSquare, Settings, LogOut, Users2, Shield, Bell } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useDealStore } from '@/store/useDealStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useNotificationStore, type AppNotification } from '@/store/useNotificationStore'

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue}, 42%, 36%)`
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/pipeline',  label: 'Jornada',    icon: Kanban          },
  { to: '/clients',   label: 'Clientes',   icon: Users           },
  { to: '/tarefas',   label: 'Tarefas',    icon: CheckSquare     },
  { to: '/meetings',  label: 'Registro',   icon: Mic             },
  { to: '/calendar',  label: 'Calendário', icon: CalendarDays    },
] as const

type NavTo = (typeof NAV_ITEMS)[number]['to'] | '/teams' | '/admin/users'

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  to,
  label,
  icon: Icon,
  activeItemBg,
  collapsed,
  badge,
}: {
  to: NavTo
  label: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  activeItemBg: string
  collapsed: boolean
  badge?: number
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="sidebar-nav-item"
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        padding: collapsed ? '0' : '0 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: '6px',
        gap: collapsed ? 0 : '10px',
        fontSize: '13px',
        fontWeight: 500,
        textDecoration: 'none',
        userSelect: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, color 0.2s ease',
        backgroundColor: isActive ? activeItemBg : hovered ? '#242424' : 'transparent',
        color: isActive || hovered ? '#f0ede5' : '#9a9a9a',
        position: 'relative',
      })}
    >
      {({ isActive }) => (
        <>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Icon style={{ width: '16px', height: '16px', color: isActive || hovered ? '#f0ede5' : '#9a9a9a', transition: 'color 0.2s ease' }} />
            {badge && badge > 0 && collapsed && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: '#dc2626', border: '1.5px solid #0a0a0a',
              }} />
            )}
          </div>
          {!collapsed && (
            <>
              <span className="sidebar-label" style={{ flex: 1 }}>{label}</span>
              {badge && badge > 0 && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px',
                  borderRadius: '8px', backgroundColor: '#dc2626', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', flexShrink: 0,
                }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

// ─── Settings item ────────────────────────────────────────────────────────────

function SettingsItem({ activeItemBg, collapsed }: { activeItemBg: string; collapsed: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <NavLink
      to="/settings"
      title={collapsed ? 'Configurações' : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="sidebar-nav-item"
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        height: '32px',
        padding: collapsed ? '0' : '0 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: '6px',
        gap: collapsed ? 0 : '8px',
        fontSize: '11px',
        fontWeight: 500,
        textDecoration: 'none',
        userSelect: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, color 0.2s ease',
        backgroundColor: isActive ? activeItemBg : hovered ? '#242424' : 'transparent',
        color: isActive || hovered ? '#f0ede5' : '#6b6b6b',
      })}
    >
      {({ isActive }) => (
        <>
          <Settings style={{ width: '14px', height: '14px', flexShrink: 0, color: isActive || hovered ? '#f0ede5' : '#6b6b6b', transition: 'color 0.2s ease' }} />
          {!collapsed && <span className="sidebar-label">Configurações</span>}
        </>
      )}
    </NavLink>
  )
}

// ─── Notification Panel ───────────────────────────────────────────────────────

const NOTIF_LABELS: Record<string, { label: string; color: string }> = {
  new_deal:         { label: 'Novo Lead',    color: '#2c5545' },
  overdue_activity: { label: 'Parado',       color: '#b45309' },
  sla_breach:       { label: 'SLA',          color: '#dc2626' },
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)  return 'agora'
  if (diff < 60) return `${diff}m`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}

function NotificationPanel({ onClose, collapsed }: { onClose: () => void; collapsed: boolean }) {
  const notifications = useNotificationStore((s) => s.notifications)
  const markRead      = useNotificationStore((s) => s.markRead)
  const markAllRead   = useNotificationStore((s) => s.markAllRead)
  const navigate      = useNavigate()
  const panelRef      = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.read)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    function onClick(e: MouseEvent) { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [onClose])

  function handleClick(n: AppNotification) {
    markRead(n.id)
    navigate(`/deal/${n.dealId}`)
    onClose()
  }

  const left = collapsed ? 56 : 200

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed', left: `${left + 8}px`, bottom: '60px', zIndex: 100,
        width: '300px', maxHeight: '420px',
        backgroundColor: '#161614', border: '1px solid #2a2a28',
        borderRadius: '10px', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #242422', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Bell style={{ width: '12px', height: '12px', color: '#9a9a9a' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#e8e4dc' }}>Notificações</span>
          {unread.length > 0 && (
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', backgroundColor: '#dc2626', borderRadius: '99px', padding: '1px 5px' }}>{unread.length}</span>
          )}
        </div>
        {unread.length > 0 && (
          <button type="button" onClick={markAllRead}
            style={{ fontSize: '10px', color: '#6b6560', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#e8e4dc')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6b6560')}
          >Marcar todas como lidas</button>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#4a4a4a', fontSize: '12px' }}>
            Nenhuma notificação
          </div>
        ) : (
          notifications.slice(0, 30).map((n, i) => {
            const cfg = NOTIF_LABELS[n.type] ?? { label: n.type, color: '#6b6560' }
            return (
              <button key={n.id} type="button" onClick={() => handleClick(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '9px', width: '100%', padding: '10px 14px',
                  backgroundColor: n.read ? 'transparent' : '#1a1a18',
                  borderBottom: i < notifications.length - 1 ? '1px solid #1e1e1c' : 'none',
                  cursor: 'pointer', textAlign: 'left', border: 'none',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#222220')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.read ? 'transparent' : '#1a1a18')}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: n.read ? 'transparent' : cfg.color, flexShrink: 0, marginTop: '5px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: cfg.color, backgroundColor: `${cfg.color}18`, borderRadius: '3px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
                    <span style={{ fontSize: '10px', color: '#4a4a4a', marginLeft: 'auto', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#e8e4dc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.dealName}</p>
                  {n.meta && <p style={{ fontSize: '10px', color: '#6b6560', marginTop: '1px' }}>{n.meta}</p>}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const isDark   = useThemeStore((s) => s.isDark)
  const location = useLocation()
  const signOut  = useAuthStore((s) => s.signOut)
  const profile  = useAuthStore((s) => s.profile)
  const deals    = useDealStore((s) => s.deals)
  const tasks    = useTaskStore((s) => s.tasks)

  const today = new Date().toISOString().slice(0, 10)
  const overdueCount = useMemo(() =>
    deals.filter((d) =>
      !['closed_won', 'closed_lost'].includes(d.stage_id) &&
      !!d.next_activity?.due_date &&
      d.next_activity.due_date < today
    ).length,
    [deals, today],
  )

  const overdueTaskCount = useMemo(() =>
    tasks.filter((t) => !t.completed_at && !!t.due_date && t.due_date < today).length,
    [tasks, today],
  )

  const notifications   = useNotificationStore((s) => s.notifications)
  const unreadCount     = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])
  const [showNotif, setShowNotif] = useState(false)

  const displayName     = profile?.full_name || 'Robert Ferreira'
  const displayRole     = profile?.role === 'admin' ? 'ADMIN' : profile?.role === 'user' ? 'USER' : 'ADMIN'
  const displayInitials = displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const displayColor    = profile?.avatar_color || hashColor(displayName)

  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 900)

  useEffect(() => {
    function handleResize() {
      setCollapsed(window.innerWidth < 900)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const asideRef     = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const wrapperRefs  = useRef<Partial<Record<NavTo, HTMLDivElement>>>({})
  const firstRender  = useRef(true)

  const sidebarBg    = isDark ? '#0a0a0a' : '#1a1a1a'
  const activeItemBg = isDark ? '#1a1a1a' : '#2a2a2a'

  const sidebarWidth = collapsed ? 56 : 200

  useLayoutEffect(() => {
    const aside     = asideRef.current
    const indicator = indicatorRef.current
    if (!aside || !indicator) return

    const active = NAV_ITEMS.find(({ to }) => location.pathname.startsWith(to))
    const onSettings = location.pathname.startsWith('/settings')

    if (!active || onSettings) {
      indicator.style.opacity = '0'
      return
    }

    const wrapper = wrapperRefs.current[active.to]
    if (!wrapper) {
      indicator.style.opacity = '0'
      return
    }

    const asideRect   = aside.getBoundingClientRect()
    const wrapperRect = wrapper.getBoundingClientRect()
    const topOffset   = wrapperRect.top - asideRect.top

    if (firstRender.current) {
      indicator.style.transition = 'none'
      indicator.style.top        = `${topOffset}px`
      indicator.style.height     = `${wrapperRect.height}px`
      indicator.style.opacity    = '1'
      void indicator.getBoundingClientRect()
      indicator.style.transition = 'top 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease'
      firstRender.current = false
    } else {
      indicator.style.top     = `${topOffset}px`
      indicator.style.height  = `${wrapperRect.height}px`
      indicator.style.opacity = '1'
    }
  }, [location.pathname, collapsed])

  return (
  <>
    <aside
      ref={asideRef}
      className="sidebar-responsive relative flex flex-col shrink-0"
      style={{
        width: `${sidebarWidth}px`,
        minWidth: `${sidebarWidth}px`,
        backgroundColor: sidebarBg,
        borderRadius: '0 20px 20px 0',
        margin: '12px 0',
        height: 'calc(100vh - 24px)',
        flexShrink: 0,
        zIndex: 10,
        overflow: 'hidden',
        boxShadow: isDark
          ? '4px 0 20px rgba(0,0,0,0.3)'
          : '4px 0 20px rgba(0,0,0,0.08)',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), background-color 0.3s ease',
      }}
    >
      {/* Sliding accent indicator — 2px left edge */}
      <div
        ref={indicatorRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: '0',
          top: 0,
          width: '2px',
          height: '36px',
          backgroundColor: '#f0ede5',
          borderRadius: '0 2px 2px 0',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 20,
          transition: 'top 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease',
        }}
      />

      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 0 16px' : '20px 12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        {collapsed ? (
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0ede5', letterSpacing: '-0.01em' }}>E</span>
        ) : (
          <span className="sidebar-logo-text" style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em', color: '#f0ede5' }}>
            Esquire CRM
          </span>
        )}
      </div>

      <div style={{ height: '1px', backgroundColor: '#242424', marginBottom: '12px', flexShrink: 0 }} />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col" style={{ padding: collapsed ? '0 8px' : '0 12px', gap: '4px' }}>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <div
            key={to}
            ref={(el) => { if (el) wrapperRefs.current[to] = el }}
          >
            <NavItem
              to={to}
              label={label}
              icon={icon}
              activeItemBg={activeItemBg}
              collapsed={collapsed}
              badge={to === '/pipeline' ? overdueCount : to === '/tarefas' ? overdueTaskCount : undefined}
            />
          </div>
        ))}

        {(profile?.is_admin || profile?.role === 'admin') && (
          <>
            <div style={{ height: '1px', backgroundColor: '#242424', margin: '8px 0 6px' }} />
            {!collapsed && (
              <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3a3a3a', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield style={{ width: '9px', height: '9px' }} />
                Admin
              </span>
            )}
            <div ref={(el) => { if (el) wrapperRefs.current['/admin/users' as NavTo] = el }}>
              <NavLink
                to="/admin/users"
                title={collapsed ? 'Utilizadores' : undefined}
                className="sidebar-nav-item"
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', height: '36px',
                  padding: collapsed ? '0' : '0 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '6px', gap: collapsed ? 0 : '10px',
                  fontSize: '13px', fontWeight: 500, textDecoration: 'none',
                  userSelect: 'none', cursor: 'pointer',
                  transition: 'background-color 0.2s ease, color 0.2s ease',
                  backgroundColor: isActive ? activeItemBg : 'transparent',
                  color: isActive ? '#f0ede5' : '#9a9a9a',
                })}
              >
                {({ isActive }) => (
                  <>
                    <Shield style={{ width: '16px', height: '16px', color: isActive ? '#f0ede5' : '#9a9a9a', transition: 'color 0.2s ease', flexShrink: 0 }} />
                    {!collapsed && <span className="sidebar-label" style={{ flex: 1 }}>Utilizadores</span>}
                  </>
                )}
              </NavLink>
            </div>
            <div ref={(el) => { if (el) wrapperRefs.current['/teams' as NavTo] = el }}>
              <NavLink
                to="/teams"
                title={collapsed ? 'Grupos' : undefined}
                className="sidebar-nav-item"
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', height: '36px',
                  padding: collapsed ? '0' : '0 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '6px', gap: collapsed ? 0 : '10px',
                  fontSize: '13px', fontWeight: 500, textDecoration: 'none',
                  userSelect: 'none', cursor: 'pointer',
                  transition: 'background-color 0.2s ease, color 0.2s ease',
                  backgroundColor: isActive ? activeItemBg : 'transparent',
                  color: isActive ? '#f0ede5' : '#9a9a9a',
                })}
              >
                {({ isActive }) => (
                  <>
                    <Users2 style={{ width: '16px', height: '16px', color: isActive ? '#f0ede5' : '#9a9a9a', transition: 'color 0.2s ease', flexShrink: 0 }} />
                    {!collapsed && <span className="sidebar-label" style={{ flex: 1 }}>Grupos</span>}
                  </>
                )}
              </NavLink>
            </div>
          </>
        )}
      </nav>

      <div style={{ height: '1px', backgroundColor: '#242424', flexShrink: 0 }} />

      {/* Footer */}
      <div style={{ padding: collapsed ? '10px 8px 14px' : '10px 12px 14px', flexShrink: 0 }}>

        {/* Bell */}
        <div style={{ marginBottom: '6px', position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotif((v) => !v)}
            title={collapsed ? 'Notificações' : undefined}
            style={{
              display: 'flex', alignItems: 'center', height: '32px',
              width: '100%', padding: collapsed ? '0' : '0 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '6px', gap: collapsed ? 0 : '8px',
              fontSize: '11px', fontWeight: 500,
              background: showNotif ? activeItemBg : 'none',
              border: 'none', cursor: 'pointer',
              color: showNotif ? '#f0ede5' : '#6b6b6b',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => { if (!showNotif) { e.currentTarget.style.backgroundColor = '#1a1a1a'; e.currentTarget.style.color = '#f0ede5' } }}
            onMouseLeave={(e) => { if (!showNotif) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b6b6b' } }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Bell style={{ width: '14px', height: '14px' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-5px',
                  fontSize: '7px', fontWeight: 800, color: '#fff',
                  backgroundColor: '#dc2626', borderRadius: '99px',
                  padding: '1px 3px', minWidth: '12px', textAlign: 'center', lineHeight: 1.4,
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
            {!collapsed && <span className="sidebar-label">Notificações</span>}
          </button>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <SettingsItem activeItemBg={activeItemBg} collapsed={collapsed} />
        </div>

        <div style={{ height: '1px', backgroundColor: '#2a2a2a', marginBottom: '10px' }} />

        {/* User */}
        {collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: displayColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f0ede5', fontSize: '11px', fontWeight: 600 }}>
              {displayInitials}
            </div>
          </div>
        ) : (
          <div className="sidebar-user-details" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: displayColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f0ede5', fontSize: '11px', fontWeight: 600 }}>
              {displayInitials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#f0ede5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {displayName}
              </p>
              <p style={{ fontSize: '10px', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.4, marginTop: '1px' }}>
                {displayRole}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="Sair"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, color: '#4a4a4a', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f0ede5')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#4a4a4a')}
            >
              <LogOut style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        )}

      </div>
    </aside>

    {showNotif && (
      <NotificationPanel onClose={() => setShowNotif(false)} collapsed={collapsed} />
    )}
  </>
  )
}
