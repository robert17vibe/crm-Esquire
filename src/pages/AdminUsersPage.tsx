import { useState, useEffect, useRef } from 'react'
import { Shield, Users, Search, Plus, X, ChevronDown, UserX, RotateCcw, Mail } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useTeamStore } from '@/store/useTeamStore'
import { supabase } from '@/lib/supabase'

interface UserRow {
  id: string
  full_name: string | null
  email: string
  role: 'admin' | 'user'
  is_admin: boolean
  avatar_color: string
  team_id: string | null
  disabled_at: string | null
  invited_at: string | null
}

const AVATAR_COLORS = [
  '#2c5545','#1d4ed8','#7c3aed','#b45309','#be185d',
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
  const [role,     setRole]     = useState<'admin' | 'user'>('user')
  const [teamId,   setTeamId]   = useState('')
  const [color,    setColor]    = useState(AVATAR_COLORS[0])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleCreate() {
    if (!email.trim()) { setError('Email obrigatório'); return }
    setSaving(true); setError('')
    try {
      // Create auth user via admin API through edge function (or direct if service role available)
      // For MVP: insert profile directly and send magic link
      const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!'
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: name.trim() || email.split('@')[0] },
      })
      if (authErr) throw authErr
      if (authData.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: email.trim(),
          full_name: name.trim() || email.split('@')[0],
          role,
          is_admin: role === 'admin',
          avatar_color: color,
          team_id: teamId || null,
          invited_at: new Date().toISOString(),
        })
      }
      onCreated()
      onClose()
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
              <Plus style={{ width: '16px', height: '16px', color: '#2c5545' }} />
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
              <p style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${border}`, display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, height: '38px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleCreate} disabled={saving} style={{ flex: 2, height: '38px', borderRadius: '8px', border: 'none', backgroundColor: '#2c5545', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
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

  const [users,     setUsers]     = useState<UserRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [saving,    setSaving]    = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [openMenu,  setOpenMenu]  = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const bg      = isDark ? '#0d0c0a' : '#f5f4f0'
  const cardBg  = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f8f7f4'
  const rowHov  = isDark ? '#1a1916' : '#f8f7f4'

  useEffect(() => { loadUsers() }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_admin, avatar_color, team_id, disabled_at, invited_at')
      .order('full_name')
    setUsers((data ?? []) as UserRow[])
    setLoading(false)
  }

  async function toggleAdmin(user: UserRow) {
    setSaving(user.id)
    const newAdmin = !user.is_admin
    await supabase.from('profiles').update({ is_admin: newAdmin, role: newAdmin ? 'admin' : 'user' }).eq('id', user.id)
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_admin: newAdmin, role: newAdmin ? 'admin' : 'user' } : u))
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
    setOpenMenu(null)
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return !q || (u.full_name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const activeCount   = users.filter((u) => !u.disabled_at).length
  const disabledCount = users.filter((u) => u.disabled_at).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: bg }}>

      {/* Header */}
      <div style={{ height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: `1px solid ${border}`, backgroundColor: cardBg, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield style={{ width: '16px', height: '16px', color: '#2c5545' }} />
          <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>Gestão de Utilizadores</p>
          <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#2c5545', backgroundColor: isDark ? '#1a2e24' : '#dcfce7', padding: '2px 7px', borderRadius: '999px' }}>{activeCount} ativos</span>
            {disabledCount > 0 && <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', backgroundColor: isDark ? '#2d1515' : '#fee2e2', padding: '2px 7px', borderRadius: '999px' }}>{disabledCount} suspensos</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: muted, pointerEvents: 'none' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..."
              style={{ height: '32px', paddingLeft: '28px', paddingRight: '10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', width: '200px' }} />
          </div>
          <button type="button" onClick={() => setShowInvite(true)} style={{
            height: '32px', padding: '0 14px', borderRadius: '8px', border: 'none',
            backgroundColor: '#2c5545', color: '#fff', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Plus style={{ width: '13px', height: '13px' }} />
            Novo Utilizador
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <p style={{ fontSize: '13px', color: muted, textAlign: 'center', paddingTop: '40px' }}>A carregar...</p>
        ) : (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden' }}>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 150px 100px 48px', padding: '10px 18px', borderBottom: `1px solid ${border}`, backgroundColor: isDark ? '#111110' : '#faf9f6' }}>
              {['Utilizador', 'Equipa', 'Role', 'Admin', ''].map((h) => (
                <p key={h} style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
              ))}
            </div>

            {filtered.map((user, i) => {
              const initials     = (user.full_name ?? user.email).split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?'
              const displayName  = user.full_name || user.email.split('@')[0]
              const isDisabled   = !!user.disabled_at
              const isMenuOpen   = openMenu === user.id

              return (
                <div
                  key={user.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 180px 150px 100px 48px',
                    padding: '12px 18px',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none',
                    alignItems: 'center',
                    opacity: isDisabled ? 0.5 : 1,
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = rowHov)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* User info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: user.avatar_color || '#2c5545', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                        {isDisabled && <span style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444', backgroundColor: isDark ? '#2d1515' : '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>SUSPENSO</span>}
                        {user.invited_at && !isDisabled && <span style={{ fontSize: '9px', fontWeight: 700, color: '#b45309', backgroundColor: isDark ? '#2d2010' : '#fef3c7', padding: '1px 5px', borderRadius: '4px' }}>CONVIDADO</span>}
                      </div>
                      <p style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                    </div>
                  </div>

                  {/* Team */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={user.team_id ?? ''}
                      onChange={(e) => changeTeam(user.id, e.target.value)}
                      disabled={saving === user.id || isDisabled}
                      style={{ fontSize: '12px', fontWeight: 500, color: user.team_id ? text : muted, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '7px', padding: '5px 26px 5px 8px', cursor: 'pointer', outline: 'none', width: '100%', appearance: 'none' }}
                    >
                      <option value="">Sem equipa</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <ChevronDown style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '11px', height: '11px', color: muted, pointerEvents: 'none' }} />
                  </div>

                  {/* Role badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '10px', fontWeight: 700, padding: '4px 9px', borderRadius: '6px', width: 'fit-content',
                    backgroundColor: user.is_admin ? (isDark ? '#1a2e22' : '#dcfce7') : (isDark ? '#1a1a18' : '#f1f5f9'),
                    color: user.is_admin ? '#2d9e6b' : muted,
                  }}>
                    {user.is_admin
                      ? <><Shield style={{ width: '9px', height: '9px' }} />Admin</>
                      : <><Users style={{ width: '9px', height: '9px' }} />Utilizador</>}
                  </span>

                  {/* Toggle admin */}
                  <button type="button" onClick={() => toggleAdmin(user)} disabled={saving === user.id || isDisabled}
                    style={{
                      width: '36px', height: '20px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                      backgroundColor: user.is_admin ? '#2c5545' : (isDark ? '#2a2a28' : '#d1d5db'),
                      position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
                      opacity: (saving === user.id || isDisabled) ? 0.5 : 1,
                    }}>
                    <span style={{
                      position: 'absolute', top: '3px', left: user.is_admin ? '18px' : '3px',
                      width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>

                  {/* Actions menu */}
                  <div style={{ position: 'relative' }} ref={isMenuOpen ? menuRef : null}>
                    <button type="button" onClick={() => setOpenMenu(isMenuOpen ? null : user.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '4px 6px', borderRadius: '6px', fontSize: '16px', lineHeight: 1 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = text)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = muted)}>
                      ···
                    </button>
                    {isMenuOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: '4px', zIndex: 50,
                        backgroundColor: isDark ? '#1c1c1a' : '#ffffff', border: `1px solid ${border}`,
                        borderRadius: '10px', padding: '4px', minWidth: '160px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      }}>
                        <button type="button" onClick={() => toggleDisable(user)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '7px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: isDisabled ? '#2c5545' : '#ef4444', textAlign: 'left' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#252522' : '#f5f4f0')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          {isDisabled
                            ? <><RotateCcw style={{ width: '13px', height: '13px' }} />Reativar acesso</>
                            : <><UserX style={{ width: '13px', height: '13px' }} />Suspender acesso</>}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )
            })}

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
