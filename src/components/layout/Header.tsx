import { useState, useRef } from 'react'
import { Bell, Moon, Sun, Settings, LogOut, AlertTriangle, Clock, Search, Megaphone } from 'lucide-react'
import type { NotificationType } from '@/store/useNotificationStore'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useTeamNotificationStore } from '@/store/useTeamNotificationStore'

function NotificationPanel({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { notifications: dealNotifs, markAllRead, markRead } = useNotificationStore()
  const { notifications: teamNotifs, readIds, markRead: markTeamRead, fetch: fetchTeam } = useTeamNotificationStore()
  const navigate = useNavigate()

  const bg     = isDark ? '#141412' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#eaecf0'
  const text   = isDark ? '#e8e4dc' : '#101828'
  const muted  = isDark ? '#667085' : '#667085'
  const hover  = isDark ? '#1c1c1a' : '#f3f4f6'

  useState(() => { fetchTeam().catch(() => {}) })

  const unreadDeal  = dealNotifs.filter((n) => !n.read).length
  const unreadTeam  = teamNotifs.filter((n) => !readIds.has(n.id)).length
  const totalUnread = unreadDeal + unreadTeam

  function fmtTime(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1)    return 'agora'
    if (diff < 60)   return `${diff}min`
    if (diff < 1440) return `${Math.floor(diff / 60)}h`
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso))
  }

  const TEAM_TYPE_CFG: Record<string, { color: string; bg: string }> = {
    info:         { color: '#1d4ed8', bg: isDark ? '#0f1c40' : '#eff6ff' },
    warning:      { color: '#b45309', bg: isDark ? '#231508' : '#fef3c7' },
    urgent:       { color: '#b91c1c', bg: isDark ? '#200f0f' : '#fee2e2' },
    announcement: { color: '#7c3aed', bg: isDark ? '#160e30' : '#f5f3ff' },
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onClose} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        width: '340px', maxHeight: '480px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: '12px', zIndex: 50,
        boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.60)' : '0 12px 32px rgba(16,24,40,0.12)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 12px', borderBottom: `1px solid ${border}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: text, letterSpacing: '-0.01em' }}>Notificações</p>
            {totalUnread > 0 && (
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#fff', backgroundColor: '#b91c22', borderRadius: '99px', padding: '1px 7px' }}>
                {totalUnread}
              </span>
            )}
          </div>
          {totalUnread > 0 && (
            <button type="button"
              onClick={() => {
                markAllRead()
                teamNotifs.forEach((n) => { if (!readIds.has(n.id)) markTeamRead(n.id) })
              }}
              style={{ fontSize: '12px', fontWeight: 500, color: muted, background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = muted)}>
              Marcar todas
            </button>
          )}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Comunicados */}
          {teamNotifs.length > 0 && (
            <>
              <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Megaphone style={{ width: '10px', height: '10px', color: muted }} />
                <span style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Comunicados
                </span>
              </div>
              {teamNotifs.map((n) => {
                const isRead = readIds.has(n.id)
                const cfg = TEAM_TYPE_CFG[n.type] ?? TEAM_TYPE_CFG.info
                return (
                  <button key={n.id} type="button"
                    onClick={() => { if (!isRead) markTeamRead(n.id) }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      width: '100%', padding: '10px 16px', textAlign: 'left',
                      backgroundColor: isRead ? 'transparent' : (isDark ? '#181816' : '#f8f7f4'),
                      border: 'none', cursor: isRead ? 'default' : 'pointer',
                      borderBottom: `1px solid ${border}`, transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={(e) => { if (!isRead) e.currentTarget.style.backgroundColor = hover }}
                    onMouseLeave={(e) => { if (!isRead) e.currentTarget.style.backgroundColor = isDark ? '#181816' : '#f8f7f4' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: cfg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Megaphone style={{ width: '12px', height: '12px', color: cfg.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: isRead ? 400 : 600, color: text, lineHeight: 1.3 }}>{n.title}</p>
                      {n.body && <p style={{ fontSize: '12px', color: muted, marginTop: '2px', lineHeight: 1.4 }}>{n.body}</p>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: muted }}>{fmtTime(n.created_at)}</span>
                      {!isRead && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.color }} />}
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {/* Notificações de deal */}
          {dealNotifs.length > 0 && (
            <>
              {teamNotifs.length > 0 && (
                <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: '6px', borderTop: `1px solid ${border}` }}>
                  <Bell style={{ width: '10px', height: '10px', color: muted }} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline</span>
                </div>
              )}
              {dealNotifs.slice(0, 15).map((n) => {
                const cfgMap: Record<NotificationType, { color: string; bg: string; label: string }> = {
                  new_deal:         { color: '#15803d', bg: isDark ? '#0c2015' : '#ecfdf5', label: 'Novo lead'        },
                  overdue_activity: { color: '#b91c1c', bg: isDark ? '#200f0f' : '#fee2e2', label: 'Actividade vencida' },
                  sla_breach:       { color: '#b45309', bg: isDark ? '#231508' : '#fef3c7', label: 'SLA em risco'      },
                  meeting_invite:   { color: '#1d4ed8', bg: isDark ? '#0f1c40' : '#eff6ff', label: 'Convite reunião'   },
                }
                const IconMap: Record<NotificationType, typeof Bell> = {
                  new_deal: Bell, overdue_activity: AlertTriangle,
                  sla_breach: Clock, meeting_invite: Bell,
                }
                const { color, bg: ibg, label } = cfgMap[n.type] ?? cfgMap.new_deal
                const Icon = IconMap[n.type] ?? Bell
                return (
                  <button key={n.id} type="button"
                    onClick={() => { markRead(n.id); navigate(`/deal/${n.dealId}`); onClose() }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      width: '100%', padding: '10px 16px', textAlign: 'left',
                      backgroundColor: n.read ? 'transparent' : (isDark ? '#181816' : '#f8f7f4'),
                      border: 'none', cursor: 'pointer',
                      borderBottom: `1px solid ${border}`, transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.read ? 'transparent' : (isDark ? '#181816' : '#f8f7f4'))}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: ibg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon style={{ width: '12px', height: '12px', color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: n.read ? 400 : 600, color: text, lineHeight: 1.3 }}>{label}</p>
                      <p style={{ fontSize: '12px', color: muted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.dealName}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: muted }}>{fmtTime(n.createdAt)}</span>
                      {!n.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />}
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {dealNotifs.length === 0 && teamNotifs.length === 0 && (
            <div style={{ padding: '36px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: muted }}>Nenhuma notificação</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function UserMenu({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const profile  = useAuthStore((s) => s.profile)
  const signOut  = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

  const bg     = isDark ? '#141412' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#eaecf0'
  const text   = isDark ? '#e8e4dc' : '#101828'
  const muted  = isDark ? '#667085' : '#667085'
  const hover  = isDark ? '#1c1c1a' : '#f3f4f6'

  const displayName     = profile?.full_name || 'Utilizador'
  const displayEmail    = profile?.email || '—'
  const displayRole     = profile?.is_admin ? 'Admin' : 'Membro'
  const displayColor    = profile?.avatar_color ?? '#b91c22'
  const displayInitials = displayName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onClose} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        width: '232px',
        backgroundColor: bg, border: `1px solid ${border}`,
        borderRadius: '12px', zIndex: 50,
        boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.60)' : '0 12px 32px rgba(16,24,40,0.12)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: displayColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
            }}>
              {displayInitials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                {displayName}
              </p>
              <p style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayEmail}
              </p>
            </div>
          </div>
          <span style={{
            display: 'inline-block', marginTop: '10px',
            fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#b91c22',
            backgroundColor: isDark ? 'rgba(185,28,34,0.12)' : 'rgba(185,28,34,0.07)',
            borderRadius: '4px', padding: '2px 8px',
          }}>
            {displayRole}
          </span>
        </div>

        <div style={{ padding: '6px' }}>
          <button type="button"
            onClick={() => { navigate('/settings'); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '8px 10px', borderRadius: '7px',
              backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 400, color: text, letterSpacing: '-0.01em',
              transition: 'background-color 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Settings style={{ width: '14px', height: '14px', color: muted, flexShrink: 0 }} />
            Configurações
          </button>

          <div style={{ height: '1px', backgroundColor: border, margin: '4px 0' }} />

          <button type="button"
            onClick={() => { signOut(); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '8px 10px', borderRadius: '7px',
              backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 400, color: '#b91c22', letterSpacing: '-0.01em',
              transition: 'background-color 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <LogOut style={{ width: '14px', height: '14px', flexShrink: 0 }} />
            Sair
          </button>
        </div>
      </div>
    </>
  )
}

export function Header({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const { isDark, toggle } = useThemeStore()
  const profile      = useAuthStore((s) => s.profile)
  const notifications     = useNotificationStore((s) => s.notifications)
  const { notifications: teamNotifs, readIds: teamReadIds } = useTeamNotificationStore()

  const [showNotif, setShowNotif] = useState(false)
  const [showUser,  setShowUser]  = useState(false)

  const notifRef = useRef<HTMLDivElement>(null)
  const userRef  = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length
    + teamNotifs.filter((n) => !teamReadIds.has(n.id)).length

  const displayColor    = profile?.avatar_color ?? '#b91c22'
  const displayName     = profile?.full_name || 'Utilizador'
  const displayInitials = displayName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()

  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const bg          = isDark ? 'var(--surface-base)' : 'var(--surface-base)'

  return (
    <header style={{
      display: 'flex', alignItems: 'center',
      backgroundColor: bg,
      height: '52px', flexShrink: 0,
      padding: '0 20px',
      borderBottom: `1px solid ${borderColor}`,
      position: 'relative',
    }}>
      {/* Left spacer */}
      <div style={{ flex: 1 }} />

      {/* Search — centrado */}
      <button
        type="button"
        onClick={onOpenSearch}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          height: '34px', width: '400px',
          padding: '0 12px',
          backgroundColor: isDark ? '#141412' : '#f2f1ee',
          border: `1px solid ${borderColor}`,
          borderRadius: '8px', cursor: 'text',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = borderColor
        }}
      >
        <Search style={{ width: '13px', height: '13px', color: isDark ? '#3a3834' : '#a8a39c', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '13px', color: isDark ? '#3a3834' : '#a8a39c', fontWeight: 400, letterSpacing: '-0.01em' }}>
          Buscar leads, clientes, comandos...
        </span>
        <kbd style={{
          fontSize: '10px', fontWeight: 500,
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          color: isDark ? '#2e2c29' : '#c4bfb8',
          backgroundColor: isDark ? '#1c1c1a' : '#e8e5e0',
          border: `1px solid ${isDark ? '#2a2a26' : '#d4d0ca'}`,
          borderRadius: '4px', padding: '2px 6px', whiteSpace: 'nowrap',
        }}>⌘K</kbd>
      </button>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Dark/light toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
          style={{
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: 'transparent',
            color: isDark ? '#6b6760' : '#8a857d',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#1a1a18' : '#f2f1ee'; e.currentTarget.style.color = isDark ? '#e8e4dc' : '#111110' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = isDark ? '#6b6760' : '#8a857d' }}
        >
          {isDark ? <Sun style={{ width: '15px', height: '15px' }} /> : <Moon style={{ width: '15px', height: '15px' }} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Notificações"
            onClick={() => { setShowNotif((v) => !v); setShowUser(false) }}
            style={{
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: showNotif ? (isDark ? '#1a1a18' : '#f2f1ee') : 'transparent',
              color: isDark ? '#6b6760' : '#8a857d',
              position: 'relative',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#1a1a18' : '#f2f1ee'; e.currentTarget.style.color = isDark ? '#e8e4dc' : '#111110' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = showNotif ? (isDark ? '#1a1a18' : '#f2f1ee') : 'transparent'; e.currentTarget.style.color = isDark ? '#6b6760' : '#8a857d' }}
          >
            <Bell style={{ width: '15px', height: '15px' }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '5px', right: '5px',
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: '#b91c22',
                border: `1.5px solid ${isDark ? '#0a0a08' : '#f7f6f3'}`,
              }} />
            )}
          </button>
          {showNotif && (
            <NotificationPanel isDark={isDark} onClose={() => setShowNotif(false)} />
          )}
        </div>

        {/* User avatar */}
        <div ref={userRef} style={{ position: 'relative', marginLeft: '4px' }}>
          <button
            type="button"
            onClick={() => { setShowUser((v) => !v); setShowNotif(false) }}
            style={{
              width: '30px', height: '30px', borderRadius: '7px',
              backgroundColor: displayColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '10px', fontWeight: 700,
              border: 'none', cursor: 'pointer',
              outline: showUser ? `2px solid ${displayColor}` : 'none',
              outlineOffset: '2px',
              transition: 'opacity 0.15s ease, outline 0.15s ease',
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
