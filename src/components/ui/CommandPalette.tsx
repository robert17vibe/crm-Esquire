import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutDashboard, Kanban, Users, Mic, CalendarDays, Settings, Building2, ArrowRight } from 'lucide-react'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { getStageColor } from '@/constants/pipeline'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CmdItem {
  id: string
  label: string
  sublabel?: string
  type: 'page' | 'deal'
  action: () => void
  color?: string
}

// ─── Static page items ────────────────────────────────────────────────────────

const PAGE_ITEMS = (navigate: ReturnType<typeof useNavigate>): CmdItem[] => [
  { id: 'p-dashboard', label: 'Dashboard',   sublabel: 'Visão executiva',    type: 'page', action: () => navigate('/dashboard'), color: '#2c5545' },
  { id: 'p-pipeline',  label: 'Pipeline',    sublabel: 'Kanban de negócios', type: 'page', action: () => navigate('/pipeline'),  color: '#78909c' },
  { id: 'p-clients',   label: 'Clientes',    sublabel: 'Base de empresas',   type: 'page', action: () => navigate('/clients'),   color: '#4a7c8a' },
  { id: 'p-meetings',  label: 'Reuniões',    sublabel: 'Registro de calls',  type: 'page', action: () => navigate('/meetings'),  color: '#8b6914' },
  { id: 'p-calendar',  label: 'Calendário',  sublabel: 'Compromissos',       type: 'page', action: () => navigate('/calendar'),  color: '#6b4a8a' },
  { id: 'p-settings',  label: 'Configurações', sublabel: 'Preferências',     type: 'page', action: () => navigate('/settings'), color: '#6b6560' },
]

const PAGE_ICONS: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  'p-dashboard': LayoutDashboard,
  'p-pipeline':  Kanban,
  'p-clients':   Users,
  'p-meetings':  Mic,
  'p-calendar':  CalendarDays,
  'p-settings':  Settings,
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({ item, active, isDark, onSelect }: {
  item: CmdItem; active: boolean; isDark: boolean; onSelect: () => void
}) {
  const bg    = active ? (isDark ? '#1e2d27' : '#e8f2ee') : 'transparent'
  const text  = isDark ? '#e8e4dc' : '#1a1814'
  const muted = isDark ? '#6b6560' : '#8a857d'
  const Icon  = item.type === 'page' ? PAGE_ICONS[item.id] : Building2

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 14px', borderRadius: '6px',
        backgroundColor: bg, border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'background-color 0.1s ease',
      }}
    >
      <div style={{
        width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
        backgroundColor: active
          ? `${item.color ?? '#2c5545'}22`
          : (isDark ? '#1e1e1c' : '#f0eeea'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: active ? `1px solid ${item.color ?? '#2c5545'}40` : '1px solid transparent',
        transition: 'all 0.1s ease',
      }}>
        {Icon && <Icon style={{ width: '13px', height: '13px', color: active ? (item.color ?? '#2c5545') : muted }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </p>
        {item.sublabel && (
          <p style={{ fontSize: '11px', color: muted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.sublabel}
          </p>
        )}
      </div>
      {active && <ArrowRight style={{ width: '13px', height: '13px', color: item.color ?? '#2c5545', flexShrink: 0 }} />}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate  = useNavigate()
  const isDark    = useThemeStore((s) => s.isDark)
  const deals     = useDealStore((s) => s.deals)

  const [query,       setQuery]       = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [mounted,     setMounted]     = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Animate in/out
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      requestAnimationFrame(() => setMounted(true))
      setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      setMounted(false)
    }
  }, [open])

  // Build items list
  const pageItems  = useMemo(() => PAGE_ITEMS(navigate), [navigate])
  const dealItems  = useMemo<CmdItem[]>(() =>
    deals
      .filter((d) => !['closed_lost'].includes(d.stage_id))
      .map((d) => ({
        id: d.id,
        label: d.company_name,
        sublabel: d.contact_name ?? d.title,
        type: 'deal' as const,
        action: () => navigate(`/deal/${d.id}`),
        color: getStageColor(d.stage_id),
      })),
    [deals, navigate],
  )

  const allItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [...pageItems, ...dealItems.slice(0, 5)]
    const filtered = [...pageItems, ...dealItems].filter((item) =>
      item.label.toLowerCase().includes(q) || item.sublabel?.toLowerCase().includes(q)
    )
    return filtered.slice(0, 12)
  }, [query, pageItems, dealItems])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, allItems.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = allItems[activeIndex]
        if (item) { item.action(); onClose() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, allItems, activeIndex, onClose])

  // Reset active when results change
  useEffect(() => { setActiveIndex(0) }, [query])

  if (!open && !mounted) return null

  const bg      = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#2a2a28' : '#e4e0da'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f5f4f0'
  const inputTx = isDark ? '#e8e4dc' : '#1a1814'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        backgroundColor: mounted ? (isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)') : 'transparent',
        backdropFilter: mounted ? 'blur(4px)' : 'none',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '18vh',
        transition: 'background-color 0.18s ease, backdrop-filter 0.18s ease',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '540px', maxWidth: 'calc(100vw - 32px)',
          backgroundColor: bg,
          border: `1px solid ${border}`,
          borderRadius: '12px',
          boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.97)',
          opacity: mounted ? 1 : 0,
          transition: 'transform 0.22s cubic-bezier(0.34,1.2,0.64,1), opacity 0.18s ease',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
          <Search style={{ width: '15px', height: '15px', color: muted, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar deals, páginas..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: '14px', fontWeight: 500, color: inputTx, fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: '10px', fontWeight: 600, color: muted,
            backgroundColor: inputBg, border: `1px solid ${border}`,
            borderRadius: '4px', padding: '2px 6px', fontFamily: 'inherit',
          }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ padding: '8px', maxHeight: '360px', overflowY: 'auto' }}>
          {allItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: muted }}>Nenhum resultado para "{query}"</p>
            </div>
          ) : (
            <>
              {/* Section label */}
              {!query && (
                <p style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 14px 6px' }}>
                  Páginas
                </p>
              )}
              {allItems.map((item, i) => {
                const showDealHeader = !query && i === pageItems.length && dealItems.length > 0
                return (
                  <div key={item.id}>
                    {showDealHeader && (
                      <p style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 14px 4px' }}>
                        Deals recentes
                      </p>
                    )}
                    <ResultRow
                      item={item}
                      active={activeIndex === i}
                      isDark={isDark}
                      onSelect={() => { item.action(); onClose() }}
                    />
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: `1px solid ${border}`, display: 'flex', gap: '14px' }}>
          {[['↑↓', 'navegar'], ['↵', 'abrir'], ['Esc', 'fechar']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <kbd style={{ fontSize: '10px', fontWeight: 600, color: muted, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '4px', padding: '1px 5px', fontFamily: 'inherit' }}>
                {key}
              </kbd>
              <span style={{ fontSize: '10px', color: muted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
