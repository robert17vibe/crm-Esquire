import { useState, useRef } from 'react'
import { Bell, Moon, Sun, Settings, LogOut, User, AlertTriangle, Clock, Search } from 'lucide-react'
import type { NotificationType } from '@/store/useNotificationStore'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotificationStore } from '@/store/useNotificationStore'

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({
  onClose,
  isDark,
}: {
  onClose: () => void
  isDark: boolean
}) {
  const { notifications, markAllRead, markRead } = useNotificationStore()
  const navigate = useNavigate()

  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const hover  = isDark ? '#1e1e1c' : '#f5f4f0'

  const unread = notifications.filter((n) => !n.read)

  function handleClickNotification(n: typeof notifications[0]) {
    markRead(n.id)
    navigate(`/deal/${n.dealId}`)
    onClose()
  }

  function fmtTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 1) return 'agora'
    if (diff < 60) return `${diff}min`
    if (diff < 1440) return `${Math.floor(diff / 60)}h`
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onClose} />
      <div
        style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '320px', maxHeight: '420px',
          backgroundColor: bg, border: `1px solid ${border}`,
          borderRadius: '12px', zIndex: 50,
          boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.5)' : '0 12px 32px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 12px',
          borderBottom: `1px solid ${border}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text }}>Notificações</p>
            {unread.length > 0 && (
              <span style={{
                fontSize: '9px', fontWeight: 700, color: '#fff',
                backgroundColor: '#dc2626', borderRadius: '99px',
                padding: '1px 6px',
              }}>{unread.length}</span>
            )}
          </div>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              style={{ fontSize: '11px', fontWeight: 600, color: muted, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: muted }}>Nenhuma notificação</p>
            </div>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClickNotification(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  backgroundColor: n.read ? 'transparent' : (isDark ? '#1a1a18' : '#f8f7f4'),
                  border: 'none', cursor: 'pointer',
                  borderBottom: `1px solid ${border}`,
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.read ? 'transparent' : (isDark ? '#1a1a18' : '#f8f7f4'))}
              >
                {(() => {
                  const cfg: Record<NotificationType, { icon: typeof User; color: string; bg: string; label: string }> = {
                    new_deal:         { icon: User,          color: '#2c5545', bg: isDark ? '#1e2e24' : '#e6f2ee', label: 'Novo lead criado' },
                    overdue_activity: { icon: AlertTriangle, color: '#c53030', bg: isDark ? '#2d1515' : '#fee2e2', label: 'Atividade vencida' },
                    sla_breach:       { icon: Clock,         color: '#b45309', bg: isDark ? '#2a1a0a' : '#fef3c7', label: 'SLA em risco' },
                  }
                  const { icon: Icon, color, bg, label } = cfg[n.type] ?? cfg.new_deal
                  return (
                    <>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon style={{ width: '12px', height: '12px', color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: n.read ? 500 : 700, color: text, lineHeight: 1.3 }}>{label}</p>
                        <p style={{ fontSize: '11px', color: muted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.dealName}</p>
                        {n.meta && <p style={{ fontSize: '10px', color, marginTop: '1px' }}>{n.meta}</p>}
                      </div>
                    </>
                  )
                })()}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', color: muted }}>{fmtTime(n.createdAt)}</span>
                  {!n.read && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2c5545' }} />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ─── User Menu ────────────────────────────────────────────────────────────────

function UserMenu({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const profile  = useAuthStore((s) => s.profile)
  const signOut  = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const hover  = isDark ? '#1e1e1c' : '#f5f4f0'

  const displayName    = profile?.full_name || 'Usuário'
  const displayEmail   = profile?.email || '—'
  const displayRole    = profile?.role === 'admin' ? 'Admin' : 'Usuário'
  const displayColor   = profile?.avatar_color ?? '#2c5545'
  const displayInitials = displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onClose} />
      <div
        style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '240px',
          backgroundColor: bg, border: `1px solid ${border}`,
          borderRadius: '12px', zIndex: 50,
          boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.5)' : '0 12px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Profile info */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: displayColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
            }}>
              {displayInitials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayEmail}
              </p>
            </div>
          </div>
          <span style={{
            display: 'inline-block', marginTop: '8px',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#2c5545', backgroundColor: isDark ? '#1a2e22' : '#e6f2ee',
            border: `1px solid ${isDark ? '#2c5545' : '#b8d9ce'}`,
            borderRadius: '4px', padding: '2px 8px',
          }}>
            {displayRole}
          </span>
        </div>

        {/* Actions */}
        <div style={{ padding: '6px' }}>
          {[
            { label: 'Configurações', icon: Settings, action: () => { navigate('/settings'); onClose() } },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '8px 10px',
                borderRadius: '6px', textAlign: 'left',
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: text,
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Icon style={{ width: '14px', height: '14px', color: muted, flexShrink: 0 }} />
              {label}
            </button>
          ))}

          <div style={{ height: '1px', backgroundColor: border, margin: '4px 0' }} />

          <button
            type="button"
            onClick={() => { signOut(); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '8px 10px',
              borderRadius: '6px', textAlign: 'left',
              backgroundColor: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#c53030',
              transition: 'background-color 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut style={{ width: '14px', height: '14px', flexShrink: 0 }} />
            Sair
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const { isDark, toggle } = useThemeStore()
  const profile  = useAuthStore((s) => s.profile)
  const notifications = useNotificationStore((s) => s.notifications)

  const [showNotif, setShowNotif] = useState(false)
  const [showUser,  setShowUser]  = useState(false)

  const notifRef = useRef<HTMLDivElement>(null)
  const userRef  = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const displayColor    = profile?.avatar_color ?? '#2c5545'
  const displayName     = profile?.full_name || 'Usuário'
  const displayInitials = displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <header className="flex h-14 items-center border-b border-line/60 bg-surface-base px-5 shrink-0" style={{ position: 'relative' }}>
      {/* Empty left spacer */}
      <div style={{ flex: 1 }} />

      {/* Global search trigger — centered absolutely */}
      <button
        type="button"
        onClick={onOpenSearch}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          height: '36px', width: '420px',
          padding: '0 14px',
          backgroundColor: isDark ? '#111110' : '#f0ede8',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
          borderRadius: '12px', cursor: 'text',
          transition: 'border-color 0.15s ease, background-color 0.15s ease',
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)' }}
      >
        <Search style={{ width: '14px', height: '14px', color: isDark ? '#4a4a46' : '#a0998c', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '13px', color: isDark ? '#4a4a46' : '#a0998c', fontWeight: 500 }}>
          Buscar leads, páginas, comandos...
        </span>
        <kbd style={{
          fontSize: '10px', fontWeight: 600, fontFamily: 'monospace',
          color: isDark ? '#3a3a36' : '#c4bfb8',
          backgroundColor: isDark ? '#1a1a18' : '#e8e5e0',
          border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
          borderRadius: '4px', padding: '2px 6px', whiteSpace: 'nowrap',
        }}>⌘K</kbd>
      </button>

      <div className="flex items-center gap-1.5">
        {/* Dark/light toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
          className="w-8 h-8 flex items-center justify-center rounded-[10px] text-ink-muted hover:bg-surface-col hover:text-ink-base transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Notificações"
            onClick={() => { setShowNotif((v) => !v); setShowUser(false) }}
            className="w-8 h-8 flex items-center justify-center rounded-[10px] text-ink-muted hover:bg-surface-col hover:text-ink-base transition-colors"
            style={{ position: 'relative' }}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '4px', right: '4px',
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: '#dc2626',
                border: `1.5px solid ${isDark ? '#0d0c0a' : '#f5f4f0'}`,
              }} />
            )}
          </button>
          {showNotif && (
            <NotificationPanel
              isDark={isDark}
              onClose={() => setShowNotif(false)}
            />
          )}
        </div>

        {/* User avatar */}
        <div ref={userRef} style={{ position: 'relative', marginLeft: '4px' }}>
          <button
            type="button"
            onClick={() => { setShowUser((v) => !v); setShowNotif(false) }}
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: displayColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '10px', fontWeight: 700,
              border: 'none', cursor: 'pointer',
              transition: 'opacity 0.15s ease',
              outline: showUser ? `2px solid ${displayColor}` : 'none',
              outlineOffset: '2px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {displayInitials}
          </button>
          {showUser && (
            <UserMenu isDark={isDark} onClose={() => setShowUser(false)} />
          )}
        </div>
      </div>
    </header>
  )
}
