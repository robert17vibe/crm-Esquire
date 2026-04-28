import { useState, useEffect, useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Kanban, Users, Mic, CalendarDays, CheckSquare, Settings, LogOut, Users2, Shield, Mail, Megaphone, GitFork } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import esquireLogo from '@/assets/esquire_logo.png'
import { useAuthStore } from '@/store/useAuthStore'
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

type NavTo = (typeof NAV_ITEMS)[number]['to'] | '/teams' | '/admin/users' | '/admin/notifications' | '/admin/distribuir-leads'

// ─── Logo mark SVG ────────────────────────────────────────────────────────────
function EsquireLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="3" fill="#e31e24"/>
      <text x="14" y="20" textAnchor="middle" fill="white"
        style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '13px', fontWeight: 700, fontStyle: 'italic' }}>
        E
      </text>
    </svg>
  )
}

// ─── Nav item — estilo editorial ──────────────────────────────────────────────
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
    <>
      <NavLink
        to={to}
        title={collapsed ? label : undefined}
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          height: collapsed ? '40px' : '36px',
          padding: collapsed ? '0' : '0 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : '10px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.10em',
          textDecoration: 'none',
          userSelect: 'none',
          cursor: 'pointer',
          textTransform: 'uppercase',
          transition: 'color 0.12s ease, background-color 0.12s ease',
          backgroundColor: isActive ? 'rgba(227,30,36,0.12)' : 'transparent',
          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
          position: 'relative',
          borderLeft: isActive ? '2px solid #e31e24' : '2px solid transparent',
        })}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLAnchorElement
          if (!el.getAttribute('aria-current')) {
            el.style.color = 'rgba(255,255,255,0.80)'
            el.style.backgroundColor = 'rgba(255,255,255,0.05)'
          }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLAnchorElement
          if (!el.getAttribute('aria-current')) {
            el.style.color = 'rgba(255,255,255,0.45)'
            el.style.backgroundColor = 'transparent'
          }
        }}
      >
        {({ isActive }) => (
          <>
            <div style={{ position: 'relative', flexShrink: 0, transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'scale(1.22) translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'scale(1) translateY(0)'
              }}
            >
              <Icon style={{ width: '14px', height: '14px', color: isActive ? '#e31e24' : 'rgba(255,255,255,0.35)', transition: 'color 0.12s ease, filter 0.15s ease' }} />
              {hasBadge && collapsed && (
                <span style={{
                  position: 'absolute', top: '-3px', right: '-3px',
                  width: '7px', height: '7px', borderRadius: '50%',
                  backgroundColor: '#e31e24', border: '1.5px solid #0d0d0b',
                }} />
              )}
            </div>
            {!collapsed && (
              <>
                <span style={{ flex: 1 }}>{label}</span>
                {hasBadge && (
                  <span style={{
                    fontSize: '8px', fontWeight: 800, minWidth: '15px', height: '15px',
                    borderRadius: '3px', backgroundColor: '#e31e24', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', flexShrink: 0, letterSpacing: '0',
                  }}>
                    {(badge ?? 0) > 9 ? '9+' : badge}
                  </span>
                )}
              </>
            )}
          </>
        )}
      </NavLink>
      {/* thin divider between items */}
      {!collapsed && (
        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: '16px', marginRight: '16px' }} />
      )}
    </>
  )
}

// ─── Notification Panel ───────────────────────────────────────────────────────

const NOTIF_LABELS: Record<string, { label: string; color: string }> = {
  new_deal:         { label: 'Novo Lead',    color: '#e31e24' },
  overdue_activity: { label: 'Parado',       color: '#b45309' },
  sla_breach:       { label: 'SLA',          color: '#dc2626' },
  meeting_invite:   { label: 'Reunião',      color: '#7c3aed' },
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)  return 'agora'
  if (diff < 60) return `${diff}m`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}

