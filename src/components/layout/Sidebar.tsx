import { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Kanban, Users, Mic, CalendarDays, Settings, LogOut } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useDealStore } from '@/store/useDealStore'

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue}, 42%, 36%)`
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline',  label: 'Jornada',   icon: Kanban          },
  { to: '/clients',   label: 'Clientes',  icon: Users           },
  { to: '/meetings',  label: 'Registro',  icon: Mic             },
  { to: '/calendar',  label: 'Calendário', icon: CalendarDays   },
] as const

type NavTo = (typeof NAV_ITEMS)[number]['to']

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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const isDark   = useThemeStore((s) => s.isDark)
  const location = useLocation()
  const signOut  = useAuthStore((s) => s.signOut)
  const profile  = useAuthStore((s) => s.profile)
  const deals    = useDealStore((s) => s.deals)

  const today = new Date().toISOString().slice(0, 10)
  const overdueCount = useMemo(() =>
    deals.filter((d) =>
      !['closed_won', 'closed_lost'].includes(d.stage_id) &&
      !!d.next_activity?.due_date &&
      d.next_activity.due_date < today
    ).length,
    [deals, today],
  )

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
              badge={to === '/pipeline' ? overdueCount : undefined}
            />
          </div>
        ))}
      </nav>

      <div style={{ height: '1px', backgroundColor: '#242424', flexShrink: 0 }} />

      {/* Footer */}
      <div style={{ padding: collapsed ? '10px 8px 14px' : '10px 12px 14px', flexShrink: 0 }}>

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
  )
}
