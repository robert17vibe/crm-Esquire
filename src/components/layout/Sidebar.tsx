import { useState, useRef, useLayoutEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  KanbanSquare,
  Briefcase,
  Users,
  Building2,
  Zap,
  Mic,
  BarChart3,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/pipeline',   label: 'Pipeline',   icon: KanbanSquare    },
  { to: '/deals',      label: 'Deals',      icon: Briefcase       },
  { to: '/contacts',   label: 'Contatos',   icon: Users           },
  { to: '/companies',  label: 'Empresas',   icon: Building2       },
  { to: '/activities', label: 'Atividades', icon: Zap             },
  { to: '/meetings',   label: 'Reuniões',   icon: Mic             },
  { to: '/reports',    label: 'Relatórios', icon: BarChart3       },
] as const

type NavTo = (typeof NAV_ITEMS)[number]['to']

function grayHashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return (['#2a2a2a', '#3a3a3a', '#4a4a4a', '#5a5a5a'])[Math.abs(h) % 4]
}

const CURRENT_USER = { name: 'Robert Ferreira', role: 'Admin', initials: 'RF' }

// ─── Single nav item ──────────────────────────────────────────────────────────

function NavItem({
  to,
  label,
  icon: Icon,
  activeItemBg,
}: {
  to: NavTo
  label: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  activeItemBg: string
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <NavLink
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        padding: '0 12px',
        borderRadius: '6px',
        gap: '10px',
        fontSize: '13px',
        fontWeight: 500,
        textDecoration: 'none',
        userSelect: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, color 0.2s ease',
        backgroundColor: isActive ? activeItemBg : hovered ? '#242424' : 'transparent',
        color: isActive || hovered ? '#f0ede5' : '#9a9a9a',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon style={{ width: '16px', height: '16px', flexShrink: 0, color: isActive || hovered ? '#f0ede5' : '#9a9a9a', transition: 'color 0.2s ease' }} />
          {label}
        </>
      )}
    </NavLink>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const isDark   = useThemeStore((s) => s.isDark)
  const location = useLocation()

  const asideRef     = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  // wrapper divs around each nav item — reliable refs (no NavLink forwarding issues)
  const wrapperRefs  = useRef<Partial<Record<NavTo, HTMLDivElement>>>({})
  const firstRender  = useRef(true)

  const sidebarBg    = isDark ? '#050505' : '#1a1a1a'
  const activeItemBg = isDark ? '#1a1a1a' : '#2a2a2a'
  const avatarColor  = grayHashColor(CURRENT_USER.name)

  useLayoutEffect(() => {
    const aside     = asideRef.current
    const indicator = indicatorRef.current
    if (!aside || !indicator) return

    const active = NAV_ITEMS.find(({ to }) => location.pathname.startsWith(to))
    if (!active) { indicator.style.opacity = '0'; return }

    const wrapper = wrapperRefs.current[active.to]
    if (!wrapper) { indicator.style.opacity = '0'; return }

    const asideRect   = aside.getBoundingClientRect()
    const wrapperRect = wrapper.getBoundingClientRect()
    const topOffset   = wrapperRect.top - asideRect.top

    if (firstRender.current) {
      // instant placement on first load — no animation
      indicator.style.transition = 'none'
      indicator.style.top        = `${topOffset}px`
      indicator.style.height     = `${wrapperRect.height}px`
      indicator.style.opacity    = '1'
      void indicator.getBoundingClientRect() // force reflow
      indicator.style.transition = 'top 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease'
      firstRender.current = false
    } else {
      indicator.style.top    = `${topOffset}px`
      indicator.style.height = `${wrapperRect.height}px`
      indicator.style.opacity = '1'
    }
  }, [location.pathname])

  return (
    <aside
      ref={asideRef}
      className="relative flex h-full flex-col shrink-0"
      style={{
        width: '200px',
        backgroundColor: sidebarBg,
        borderRight: '1px solid #242424',
        transition: 'background-color 0.3s ease',
        overflow: 'visible', // indicator pode vazar para a direita
      }}
    >
      {/* ── Sliding indicator — "vazada" para o conteúdo ── */}
      <div
        ref={indicatorRef}
        aria-hidden
        style={{
          position: 'absolute',
          right: '-1px',           // cola na borda direita da sidebar
          top: 0,
          width: '2px',
          height: '36px',
          backgroundColor: '#f0ede5',
          borderRadius: '2px 0 0 2px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 30,
          // glow vazando para a área de conteúdo
          boxShadow: '2px 0 10px 1px rgba(240,237,229,0.18)',
          transition: 'top 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease',
        }}
      />

      {/* ── Logo ── */}
      <div style={{ padding: '20px 12px 16px', flexShrink: 0 }}>
        <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em', color: '#f0ede5' }}>
          Esquire CRM
        </span>
      </div>

      <div style={{ height: '1px', backgroundColor: '#242424', marginBottom: '12px', flexShrink: 0 }} />

      {/* ── Navigation ── */}
      <nav className="flex-1 flex flex-col" style={{ padding: '0 12px', gap: '2px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <div
            key={to}
            ref={(el) => { if (el) wrapperRefs.current[to] = el }}
          >
            <NavItem to={to} label={label} icon={icon} activeItemBg={activeItemBg} />
          </div>
        ))}
      </nav>

      <div style={{ height: '1px', backgroundColor: '#242424', flexShrink: 0 }} />

      {/* ── Footer ── */}
      <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f0ede5', fontSize: '11px', fontWeight: 600 }}>
          {CURRENT_USER.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#f0ede5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
            {CURRENT_USER.name}
          </p>
          <p style={{ fontSize: '10px', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.4, marginTop: '1px' }}>
            {CURRENT_USER.role}
          </p>
        </div>
      </div>
    </aside>
  )
}
