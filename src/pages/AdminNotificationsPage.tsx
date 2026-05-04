import { useState, useEffect, useRef } from 'react'
import { Bell, Plus, X, Megaphone, AlertTriangle, Info, Zap, Pencil, Clock, Users, Trash2 } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useTeamNotificationStore, type NotifType } from '@/store/useTeamNotificationStore'

const TYPE_CFG: Record<NotifType, { label: string; color: string; bg: string; bgDark: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }> = {
  info:         { label: 'Informação',  color: '#2563eb', bg: '#eff6ff', bgDark: '#1e2d4a', icon: Info         },
  announcement: { label: 'Aviso',       color: '#6b1212', bg: '#fdf0f0', bgDark: '#2a1010', icon: Megaphone    },
  warning:      { label: 'Atenção',     color: '#b45309', bg: '#fffbeb', bgDark: '#2d2010', icon: AlertTriangle },
  urgent:       { label: 'Urgente',     color: '#b83535', bg: '#fef2f2', bgDark: '#2d1515', icon: Zap          },
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)    return 'agora'
  if (diff < 60)   return `${diff}m atrás`
  if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`
  return `${Math.floor(diff / 1440)}d atrás`
}

function CreateDrawer({ isDark, teams, onClose }: {
  isDark: boolean
  teams: { id: string; name: string }[]
  onClose: () => void
}) {
  const createNotif = useTeamNotificationStore((s) => s.create)

  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const inBg   = isDark ? '#111110' : '#f8f7f4'

  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [type,    setType]    = useState<NotifType>('announcement')
  const [teamId,  setTeamId]  = useState('')
  const [expires, setExpires] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleCreate() {
    if (!title.trim()) return
    setSaving(true)
    setError('')
    try {
      await createNotif({
        title: title.trim(),
        body: body.trim() || undefined,
        type,
        team_id: teamId || null,
        expires_at: expires ? new Date(expires).toISOString() : null,
      })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar notificação')
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    height: '38px', padding: '0 12px', fontSize: '13px', fontWeight: 500,
    backgroundColor: inBg, border: `1px solid ${border}`, borderRadius: '8px',
    color: text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, width: '420px', maxWidth: '95vw', backgroundColor: bg, borderLeft: `1px solid ${border}`, display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '-12px 0 48px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: isDark ? '#2a1010' : '#fde8e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell style={{ width: '16px', height: '16px', color: '#6b1212' }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>Nova Notificação</p>
              <p style={{ fontSize: '11px', color: muted }}>Enviar para a equipa</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px', borderRadius: '6px' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Type selector */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>Tipo</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {(Object.entries(TYPE_CFG) as [NotifType, typeof TYPE_CFG[NotifType]][]).map(([key, cfg]) => {
                const Icon = cfg.icon
                const active = type === key
                return (
                  <button key={key} type="button" onClick={() => setType(key)} style={{
                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                    backgroundColor: active ? (isDark ? cfg.bgDark : cfg.bg) : (isDark ? '#1a1a18' : '#f8f7f4'),
                    border: `1.5px solid ${active ? cfg.color : (isDark ? '#2a2a28' : '#e4e0da')}`,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <Icon style={{ width: '14px', height: '14px', color: active ? cfg.color : muted, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: active ? cfg.color : muted }}>{cfg.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Título *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Meta Q2 atualizada para R$800k" style={inp} />
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Mensagem (opcional)</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Detalhes adicionais..." rows={3}
              style={{ ...inp, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Destinatário</label>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">Toda a equipa</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Expira em</label>
              <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} style={{ ...inp, colorScheme: isDark ? 'dark' : 'light' }} />
            </div>
          </div>

          {/* Preview */}
          {title && (
            <div style={{ borderRadius: '12px', padding: '14px 16px', backgroundColor: isDark ? TYPE_CFG[type].bgDark : TYPE_CFG[type].bg, border: `1px solid ${TYPE_CFG[type].color}30` }}>
              <p style={{ fontSize: '9px', fontWeight: 700, color: TYPE_CFG[type].color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Pré-visualização</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TYPE_CFG[type].color }}>{title}</p>
              {body && <p style={{ fontSize: '12px', color: text, marginTop: '4px', lineHeight: 1.5 }}>{body}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {error && (
            <div style={{ fontSize: '11px', color: '#b83535', backgroundColor: isDark ? '#2d1515' : '#fff5f5', border: '1px solid #e8b0b0', borderRadius: '6px', padding: '8px 12px', maxHeight: '56px', overflowY: 'auto', lineHeight: 1.5 }}>
              {error.includes('ainda não foi criada')
                ? 'Tabela não encontrada. Aplica a migração SQL no Supabase Studio antes de enviar.'
                : error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: '38px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="button" onClick={handleCreate} disabled={saving || !title.trim()} style={{ flex: 2, height: '38px', borderRadius: '8px', border: 'none', backgroundColor: TYPE_CFG[type].color, color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: (saving || !title.trim()) ? 0.6 : 1 }}>
              {saving ? 'A enviar...' : 'Enviar Notificação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditDrawer({ isDark, teams, notif, onClose }: {
  isDark: boolean
  teams: { id: string; name: string }[]
  notif: import('@/store/useTeamNotificationStore').TeamNotification
  onClose: () => void
}) {
  const update = useTeamNotificationStore((s) => s.update)

  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const inBg   = isDark ? '#111110' : '#f8f7f4'

  const [title,   setTitle]   = useState(notif.title)
  const [body,    setBody]    = useState(notif.body ?? '')
  const [teamId,  setTeamId]  = useState(notif.team_id ?? '')
  const [expires, setExpires] = useState(notif.expires_at ? notif.expires_at.slice(0, 10) : '')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await update(notif.id, {
      title: title.trim(),
      body: body.trim() || null,
      team_id: teamId || null,
      expires_at: expires ? new Date(expires).toISOString() : null,
    })
    setSaving(false)
    onClose()
  }

  const inp: React.CSSProperties = {
    height: '38px', padding: '0 12px', fontSize: '13px', fontWeight: 500,
    backgroundColor: inBg, border: `1px solid ${border}`, borderRadius: '8px',
    color: text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const cfg = TYPE_CFG[notif.type]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, width: '420px', maxWidth: '95vw', backgroundColor: bg, borderLeft: `1px solid ${border}`, display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '-12px 0 48px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: isDark ? cfg.bgDark : cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil style={{ width: '15px', height: '15px', color: cfg.color }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>Editar Comunicado</p>
              <p style={{ fontSize: '11px', color: muted }}>Alterar mensagem, prazo e destinatário</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px', borderRadius: '6px' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Título *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Mensagem</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
              style={{ ...inp, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Grupo destinatário</label>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">Toda a equipa</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Expira em</label>
              <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} style={{ ...inp, colorScheme: isDark ? 'dark' : 'light' }} />
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${border}`, display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, height: '38px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !title.trim()} style={{ flex: 2, height: '38px', borderRadius: '8px', border: 'none', backgroundColor: cfg.color, color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: (saving || !title.trim()) ? 0.6 : 1 }}>
            {saving ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminNotificationsPage() {
  const isDark       = useThemeStore((s) => s.isDark)
  const teams        = useTeamStore((s) => s.teams)
  const notifications = useTeamNotificationStore((s) => s.notifications)
  const archive      = useTeamNotificationStore((s) => s.archive)
  const isLoading    = useTeamNotificationStore((s) => s.isLoading)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editNotif, setEditNotif] = useState<import('@/store/useTeamNotificationStore').TeamNotification | null>(null)
  const [filter, setFilter] = useState<NotifType | 'all'>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')

  const bg      = isDark ? '#0d0c0a' : '#f5f4f0'
  const cardBg  = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'


  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width  = canvas.offsetWidth
    const H = canvas.height = canvas.offsetHeight
    const cols = Math.floor(W / 14)
    const drops = Array.from({ length: cols }, () => Math.random() * -H / 14)
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01アBCDE#%&'
    let raf: number
    function draw() {
      ctx!.fillStyle = isDark ? 'rgba(13,12,10,0.18)' : 'rgba(245,244,240,0.18)'
      ctx!.fillRect(0, 0, W, H)
      ctx!.font = '11px monospace'
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)]
        const y = drops[i] * 14
        const bright = Math.random() > 0.9
        ctx!.fillStyle = isDark
          ? (bright ? '#fff7ed' : (Math.random() > 0.5 ? '#f97316' : '#ea580c'))
          : (bright ? '#7c2d12' : (Math.random() > 0.5 ? '#c2410c' : '#9b2020'))
        ctx!.fillText(ch, i * 14, y)
        if (y > H && Math.random() > 0.975) drops[i] = 0
        drops[i] += 0.4
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [isDark])

  const filtered = notifications
    .filter((n) => filter === 'all' || n.type === filter)
    .filter((n) => teamFilter === 'all'
      ? true
      : teamFilter === 'global' ? n.team_id == null : n.team_id === teamFilter
    )

  const teamName = (id: string | null | undefined) => teams.find((t) => t.id === id)?.name ?? 'Toda a equipa'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: bg }}>

      {/* Header */}
      <div style={{
        position: 'relative', height: '96px', minHeight: '96px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 28px 18px', borderBottom: `1px solid ${border}`,
        backgroundColor: isDark ? '#0a0a08' : '#ffffff', flexShrink: 0, overflow: 'hidden',
      }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: isDark ? 0.35 : 0.2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: isDark ? 'linear-gradient(to bottom, transparent 40%, rgba(10,10,8,0.85) 100%)' : 'linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.88) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <Bell size={18} color={text} />
            <p style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>Notificações</p>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b1212', backgroundColor: isDark ? '#2d1515' : '#fef2f2', padding: '2px 8px', borderRadius: '999px' }}>
              {notifications.length} ativas
            </span>
          </div>
          <p style={{ fontSize: '13px', color: muted, margin: 0 }}>Comunicados e alertas para as equipas</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            style={{ height: '34px', padding: '0 10px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: isDark ? '#1a1a18' : '#f5f4f0', color: text, fontSize: '12px', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">Todos os grupos</option>
            <option value="global">Global (sem grupo)</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" onClick={() => setShowCreate(true)} style={{
            height: '34px', padding: '0 16px', borderRadius: '8px', border: 'none',
            backgroundColor: '#6b1212', color: '#fff', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Plus style={{ width: '13px', height: '13px' }} />
            Nova Notificação
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '14px 24px 0', backgroundColor: cardBg, borderBottom: `1px solid ${border}`, display: 'flex', gap: '4px' }}>
        {(['all', ...Object.keys(TYPE_CFG)] as (NotifType | 'all')[]).map((key) => {
          const active = filter === key
          const cfg    = key === 'all' ? null : TYPE_CFG[key as NotifType]
          const count  = key === 'all' ? notifications.length : notifications.filter((n) => n.type === key).length
          return (
            <button key={key} type="button" onClick={() => setFilter(key)} style={{
              padding: '6px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: active ? 700 : 500,
              backgroundColor: active ? bg : 'transparent',
              color: active ? (cfg ? cfg.color : text) : muted,
              borderBottom: active ? `2px solid ${cfg ? cfg.color : '#6b1212'}` : '2px solid transparent',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              {key === 'all' ? 'Todas' : cfg!.label}
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: isDark ? '#1c1c1a' : '#f0ede8', padding: '1px 5px', borderRadius: '999px', color: muted }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {isLoading ? (
          <p style={{ fontSize: '13px', color: muted, textAlign: 'center', paddingTop: '40px' }}>A carregar...</p>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '80px', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: isDark ? '#1c1c1a' : '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell style={{ width: '20px', height: '20px', color: muted }} />
            </div>
            <p style={{ fontSize: '13px', color: muted, fontWeight: 500 }}>Nenhuma notificação ativa</p>
            <button type="button" onClick={() => setShowCreate(true)} style={{ fontSize: '12px', color: '#6b1212', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Criar primeira notificação →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((n) => {
              const cfg  = TYPE_CFG[n.type] ?? TYPE_CFG.info
              const Icon = cfg.icon
              return (
                <div key={n.id} style={{
                  backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '14px',
                  borderLeft: `4px solid ${cfg.color}`, overflow: 'hidden',
                  display: 'flex', alignItems: 'stretch',
                }}>
                  <div style={{ flex: 1, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: isDark ? cfg.bgDark : cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon style={{ width: '13px', height: '13px', color: cfg.color }} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cfg.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: muted }}>
                          <Users style={{ width: '10px', height: '10px' }} />
                          {teamName(n.team_id)}
                        </div>
                        <span style={{ color: muted, fontSize: '10px' }}>·</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: muted }}>
                          <Clock style={{ width: '10px', height: '10px' }} />
                          {timeAgo(n.created_at)}
                        </div>
                        {n.expires_at && (
                          <>
                            <span style={{ color: muted, fontSize: '10px' }}>·</span>
                            <span style={{ fontSize: '10px', color: '#b45309' }}>Expira {new Date(n.expires_at).toLocaleDateString('pt-BR')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: text, marginBottom: n.body ? '5px' : 0 }}>{n.title}</p>
                    {n.body && <p style={{ fontSize: '12px', color: muted, lineHeight: 1.6 }}>{n.body}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0 12px', borderLeft: `1px solid ${border}` }}>
                    <button type="button" onClick={() => setEditNotif(n)} title="Editar"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '6px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#252522' : '#f0ede8'; e.currentTarget.style.color = cfg.color }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = muted }}>
                      <Pencil style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button type="button" onClick={() => archive(n.id)} title="Arquivar"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '6px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#2d1515' : '#fef2f2'; e.currentTarget.style.color = '#b83535' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = muted }}>
                      <Trash2 style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDrawer isDark={isDark} teams={teams} onClose={() => setShowCreate(false)} />
      )}
      {editNotif && (
        <EditDrawer isDark={isDark} teams={teams} notif={editNotif} onClose={() => setEditNotif(null)} />
      )}
    </div>
  )
}
