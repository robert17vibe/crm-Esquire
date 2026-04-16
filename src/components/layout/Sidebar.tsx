import { NavLink } from 'react-router-dom'
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
import { cn } from '@/lib/utils'

// ─── Nav items ────────────────────────────────────────────────────────────────

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

// ─── Avatar color from name hash ──────────────────────────────────────────────

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h)
  }
  const hue = ((Math.abs(h) % 360) + 360) % 360
  return `hsl(${hue}, 52%, 46%)`
}

// ─── Hardcoded user — will be replaced by auth context ───────────────────────

const CURRENT_USER = { name: 'Robert Ferreira', role: 'Admin', initials: 'RF' }

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const avatarColor = hashColor(CURRENT_USER.name)

  return (
    <aside
      className="flex h-full flex-col shrink-0"
      style={{
        width: '210px',
        backgroundColor: '#1e1b4b',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
      }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <div
          className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#5b50e8' }}
        >
          <KanbanSquare className="w-[15px] h-[15px] text-white" />
        </div>
        <span
          className="text-white tracking-tight"
          style={{ fontSize: '14px', fontWeight: 600 }}
        >
          Esquire CRM
        </span>
      </div>

      {/* Logo separator */}
      <div style={{ height: '1px', backgroundColor: '#2a2860' }} />

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-3 flex flex-col" style={{ gap: '2px' }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center rounded-[10px] transition-all duration-200',
                isActive
                  ? 'bg-[#5b50e8] dark:bg-[#4a40d4] text-white'
                  : 'text-[#6b69a3] hover:bg-[#252360] hover:text-[#a8a6d4]',
              )
            }
            style={{ padding: '6px 12px', gap: '10px', fontSize: '14px', fontWeight: 500 }}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'shrink-0 transition-colors duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-[#6b69a3] group-hover:text-[#a8a6d4]',
                  )}
                  style={{ width: '18px', height: '18px' }}
                />
                {label}

                {/* Bridge — visual connector toward content */}
                {isActive && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      right: '-1px',
                      top: 0,
                      height: '100%',
                      width: '3px',
                      backgroundColor: '#5b50e8',
                      borderRadius: '99px 0 0 99px',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer separator */}
      <div style={{ height: '1px', backgroundColor: '#2a2860' }} />

      {/* ── User footer ── */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        {/* Avatar */}
        <div
          className="flex items-center justify-center shrink-0 text-white"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: avatarColor,
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {CURRENT_USER.initials}
        </div>

        {/* Identity */}
        <div className="min-w-0">
          <p
            className="text-white truncate leading-tight"
            style={{ fontSize: '13px', fontWeight: 600 }}
          >
            {CURRENT_USER.name}
          </p>
          <p
            className="leading-tight"
            style={{ fontSize: '11px', color: '#6b69a3' }}
          >
            {CURRENT_USER.role}
          </p>
        </div>
      </div>
    </aside>
  )
}
