import { useState, useEffect, useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Kanban, Users, Mic, CalendarDays,
  CheckSquare, Settings, LogOut, Users2, Shield, Mail,
  Megaphone, GitFork, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import esquireLogo from '@/assets/esquire_logo.png'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useNotificationStore, type AppNotification } from '@/store/useNotificationStore'

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue}, 38%, 40%)`
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


function NavItem({
  to, label, icon: Icon, collapsed, badge,
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
        padding: collapsed ? '0' : '0 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '10px',
        fontSize: '13px',
        fontWeight: isActive ? 500 : 400,
        letterSpacing: '-0.01em',
        textDecoration: 'none',
        userSelect: 'none',
        cursor: 'pointer',
        transition: 'color 0.15s ease, background-color 0.15s ease',
        backgroundColor: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
        position: 'relative',
        borderRadius: '8px',
        margin: '0 10px',
      })}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        if (!el.getAttribute('aria-current')) {
          el.style.color = 'rgba(255,255,255,0.75)'
          el.style.backgroundColor = 'rgba(255,255,255,0.05)'
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        if (!el.getAttribute('aria-current')) {
          el.style.color = 'rgba(255,255,255,0.40)'
          el.style.backgroundColor = 'transparent'
        }
      }}
    >
      {({ isActive }) => (
        <>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Icon style={{
              width: '15px', height: '15px',
              color: isActive ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.30)',
              transition: 'color 0.15s ease',
            }} />
            {hasBadge && collapsed && (
              <span style={{
                position: 'absolute', top: '-3px', right: '-3px',
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: '#b91c22',
                border: '1.5px solid #0c0c0a',
              }} />
            )}
          </div>
          {!collapsed && (
            <>
              <span style={{ flex: 1 }}>{label}</span>
              {hasBadge && (
                <span style={{
                  fontSize: '10px', fontWeight: 600, minWidth: '18px', height: '18px',
                  borderRadius: '4px', backgroundColor: '#b91c22', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px', flexShrink: 0,
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

// @ts-expect-error reserved for sidebar notifications panel (future use)
function _NotificationPanel({ onClose, bottom }: { onClose: () => void; bottom: number }) {
  const notifications = useNotificationStore((s) => s.notifications)
  const markRead      = useNotificationStore((s) => s.markRead)
  const markAllRead   = useNotificationStore((s) => s.markAllRead)
  const navigate      = useNavigate()

  const unread = notifications.filter((n) => !n.read)

  const NOTIF_CFG: Record<string, { label: string; color: string }> = {
    new_deal:         { label: 'Novo Lead',  color: '#b91c22' },
    overdue_activity: { label: 'Parado',     color: '#b45309' },
    sla_breach:       { label: 'SLA',        color: '#dc2626' },
    meeting_invite:   { label: 'Reunião',    color: '#7c3aed' },
  }

  function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1)    return 'agora'
    if (diff < 60)   return `${diff}m`
    if (diff < 1440) return `${Math.floor(diff / 60)}h`
    return `${Math.floor(diff / 1440)}d`
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    function onClick(e: MouseEvent) {
      const panel = document.getElementById('notif-panel')
      if (panel && !panel.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
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
        backgroundColor: '#111110',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '10px', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.70)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>Notificações</span>
          {unread.length > 0 && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#fff', backgroundColor: '#b91c22', borderRadius: '4px', padding: '1px 6px' }}>
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button type="button" onClick={markAllRead}
            style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
            Marcar todas
          </button>
        )}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: '12px' }}>
            Nenhuma notificação
          </div>
        ) : (
          notifications.slice(0, 30).map((n, i) => {
            const cfg = NOTIF_CFG[n.type] ?? { label: n.type, color: 'rgba(255,255,255,0.4)' }
            return (
              <button key={n.id} type="button" onClick={() => handleClick(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  width: '100%', padding: '10px 14px',
                  backgroundColor: n.read ? 'transparent' : 'rgba(185,28,34,0.05)',
                  borderBottom: i < notifications.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer', textAlign: 'left', border: 'none',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'rgba(185,28,34,0.05)')}>
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  backgroundColor: n.read ? 'transparent' : cfg.color,
                  flexShrink: 0, marginTop: '6px',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: cfg.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', marginLeft: 'auto', flexShrink: 0 }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.dealName}
                  </p>
                  {n.meta && (
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)', marginTop: '1px' }}>{n.meta}</p>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

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
    supabase.from('deals')
      .select('id', { count: 'exact', head: true })
      .is('owner_id', null)
      .is('deleted_at', null)
      .then(({ count }) => setUnassignedCount(count ?? 0))
  }, [profile?.is_admin])

  const displayName     = profile?.full_name || 'Utilizador'
  const displayRole     = profile?.is_admin ? 'Admin' : 'Membro'
  const displayInitials = displayName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
  const displayColor    = profile?.avatar_color || hashColor(displayName)

  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 900)

  useEffect(() => {
    function handleResize() { setCollapsed(window.innerWidth < 900) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarW = collapsed ? 64 : 248
  const isAdmin  = profile?.is_admin ?? false

  return (
    <>
      <aside style={{
        width: `${sidebarW}px`,
        minWidth: `${sidebarW}px`,
        backgroundColor: '#0c0c0a',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        height: '100vh', flexShrink: 0,
        zIndex: 10, overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
      }}>

        {/* ── Logo ── */}
        <div style={{
          height: '64px', minHeight: '64px', flexShrink: 0,
          display: 'flex', alignItems: 'center',
          padding: collapsed ? '0' : '0 20px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {collapsed ? (
            <div style={{
              width: '28px', height: '28px', borderRadius: '5px',
              backgroundColor: '#b91c22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic', fontWeight: 700,
                fontSize: '14px', color: '#fff',
              }}>E</span>
            </div>
          ) : (
            <>
              <img src={esquireLogo} alt="Esquire" style={{ height: '20px', objectFit: 'contain' }} />
            </>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav style={{
          flex: 1,
          padding: '10px 0',
          display: 'flex', flexDirection: 'column', gap: '2px',
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          {/* Section label */}
          {!collapsed && (
            <div style={{ padding: '12px 22px 6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Principal
              </span>
            </div>
          )}

          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavItem
              key={to} to={to} label={label} icon={icon} collapsed={collapsed}
              badge={to === '/pipeline' ? unreadCount : to === '/tarefas' ? overdueTaskCount : undefined}
            />
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              {!collapsed && (
                <div style={{ padding: '16px 22px 6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Admin
                  </span>
                </div>
              )}
              {collapsed && <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '8px' }} />}
              {[
                { to: '/admin/notifications' as NavTo, label: 'Comunicados',   icon: Megaphone },
                { to: '/admin/users'         as NavTo, label: 'Utilizadores',  icon: Shield },
                { to: '/admin/distribuir-leads' as NavTo, label: 'Distribuir', icon: GitFork, badge: unassignedCount },
                { to: '/teams'               as NavTo, label: 'Grupos',        icon: Users2 },
              ].map(({ to, label, icon, badge }) => (
                <NavItem key={to} to={to} label={label} icon={icon} collapsed={collapsed} badge={badge} />
              ))}
            </>
          )}
        </nav>

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 0 10px',
          display: 'flex', flexDirection: 'column', gap: '1px',
        }}>
          <NavLink
            to="/settings"
            title={collapsed ? 'Configurações' : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', height: '36px',
              padding: collapsed ? '0' : '0 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '10px', fontSize: '13px', fontWeight: isActive ? 500 : 400,
              letterSpacing: '-0.01em',
              textDecoration: 'none',
              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.38)',
              backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              borderRadius: '6px', margin: '0 8px',
              transition: 'all 0.15s ease',
            })}
            onMouseEnter={(e) => {
              if (!location.pathname.startsWith('/settings')) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
              }
            }}
            onMouseLeave={(e) => {
              if (!location.pathname.startsWith('/settings')) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'rgba(255,255,255,0.38)'
              }
            }}
          >
            {({ isActive }) => (
              <>
                <Settings style={{ width: '15px', height: '15px', color: isActive ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.28)', flexShrink: 0 }} />
                {!collapsed && <span>Configurações</span>}
              </>
            )}
          </NavLink>

          {/* User row */}
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: collapsed ? '6px 8px' : '6px 16px' }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '0' : '4px 14px 2px',
            margin: '0 8px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '6px',
              backgroundColor: displayColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#fff', fontSize: '10px', fontWeight: 700,
            }}>
              {displayInitials}
            </div>
            {!collapsed && (
              <>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.80)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                    {displayName}
                  </p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>
                    {displayRole}
                  </p>
                </div>
                <button type="button" onClick={() => signOut()} title="Sair"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, color: 'rgba(255,255,255,0.20)', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#b91c22')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.20)')}>
                  <LogOut style={{ width: '14px', height: '14px' }} />
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
        title={collapsed ? 'Expandir' : 'Recolher'}
        style={{
          position: 'fixed',
          left: `${sidebarW - 10}px`,
          top: '66px',
          width: '20px', height: '20px', borderRadius: '50%',
          backgroundColor: '#1a1a18',
          border: '1px solid rgba(255,255,255,0.11)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 20,
          color: 'rgba(255,255,255,0.35)',
          transition: 'background-color 0.15s ease, left 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b91c22'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1a1a18'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
      >
        {collapsed
          ? <ChevronRight style={{ width: '11px', height: '11px' }} />
          : <ChevronLeft  style={{ width: '11px', height: '11px' }} />
        }
      </button>
    </>
  )
}

