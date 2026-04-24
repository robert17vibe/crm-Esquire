import { useState, useEffect, useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Kanban, Users, Mic, CalendarDays, CheckSquare, Settings, LogOut, Users2, Shield, Bell, Zap, Mail, Megaphone } from 'lucide-react'
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
  { to: '/meetings',  label: 'Registo',    icon: Mic             },
  { to: '/calendar',  label: 'Calendário', icon: CalendarDays    },
  { to: '/email',     label: 'Email',      icon: Mail            },
] as const

type NavTo = (typeof NAV_ITEMS)[number]['to'] | '/teams' | '/admin/users' | '/admin/notifications'

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  to,
  label,
  icon: Icon,
  collapsed,
  badge,
}: {
  to: NavTo
  label: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  collapsed: boolean
  badge?: number
}) {
  const hasBadge = (badge ?? 0) > 0

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        height: '38px',
        padding: collapsed ? '0' : '0 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 'var(--radius-sm)',
        gap: collapsed ? 0 : '10px',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 500,
        textDecoration: 'none',
        userSelect: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, color 0.15s ease',
        backgroundColor: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
        color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)',
        position: 'relative',
      })}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        if (!el.classList.contains('active')) el.style.backgroundColor = 'rgba(255,255,255,0.06)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        if (!el.classList.contains('active')) el.style.backgroundColor = 'transparent'
      }}
    >
      {({ isActive }) => (
        <>
          {/* Active left stripe */}
          {isActive && !collapsed && (
            <span style={{
              position: 'absolute', left: '-10px', top: '50%', transform: 'translateY(-50%)',
              width: '3px', height: '20px', borderRadius: '0 3px 3px 0',
              backgroundColor: 'var(--brand)',
            }} />
          )}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Icon style={{ width: '16px', height: '16px', color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)', transition: 'color 0.15s ease' }} />
            {hasBadge && collapsed && (
              <span style={{
                position: 'absolute', top: '-3px', right: '-3px',
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: '#dc2626', border: '1.5px solid var(--surface-sidebar)',
              }} />
            )}
          </div>
          {!collapsed && (
            <>
              <span style={{ flex: 1 }}>{label}</span>
              {hasBadge && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px',
                  borderRadius: '999px', backgroundColor: '#dc2626', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', flexShrink: 0,
                }}>
                  {(badge ?? 0) > 9 ? '9+' : badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

// ─── Notification Panel ───────────────────────────────────────────────────────

const NOTIF_LABELS: Record<string, { label: string; color: string }> = {
  new_deal:         { label: 'Novo Lead',    color: 'var(--brand)' },
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

function NotificationPanel({ onClose, bottom }: { onClose: () => void; bottom: number }) {
  const notifications = useNotificationStore((s) => s.notifications)
  const markRead      = useNotificationStore((s) => s.markRead)
  const markAllRead   = useNotificationStore((s) => s.markAllRead)
  const navigate      = useNavigate()

  const unread = notifications.filter((n) => !n.read)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    function onClick(e: MouseEvent) {
      const panel = document.getElementById('notif-panel')
      if (panel && !panel.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [onClose])

  function handleClick(n: AppNotification) {
    markRead(n.id)
    navigate(`/deal/${n.dealId}`)
    onClose()
  }

  return (
    <div
      id="notif-panel"
      style={{
        position: 'fixed', left: '8px', bottom: `${bottom + 8}px`, zIndex: 200,
        width: '296px', maxHeight: '400px',
        backgroundColor: 'var(--surface-card)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Bell style={{ width: '12px', height: '12px', color: 'var(--ink-muted)' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-base)' }}>Notificações</span>
          {unread.length > 0 && (
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', backgroundColor: '#dc2626', borderRadius: '99px', padding: '1px 5px' }}>{unread.length}</span>
          )}
        </div>
        {unread.length > 0 && (
          <button type="button" onClick={markAllRead}
            style={{ fontSize: '10px', color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink-base)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-muted)')}>
            Marcar todas
          </button>
        )}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '12px' }}>Nenhuma notificação</div>
        ) : (
          notifications.slice(0, 30).map((n, i) => {
            const cfg = NOTIF_LABELS[n.type] ?? { label: n.type, color: 'var(--ink-muted)' }
            return (
              <button key={n.id} type="button" onClick={() => handleClick(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '9px', width: '100%', padding: '10px 14px',
                  backgroundColor: n.read ? 'transparent' : 'var(--surface-raised)',
                  borderBottom: i < notifications.length - 1 ? '1px solid var(--line)' : 'none',
                  cursor: 'pointer', textAlign: 'left', border: 'none',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-col)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'var(--surface-raised)')}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: n.read ? 'transparent' : cfg.color, flexShrink: 0, marginTop: '5px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: cfg.color, backgroundColor: `color-mix(in srgb, ${cfg.color} 12%, transparent)`, borderRadius: '3px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
                    <span style={{ fontSize: '10px', color: 'var(--ink-faint)', marginLeft: 'auto', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.dealName}</p>
                  {n.meta && <p style={{ fontSize: '10px', color: 'var(--ink-muted)', marginTop: '1px' }}>{n.meta}</p>}
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

  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount   = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])
  const [showNotif, setShowNotif] = useState(false)

  const displayName     = profile?.full_name || 'Robert Ferreira'
  const displayRole     = profile?.role === 'admin' ? 'ADMIN' : 'USER'
  const displayInitials = displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const displayColor    = profile?.avatar_color || hashColor(displayName)

  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 900)

  useEffect(() => {
    function handleResize() { setCollapsed(window.innerWidth < 900) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarW = collapsed ? 60 : 220

  // Footer ref for notification panel position
  const [footerBottom, setFooterBottom] = useState(80)
  const footerRef = (el: HTMLDivElement | null) => {
    if (el) {
      const r = el.getBoundingClientRect()
      setFooterBottom(window.innerHeight - r.top)
    }
  }

  const isAdmin = profile?.is_admin || profile?.role === 'admin'

  return (
    <>
      <aside
        style={{
          width: `${sidebarW}px`,
          minWidth: `${sidebarW}px`,
          backgroundColor: 'var(--surface-sidebar)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '0 20px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          flexShrink: 0,
          zIndex: 10,
          overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          position: 'relative',
        }}
      >

        {/* ── Logo ── */}
        <div style={{
          height: '56px', minHeight: '56px', flexShrink: 0,
          display: 'flex', alignItems: 'center',
          padding: collapsed ? '0' : '0 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--brand)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap style={{ width: '14px', height: '14px', color: '#fff' }} />
          </div>
          {!collapsed && (
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0ede5', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              Esquire CRM
            </span>
          )}
        </div>


        {/* ── Navigation ── */}
        <nav style={{ flex: 1, padding: collapsed ? '12px 10px' : '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', overflowX: 'hidden' }}>

          {/* Main items */}
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavItem
              key={to}
              to={to}
              label={label}
              icon={icon}
              collapsed={collapsed}
              badge={to === '/pipeline' ? overdueCount : to === '/tarefas' ? overdueTaskCount : undefined}
            />
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div style={{ margin: '10px 0 6px', height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
              {!collapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 10px', marginBottom: '4px' }}>
                  <Shield style={{ width: '9px', height: '9px', color: 'rgba(240,237,229,0.2)' }} />
                  <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,237,229,0.2)' }}>
                    Admin
                  </span>
                </div>
              )}
              <NavLink
                to="/admin/notifications"
                title={collapsed ? 'Notificações Equipa' : undefined}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', height: '38px',
                  padding: collapsed ? '0' : '0 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-sm)', gap: collapsed ? 0 : '10px',
                  fontSize: '13px', fontWeight: isActive ? 600 : 500, textDecoration: 'none',
                  color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  position: 'relative',
                })}
                onMouseEnter={(e) => { const el = e.currentTarget; if (!location.pathname.startsWith('/admin/notif')) el.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={(e) => { const el = e.currentTarget; if (!location.pathname.startsWith('/admin/notif')) el.style.backgroundColor = 'transparent' }}
              >
                {({ isActive }) => (
                  <>
                    {isActive && !collapsed && <span style={{ position: 'absolute', left: '-10px', top: '50%', transform: 'translateY(-50%)', width: '3px', height: '20px', borderRadius: '0 3px 3px 0', backgroundColor: 'var(--brand)' }} />}
                    <Megaphone style={{ width: '16px', height: '16px', color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)', flexShrink: 0 }} />
                    {!collapsed && <span>Comunicados</span>}
                  </>
                )}
              </NavLink>
              <NavLink
                to="/admin/users"
                title={collapsed ? 'Utilizadores' : undefined}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', height: '38px',
                  padding: collapsed ? '0' : '0 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-sm)', gap: collapsed ? 0 : '10px',
                  fontSize: '13px', fontWeight: isActive ? 600 : 500, textDecoration: 'none',
                  color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  position: 'relative',
                })}
                onMouseEnter={(e) => { const el = e.currentTarget; if (!location.pathname.startsWith('/admin')) el.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={(e) => { const el = e.currentTarget; if (!location.pathname.startsWith('/admin')) el.style.backgroundColor = 'transparent' }}
              >
                {({ isActive }) => (
                  <>
                    {isActive && !collapsed && <span style={{ position: 'absolute', left: '-10px', top: '50%', transform: 'translateY(-50%)', width: '3px', height: '20px', borderRadius: '0 3px 3px 0', backgroundColor: 'var(--brand)' }} />}
                    <Shield style={{ width: '16px', height: '16px', color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)', flexShrink: 0 }} />
                    {!collapsed && <span>Utilizadores</span>}
                  </>
                )}
              </NavLink>
              <NavLink
                to="/teams"
                title={collapsed ? 'Grupos' : undefined}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', height: '38px',
                  padding: collapsed ? '0' : '0 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-sm)', gap: collapsed ? 0 : '10px',
                  fontSize: '13px', fontWeight: isActive ? 600 : 500, textDecoration: 'none',
                  color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  position: 'relative',
                })}
                onMouseEnter={(e) => { const el = e.currentTarget; if (!location.pathname.startsWith('/teams')) el.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={(e) => { const el = e.currentTarget; if (!location.pathname.startsWith('/teams')) el.style.backgroundColor = 'transparent' }}
              >
                {({ isActive }) => (
                  <>
                    {isActive && !collapsed && <span style={{ position: 'absolute', left: '-10px', top: '50%', transform: 'translateY(-50%)', width: '3px', height: '20px', borderRadius: '0 3px 3px 0', backgroundColor: 'var(--brand)' }} />}
                    <Users2 style={{ width: '16px', height: '16px', color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)', flexShrink: 0 }} />
                    {!collapsed && <span>Grupos</span>}
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* ── Footer ── */}
        <div ref={footerRef} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: collapsed ? '12px 10px' : '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setShowNotif((v) => !v)}
            title={collapsed ? 'Notificações' : undefined}
            style={{
              display: 'flex', alignItems: 'center', height: '36px',
              width: '100%', padding: collapsed ? '0' : '0 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-sm)', gap: collapsed ? 0 : '10px',
              fontSize: '13px', fontWeight: 500,
              background: showNotif ? 'rgba(255,255,255,0.10)' : 'none',
              border: 'none', cursor: 'pointer',
              color: showNotif ? '#f0ede5' : 'rgba(240,237,229,0.5)',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => { if (!showNotif) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#f0ede5' } }}
            onMouseLeave={(e) => { if (!showNotif) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(240,237,229,0.5)' } }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Bell style={{ width: '16px', height: '16px' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-3px', right: '-3px',
                  fontSize: '7px', fontWeight: 800, color: '#fff',
                  backgroundColor: '#dc2626', borderRadius: '99px',
                  padding: '1px 3px', minWidth: '11px', textAlign: 'center', lineHeight: 1.4,
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
            {!collapsed && <span style={{ flex: 1 }}>Notificações</span>}
          </button>

          {/* Settings */}
          <NavLink
            to="/settings"
            title={collapsed ? 'Configurações' : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', height: '36px',
              padding: collapsed ? '0' : '0 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-sm)', gap: collapsed ? 0 : '10px',
              fontSize: '13px', fontWeight: 500, textDecoration: 'none',
              color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)',
              backgroundColor: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            })}
            onMouseEnter={(e) => { const el = e.currentTarget; if (!location.pathname.startsWith('/settings')) el.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={(e) => { const el = e.currentTarget; if (!location.pathname.startsWith('/settings')) el.style.backgroundColor = 'transparent' }}
          >
            {({ isActive }) => (
              <>
                <Settings style={{ width: '16px', height: '16px', color: isActive ? '#f0ede5' : 'rgba(240,237,229,0.5)', flexShrink: 0 }} />
                {!collapsed && <span style={{ flex: 1 }}>Configurações</span>}
              </>
            )}
          </NavLink>

          {/* User row */}
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '0' : '0 2px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: 'var(--radius-full)', backgroundColor: displayColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: '#fff', fontSize: '11px', fontWeight: 700,
            }}>
              {displayInitials}
            </div>
            {!collapsed && (
              <>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#f0ede5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{displayName}</p>
                  <p style={{ fontSize: '9px', color: 'rgba(240,237,229,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{displayRole}</p>
                </div>
                <button type="button" onClick={() => signOut()} title="Sair"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, color: 'rgba(240,237,229,0.3)', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f0ede5')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(240,237,229,0.3)')}>
                  <LogOut style={{ width: '14px', height: '14px' }} />
                </button>
              </>
            )}
          </div>
        </div>

      </aside>

      {/* Collapse toggle — outside aside so overflow:hidden doesn't clip it */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        style={{
          position: 'fixed',
          left: `${sidebarW - 11}px`,
          top: '68px',
          width: '22px', height: '22px', borderRadius: '50%',
          backgroundColor: 'var(--surface-card)', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 20,
          color: 'var(--ink-muted)',
          fontSize: '11px', fontWeight: 700,
          transition: 'background-color 0.15s ease, left 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-raised)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-card)')}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {showNotif && (
        <NotificationPanel onClose={() => setShowNotif(false)} bottom={footerBottom} />
      )}
    </>
  )
}