// @ts-expect-error reserved for future use
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
        width: '300px', maxHeight: '420px',
        backgroundColor: '#111110', border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '6px', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ffffff' }}>
            Notificações
          </span>
          {unread.length > 0 && (
            <span style={{ fontSize: '8px', fontWeight: 800, color: '#fff', backgroundColor: '#e31e24', borderRadius: '3px', padding: '1px 5px' }}>
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button type="button" onClick={markAllRead}
            style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.70)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
            Marcar todas
          </button>
        )}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>Nenhuma notificação</div>
        ) : (
          notifications.slice(0, 30).map((n, i) => {
            const cfg = NOTIF_LABELS[n.type] ?? { label: n.type, color: 'rgba(255,255,255,0.4)' }
            return (
              <button key={n.id} type="button" onClick={() => handleClick(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', padding: '11px 16px',
                  backgroundColor: n.read ? 'transparent' : 'rgba(227,30,36,0.06)',
                  borderBottom: i < notifications.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer', textAlign: 'left', border: 'none',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'rgba(227,30,36,0.06)')}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: n.read ? 'transparent' : cfg.color, flexShrink: 0, marginTop: '5px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: cfg.color, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{cfg.label}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.80)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.dealName}</p>
                  {n.meta && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{n.meta}</p>}
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
  const tasks    = useTaskStore((s) => s.tasks)

  const today = new Date().toISOString().slice(0, 10)

  const overdueTaskCount = useMemo(() =>
    tasks.filter((t) => !t.completed_at && !!t.due_date && t.due_date < today).length,
    [tasks, today],
  )

  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount   = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const [unassignedCount, setUnassignedCount] = useState(0)
  useEffect(() => {
    if (!profile?.is_admin) return
    supabase.from('deals').select('id', { count: 'exact', head: true }).is('owner_id', null).is('deleted_at', null)
      .then(({ count }) => setUnassignedCount(count ?? 0))
  }, [profile?.is_admin])

  const displayName     = profile?.full_name || 'Robert Ferreira'
  const displayRole     = profile?.is_admin ? 'ADMIN' : 'USER'
  const displayInitials = displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const displayColor    = profile?.avatar_color || hashColor(displayName)

  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 900)

  useEffect(() => {
    function handleResize() { setCollapsed(window.innerWidth < 900) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarW = collapsed ? 56 : 228


  const isAdmin = profile?.is_admin ?? false

  return (
    <>
      <aside
        style={{
          width: `${sidebarW}px`,
          minWidth: `${sidebarW}px`,
          backgroundColor: '#0d0d0b',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          flexShrink: 0,
          zIndex: 10,
          overflow: 'hidden',
          transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
          position: 'relative',
        }}
      >

        {/* ── Logo ── */}
        <div style={{
          height: '56px', minHeight: '56px', flexShrink: 0,
          display: 'flex', alignItems: 'center',
          padding: collapsed ? '0' : '0 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {collapsed ? (
            <EsquireLogo size={26} />
          ) : (
            <img src={esquireLogo} alt="Esquire" style={{ height: '22px', objectFit: 'contain' }} />
          )}
        </div>

        {/* ── Red rule ── */}
        {!collapsed && (
          <div style={{ height: '2px', backgroundColor: '#e31e24', flexShrink: 0 }} />
        )}

        {/* ── Navigation ── */}
        <nav style={{
          flex: 1,
          padding: collapsed ? '16px 0' : '8px 0',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavItem
              key={to}
              to={to}
              label={label}
              icon={icon}
              collapsed={collapsed}
              badge={to === '/pipeline' ? unreadCount : to === '/tarefas' ? overdueTaskCount : undefined}
            />
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div style={{ margin: '4px 0' }} />
              {!collapsed && (
                <div style={{ padding: '4px 16px 4px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Admin</span>
                </div>
              )}
              {[
                { to: '/admin/notifications' as NavTo, label: 'Comunicados', icon: Megaphone },
                { to: '/admin/users' as NavTo, label: 'Utilizadores', icon: Shield },
                { to: '/admin/distribuir-leads' as NavTo, label: 'Distribuir', icon: GitFork, badge: unassignedCount },
                { to: '/teams' as NavTo, label: 'Grupos', icon: Users2 },
              ].map(({ to, label, icon, badge }) => (
                <NavItem key={to} to={to} label={label} icon={icon} collapsed={collapsed} badge={badge} />
              ))}
            </>
          )}
        </nav>

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: collapsed ? '12px 0' : '8px 0 12px',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Settings */}
          <NavLink
            to="/settings"
            title={collapsed ? 'Configurações' : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', height: '36px',
              padding: collapsed ? '0' : '0 16px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 0, gap: collapsed ? 0 : '10px',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
              textDecoration: 'none',
              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
              backgroundColor: isActive ? 'rgba(227,30,36,0.12)' : 'transparent',
              borderLeft: isActive ? '2px solid #e31e24' : '2px solid transparent',
              transition: 'all 0.12s ease',
            })}
            onMouseEnter={(e) => { if (!location.pathname.startsWith('/settings')) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)' } }}
            onMouseLeave={(e) => { if (!location.pathname.startsWith('/settings')) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' } }}
          >
            {({ isActive }) => (
              <>
                <Settings style={{ width: '14px', height: '14px', color: isActive ? '#e31e24' : 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                {!collapsed && <span style={{ flex: 1 }}>Configurações</span>}
              </>
            )}
          </NavLink>

          {/* User row */}
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.07)', margin: collapsed ? '8px 8px' : '8px 16px' }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '0' : '4px 16px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '3px', backgroundColor: displayColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '0.02em',
            }}>
              {displayInitials}
            </div>
            {!collapsed && (
              <>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.80)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{displayName}</p>
                  <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{displayRole}</p>
                </div>
                <button type="button" onClick={() => signOut()} title="Sair"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, color: 'rgba(255,255,255,0.22)', transition: 'color 0.12s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#e31e24')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}>
                  <LogOut style={{ width: '13px', height: '13px' }} />
                </button>
              </>
            )}
          </div>
        </div>

      </aside>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        style={{
          position: 'fixed',
          left: `${sidebarW - 10}px`,
          top: '70px',
          width: '20px', height: '20px', borderRadius: '50%',
          backgroundColor: '#1a1a18',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 20,
          color: 'rgba(255,255,255,0.40)',
          fontSize: '10px', fontWeight: 700,
          transition: 'background-color 0.15s ease, left 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e31e24'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1a1a18'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)' }}
      >
        {collapsed ? '›' : '‹'}
      </button>

    </>
  )
}
