import { useState, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Kanban, Users, CalendarDays,
  CheckSquare, Settings, LogOut, Users2, Shield, Mail,
  Megaphone, GitFork, ChevronLeft, ChevronRight,
  CreditCard, TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import esquireLogo from '@/assets/esquire_logo.png'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useNotificationStore } from '@/store/useNotificationStore'

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue}, 38%, 40%)`
}

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/pipeline',   label: 'Jornada',     icon: Kanban          },
  { to: '/clients',    label: 'Clientes',    icon: Users           },
  { to: '/tarefas',    label: 'Tarefas',     icon: CheckSquare     },
  { to: '/calendar',   label: 'Calendário',  icon: CalendarDays    },
  { to: '/email',      label: 'Email',       icon: Mail            },
] as const

type NavTo = (typeof NAV_ITEMS)[number]['to'] | '/teams' | '/admin/users' | '/admin/notifications' | '/admin/distribuir-leads' | '/admin/cobranca' | '/admin/desempenho'

function NavItem({
  to, label, icon: Icon, collapsed, badge,
}: {
  to: NavTo
  label: string
  icon: React.ComponentType<{ style?: React.CSSProperties; className?: string }>
  collapsed: boolean
  badge?: number
}) {
  const [hovered, setHovered] = useState(false)
  const hasBadge = (badge ?? 0) > 0

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        padding: collapsed ? '0' : '0 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '10px',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 400,
        letterSpacing: '-0.01em',
        textDecoration: 'none',
        userSelect: 'none',
        cursor: 'pointer',
        transition: 'color 0.15s ease, background-color 0.18s ease',
        backgroundColor: isActive
          ? 'rgba(107,18,18,0.28)'
          : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: isActive ? '#ffffff' : hovered ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.42)',
        position: 'relative',
        borderRadius: '12px',
        margin: '0 10px',
        boxShadow: isActive ? 'inset 0 0 0 1px rgba(107,18,18,0.50)' : 'none',
      })}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span style={{
              position: 'absolute', left: 0, top: '20%', bottom: '20%',
              width: '3px', borderRadius: '0 3px 3px 0',
              backgroundColor: '#6b1212',
            }} />
          )}
          <div style={{ position: 'relative', flexShrink: 0, display: 'flex', perspectiveOrigin: 'center' }}>
            <Icon
              style={{
                width: '15px', height: '15px',
                color: isActive ? '#ffffff' : hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.32)',
                transition: 'color 0.15s ease',
                transformOrigin: 'center',
                display: 'block',
              }}
            />
            {hasBadge && collapsed && (
              <span style={{
                position: 'absolute', top: '-3px', right: '-3px',
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: '#6b1212',
                border: '1.5px solid #0c0c0a',
              }} />
            )}
          </div>
          {!collapsed && (
            <>
              <span style={{ flex: 1 }}>{label}</span>
              {hasBadge && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, minWidth: '18px', height: '18px',
                  borderRadius: '6px', backgroundColor: '#6b1212', color: '#fff',
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

export function Sidebar() {
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
  const [settingsHover, setSettingsHover] = useState(false)

  useEffect(() => {
    function handleResize() { setCollapsed(window.innerWidth < 900) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarW = collapsed ? 64 : 208
  const isAdmin  = profile?.is_admin ?? false

  return (
    <>
      <aside style={{
        width: `${sidebarW}px`,
        minWidth: `${sidebarW}px`,
        background: 'linear-gradient(180deg, #111110 0%, #0d0c0a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        height: '100vh', flexShrink: 0,
        zIndex: 10, overflow: 'hidden',
        transition: 'width 0.24s cubic-bezier(0.4,0,0.2,1), min-width 0.24s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        borderRadius: '0 20px 20px 0',
        boxShadow: '4px 0 24px rgba(0,0,0,0.28)',
      }}>

        {/* ── Logo ── */}
        <div style={{
          height: '60px', minHeight: '60px', flexShrink: 0,
          display: 'flex', alignItems: 'center',
          padding: collapsed ? '0' : '0 18px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {collapsed ? (
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #7a1616 0%, #4a0d0d 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(107,18,18,0.4)',
            }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic', fontWeight: 700,
                fontSize: '15px', color: '#fff',
              }}>E</span>
            </div>
          ) : (
            <img src={esquireLogo} alt="Esquire" style={{ height: '20px', objectFit: 'contain' }} />
          )}
        </div>

        {/* ── Navigation ── */}
        <nav style={{
          flex: 1,
          padding: '8px 0',
          display: 'flex', flexDirection: 'column', gap: '1px',
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          {!collapsed && (
            <div style={{ padding: '10px 20px 5px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
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

          {isAdmin && (
            <>
              {!collapsed && (
                <div style={{ padding: '14px 20px 5px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Admin
                  </span>
                </div>
              )}
              {collapsed && <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '8px 12px' }} />}
              {[
                { to: '/admin/notifications'    as NavTo, label: 'Comunicados',  icon: Megaphone },
                { to: '/admin/users'            as NavTo, label: 'Utilizadores', icon: Shield },
                { to: '/admin/distribuir-leads' as NavTo, label: 'Distribuir',   icon: GitFork, badge: unassignedCount },
                { to: '/teams'                  as NavTo, label: 'Grupos',       icon: Users2 },
              ].map(({ to, label, icon, badge }) => (
                <NavItem key={to} to={to} label={label} icon={icon} collapsed={collapsed} badge={badge} />
              ))}

              {/* ── Responsáveis ── */}
              {!collapsed && (
                <div style={{ padding: '14px 20px 5px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Responsáveis
                  </span>
                </div>
              )}
              {collapsed && <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '8px 12px' }} />}
              {[
                { to: '/admin/desempenho' as NavTo, label: 'Desempenho', icon: TrendingUp },
                { to: '/admin/cobranca'   as NavTo, label: 'Cobrança',   icon: CreditCard },
              ].map(({ to, label, icon }) => (
                <NavItem key={to} to={to} label={label} icon={icon} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '6px 0 8px',
          display: 'flex', flexDirection: 'column', gap: '1px',
        }}>
          {/* Settings */}
          <NavLink
            to="/settings"
            title={collapsed ? 'Configurações' : undefined}
            onMouseEnter={() => setSettingsHover(true)}
            onMouseLeave={() => setSettingsHover(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', height: '34px',
              padding: collapsed ? '0' : '0 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '10px', fontSize: '13px', fontWeight: isActive ? 600 : 400,
              letterSpacing: '-0.01em',
              textDecoration: 'none',
              color: isActive ? '#ffffff' : settingsHover ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.38)',
              backgroundColor: isActive ? 'rgba(107,18,18,0.28)' : settingsHover ? 'rgba(255,255,255,0.06)' : 'transparent',
              borderRadius: '12px', margin: '0 10px',
              transition: 'all 0.15s ease',
              boxShadow: isActive ? 'inset 0 0 0 1px rgba(107,18,18,0.50)' : 'none',
              position: 'relative',
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', borderRadius: '0 3px 3px 0', backgroundColor: '#6b1212' }} />
                )}
                <Settings style={{
                  width: '15px', height: '15px',
                  color: isActive ? '#ffffff' : settingsHover ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)',
                  flexShrink: 0,
                  animation: settingsHover ? 'sb-gear 0.55s ease both' : 'none',
                  transformOrigin: 'center',
                }} />
                {!collapsed && <span>Configurações</span>}
              </>
            )}
          </NavLink>

          {/* User row */}
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: collapsed ? '5px 12px' : '5px 16px' }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: collapsed ? '0' : '3px 12px 2px',
            margin: '0 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              backgroundColor: displayColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#fff', fontSize: '10px', fontWeight: 700,
              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, color: 'rgba(255,255,255,0.20)', transition: 'color 0.15s ease', display: 'flex' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#e05050')}
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
          top: '62px',
          width: '20px', height: '20px', borderRadius: '50%',
          backgroundColor: '#1e1e1c',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 20,
          color: 'rgba(255,255,255,0.35)',
          transition: 'background-color 0.15s ease, left 0.24s cubic-bezier(0.4,0,0.2,1), color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6b1212'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1e1e1c'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
      >
        {collapsed
          ? <ChevronRight style={{ width: '11px', height: '11px' }} />
          : <ChevronLeft  style={{ width: '11px', height: '11px' }} />
        }
      </button>
    </>
  )
}
