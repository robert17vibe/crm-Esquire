import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Users, Search, Plus, X, Mail, ChevronDown } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useTeamStore } from '@/store/useTeamStore'
import { supabase } from '@/lib/supabase'
import { useImpersonationStore } from '@/store/useImpersonationStore'

interface UserRow {
  id: string
  full_name: string | null
  email: string
  is_admin: boolean
  avatar_color: string
  team_id: string | null
  disabled_at: string | null
  invited_at: string | null
}

const AVATAR_COLORS = [
  '#6b1212','#1d4ed8','#7c3aed','#b45309','#be185d',
  '#0e7490','#065f46','#92400e','#6b21a8','#9f1239',
]

function InviteDrawer({ isDark, teams, onClose, onCreated }: {
  isDark: boolean
  teams: { id: string; name: string }[]
  onClose: () => void
  onCreated: () => void
}) {
  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const inBg   = isDark ? '#111110' : '#f8f7f4'

  const [email,    setEmail]    = useState('')
  const [name,     setName]     = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [role,     setRole]     = useState<'admin' | 'user'>('user')
  const [teamId,   setTeamId]   = useState('')
  const [color,    setColor]    = useState(AVATAR_COLORS[0])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [copied,   setCopied]   = useState(false)

  function genPassword() {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$'
    const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setPassword(pwd)
    setCopied(false)
  }

  function copyPassword() {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleCreate() {
    if (!email.trim()) { setError('Email obrigatório'); return }
    if (!password.trim()) { setError('Password obrigatória'); return }
    if (password.length < 6) { setError('Password deve ter pelo menos 6 caracteres'); return }
    setSaving(true); setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-user', {
        body: {
          email: email.trim(),
          password: password.trim(),
          full_name: name.trim() || email.split('@')[0],
          is_admin: role === 'admin',
          avatar_color: color,
          team_id: teamId || null,
        },
      })
      if (fnErr) {
        const msg = fnErr.message ?? ''
        if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('not found') || msg.includes('404')) {
          throw new Error('Edge Function não deployada. Corre: supabase functions deploy create-user')
        }
        throw new Error(msg || 'Erro na Edge Function')
      }
      if (data?.error) throw new Error(data.error)
      onClose()
      setTimeout(() => onCreated(), 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar utilizador')
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
      <div style={{ position: 'relative', zIndex: 1, width: '400px', maxWidth: '95vw', backgroundColor: bg, borderLeft: `1px solid ${border}`, display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '-12px 0 48px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: isDark ? '#1a2e24' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus style={{ width: '16px', height: '16px', color: '#6b1212' }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>Novo Utilizador</p>
              <p style={{ fontSize: '11px', color: muted }}>Criar conta e acesso</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px', borderRadius: '6px' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Email *</label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: muted, pointerEvents: 'none' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" style={{ ...inp, paddingLeft: '32px' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Nome completo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana Beatriz Silva" style={inp} />
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Password *</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setCopied(false) }}
                  placeholder="Mínimo 6 caracteres"
                  style={{ ...inp, paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '11px', fontWeight: 600 }}>
                  {showPwd ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <button type="button" onClick={genPassword}
                style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Gerar
              </button>
              {password && (
                <button type="button" onClick={copyPassword}
                  style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${copied ? '#2a9a5a' : border}`, backgroundColor: copied ? 'rgba(42,154,90,0.1)' : 'transparent', color: copied ? '#2a9a5a' : muted, fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
                  {copied ? '✓ Copiada' : 'Copiar'}
                </button>
              )}
            </div>
            {password && (
              <p style={{ fontSize: '10px', color: muted, marginTop: '5px' }}>
                Partilha esta password com o utilizador após criar a conta.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')} style={{ ...inp, cursor: 'pointer' }}>
                <option value="user">Utilizador</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '7px' }}>Equipa</label>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">Sem equipa</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>Cor do avatar</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c, border: 'none', cursor: 'pointer',
                  outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px', transition: 'outline 0.1s',
                }} />
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: isDark ? '#2d1515' : '#fee2e2', border: `1px solid ${isDark ? '#5c2020' : '#fca5a5'}` }}>
              <p style={{ fontSize: '12px', color: '#b83535', fontWeight: 500 }}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${border}`, display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, height: '38px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleCreate} disabled={saving} style={{ flex: 2, height: '38px', borderRadius: '8px', border: 'none', backgroundColor: '#6b1212', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'A criar...' : 'Criar Utilizador'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminUsersPage() {
  const isDark = useThemeStore((s) => s.isDark)
  const teams  = useTeamStore((s) => s.teams)
  const navigate = useNavigate()
  const startImpersonation = useImpersonationStore((s) => s.startImpersonation)
  const impersonatedId     = useImpersonationStore((s) => s.impersonatedId)

  const [users,      setUsers]      = useState<UserRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [saving,     setSaving]     = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [hoverVer,   setHoverVer]   = useState<string | null>(null)
  const [sortCol,    setSortCol]    = useState<'name' | 'role'>('name')
  const [sortAsc,    setSortAsc]    = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const bg      = isDark ? '#0d0c0a' : '#f5f4f0'
  const cardBg  = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const rowHov  = isDark ? '#1a1916' : '#f8f7f4'

  useEffect(() => { loadUsers() }, [])

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

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, is_admin, avatar_color, team_id, disabled_at, invited_at')
      .order('full_name')
    if (error) {
      // email column may not exist yet — fallback without it
      const { data: fallback } = await supabase
        .from('profiles')
        .select('id, full_name, is_admin, avatar_color, team_id, disabled_at, invited_at')
        .order('full_name')
      setUsers((fallback ?? []).map((u) => ({ email: '', ...u })) as UserRow[])
    } else {
      setUsers((data ?? []) as UserRow[])
    }
    setLoading(false)
  }

  async function toggleAdmin(user: UserRow) {
    setSaving(user.id)
    const newAdmin = !user.is_admin
    await supabase.from('profiles').update({ is_admin: newAdmin }).eq('id', user.id)
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_admin: newAdmin } : u))
    setSaving(null)
  }

  async function changeTeam(userId: string, teamId: string) {
    setSaving(userId)
    await supabase.from('profiles').update({ team_id: teamId || null }).eq('id', userId)
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, team_id: teamId || null } : u))
    setSaving(null)
  }

  async function toggleDisable(user: UserRow) {
    setSaving(user.id)
    const disabled_at = user.disabled_at ? null : new Date().toISOString()
    await supabase.from('profiles').update({ disabled_at }).eq('id', user.id)
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, disabled_at } : u))
    setSaving(null)
  }

  const filtered = users
    .filter((u) => {
      const q = search.toLowerCase()
      const teamName = teams.find((t) => t.id === u.team_id)?.name ?? ''
      return !q || (u.full_name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || teamName.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortCol === 'name') cmp = (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email)
      if (sortCol === 'role') cmp = Number(b.is_admin) - Number(a.is_admin)
      return sortAsc ? cmp : -cmp
    })

  const activeCount   = users.filter((u) => !u.disabled_at).length
  const disabledCount = users.filter((u) => u.disabled_at).length

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
            <Shield size={18} color={text} />
            <p style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>Gestão de Utilizadores</p>
            <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b1212', backgroundColor: isDark ? '#2d1515' : '#fef2f2', padding: '2px 8px', borderRadius: '999px' }}>{activeCount} ativos</span>
              {disabledCount > 0 && <span style={{ fontSize: '10px', fontWeight: 700, color: '#a03030', backgroundColor: isDark ? '#2d1515' : '#fde8e8', padding: '2px 8px', borderRadius: '999px' }}>{disabledCount} suspensos</span>}
            </div>
          </div>
          <p style={{ fontSize: '13px', color: muted, margin: 0 }}>Contas, permissões e grupos da organização</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: muted, pointerEvents: 'none' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..."
              style={{ height: '34px', paddingLeft: '28px', paddingRight: '10px', fontSize: '12px', backgroundColor: isDark ? '#1a1a18' : '#f5f4f0', border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', width: '200px' }} />
          </div>
          <button type="button" onClick={() => setShowInvite(true)} style={{
            height: '34px', padding: '0 16px', borderRadius: '8px', border: 'none',
            backgroundColor: '#6b1212', color: '#fff', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Plus style={{ width: '13px', height: '13px' }} />
            Novo Utilizador
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>
        {loading ? (
          <p style={{ fontSize: '13px', color: muted, textAlign: 'center', paddingTop: '40px' }}>A carregar...</p>
        ) : (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: isDark ? 'none' : '0 1px 4px rgba(16,24,40,0.06)' }}>

            {/* Table header */}
            {(() => {
              const COL = '1fr 130px 200px 120px'
              function SortBtn({ col, label }: { col: 'name' | 'role'; label: string }) {
                const active = sortCol === col
                return (
                  <button
                    type="button"
                    onClick={() => { if (active) setSortAsc((v) => !v); else { setSortCol(col); setSortAsc(true) } }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontSize: '10px', fontWeight: 700, color: active ? text : muted,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}
                  >
                    {label}
                    <span style={{ fontSize: '8px', opacity: active ? 1 : 0.3 }}>{active ? (sortAsc ? '▲' : '▼') : '↕'}</span>
                  </button>
                )
              }
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '10px 20px', borderBottom: `1px solid ${border}`, backgroundColor: isDark ? '#111110' : '#faf9f6', alignItems: 'center' }}>
                    <SortBtn col="name" label="Utilizador" />
                    <SortBtn col="role" label="Cargo" />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Grupo</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>Ações</span>
                  </div>

                  {filtered.map((user, i) => {
                    const initials    = (user.full_name ?? user.email).split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?'
                    const displayName = user.full_name || user.email.split('@')[0]
                    const isDisabled  = !!user.disabled_at
                    const isActive    = impersonatedId === user.id
                    const isHovered   = hoverVer === user.id
                    const teamName    = teams.find((t) => t.id === user.team_id)?.name

                    return (
                      <div
                        key={user.id}
                        style={{
                          display: 'grid', gridTemplateColumns: COL,
                          padding: '12px 20px',
                          borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none',
                          alignItems: 'center',
                          opacity: isDisabled ? 0.5 : 1,
                          transition: 'background-color 0.1s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = rowHov)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Utilizador */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            backgroundColor: user.avatar_color || '#6b1212',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '11px', fontWeight: 800, flexShrink: 0,
                            boxShadow: `0 2px 8px ${user.avatar_color ?? '#6b1212'}40`,
                          }}>
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{displayName}</p>
                              {isDisabled && <span style={{ fontSize: '8px', fontWeight: 800, color: '#a03030', backgroundColor: isDark ? '#2d1515' : '#fde8e8', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, letterSpacing: '0.06em' }}>SUSPENSO</span>}
                            </div>
                            <p style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>{user.email}</p>
                          </div>
                        </div>

                        {/* Cargo */}
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleAdmin(user)}
                            disabled={saving === user.id || isDisabled}
                            title={user.is_admin ? 'Clique para remover admin' : 'Clique para tornar admin'}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              fontSize: '10px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px',
                              border: `1px solid ${user.is_admin ? 'rgba(227,30,36,0.30)' : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)')}`,
                              backgroundColor: user.is_admin
                                ? (isDark ? 'rgba(227,30,36,0.12)' : 'rgba(227,30,36,0.08)')
                                : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                              color: user.is_admin ? '#6b1212' : muted,
                              cursor: isDisabled ? 'default' : 'pointer',
                              letterSpacing: '0.04em', transition: 'all 0.15s',
                              opacity: (saving === user.id || isDisabled) ? 0.5 : 1,
                            }}
                          >
                            {user.is_admin
                              ? <><Shield style={{ width: '10px', height: '10px' }} /> Admin</>
                              : <><Users style={{ width: '10px', height: '10px' }} /> Membro</>
                            }
                          </button>
                        </div>

                        {/* Grupo / Equipa */}
                        <div style={{ position: 'relative', maxWidth: '180px' }}>
                          <select
                            value={user.team_id ?? ''}
                            onChange={(e) => changeTeam(user.id, e.target.value)}
                            disabled={saving === user.id || isDisabled}
                            style={{
                              fontSize: '11px', fontWeight: 500,
                              color: teamName ? text : muted,
                              backgroundColor: teamName
                                ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                                : 'transparent',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                              borderRadius: '8px', padding: '5px 24px 5px 10px',
                              cursor: isDisabled ? 'default' : 'pointer',
                              outline: 'none', width: '100%', appearance: 'none', transition: 'all 0.15s',
                            }}
                          >
                            <option value="">— Sem grupo</option>
                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <ChevronDown style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', width: '10px', height: '10px', color: muted, pointerEvents: 'none' }} />
                        </div>

                        {/* Ações */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>

                          <button type="button" onClick={() => toggleDisable(user)} disabled={saving === user.id}
                            title={isDisabled ? 'Reativar acesso' : 'Suspender acesso'}
                            style={{
                              width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              border: `1px solid ${isDisabled ? 'rgba(239,68,68,0.30)' : (isDark ? 'rgba(255,255,255,0.08)' : '#eaecf0')}`,
                              backgroundColor: isDisabled
                                ? (isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.07)')
                                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
                            {isDisabled
                              ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="#b83535" strokeWidth="2.2" strokeLinecap="round" /></svg>
                              : <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 8l4.5 4.5L14 4" stroke={muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            }
                          </button>

                          {!isDisabled && (
                            <button
                              type="button"
                              onClick={() => { startImpersonation(user.id, user.full_name || user.email.split('@')[0]); navigate('/pipeline') }}
                              onMouseEnter={() => setHoverVer(user.id)}
                              onMouseLeave={() => setHoverVer(null)}
                              title="Ver perspectiva deste utilizador"
                              style={{
                                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                                backgroundColor: isActive ? '#16a34a' : (isHovered ? (isDark ? 'rgba(22,163,74,0.12)' : 'rgba(22,163,74,0.08)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')),
                                border: `1px solid ${isActive ? '#15803d' : (isHovered ? 'rgba(22,163,74,0.40)' : (isDark ? 'rgba(255,255,255,0.08)' : '#eaecf0'))}`,
                                transition: 'all 0.18s ease', flexShrink: 0, overflow: 'hidden',
                              }}
                            >
                              <svg
                                width="18" height="18" viewBox="0 0 40 40" fill="none"
                                style={{ transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', transform: (isHovered || isActive) ? 'scale(2.0) translateY(2px)' : 'scale(1)' }}
                              >
                                <rect x="4" y="6" width="32" height="22" rx="3" stroke={isActive ? '#fff' : (isHovered ? '#16a34a' : muted)} strokeWidth="1.8" />
                                <rect x="7" y="9" width="26" height="16" rx="1.5" fill={isActive ? 'rgba(255,255,255,0.12)' : (isHovered ? 'rgba(22,163,74,0.12)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')} />
                                <rect x="10" y="12" width="14" height="1.5" rx="0.75" fill={isActive ? '#fff' : (isHovered ? '#16a34a' : muted)} />
                                <rect x="10" y="15.5" width="10" height="1.5" rx="0.75" fill={isActive ? '#fff' : (isHovered ? '#16a34a' : muted)} />
                                <rect x="10" y="19" width="16" height="1.5" rx="0.75" fill={isActive ? '#fff' : (isHovered ? '#16a34a' : muted)} />
                                <path d="M17 28v4M23 28v4M14 32h12" stroke={isActive ? '#fff' : (isHovered ? '#16a34a' : muted)} strokeWidth="1.8" strokeLinecap="round" />
                              </svg>
                            </button>
                          )}
                        </div>

                      </div>
                    )
                  })}
                </>
              )
            })()}

            {filtered.length === 0 && (
              <p style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: muted }}>Nenhum utilizador encontrado</p>
            )}
          </div>
        )}
      </div>

      {showInvite && (
        <InviteDrawer
          isDark={isDark}
          teams={teams}
          onClose={() => setShowInvite(false)}
          onCreated={loadUsers}
        />
      )}
    </div>
  )
}
