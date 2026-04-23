import { useState, useEffect } from 'react'
import { Shield, Users, Search } from 'lucide-react'
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
}

export function AdminUsersPage() {
  const isDark = useThemeStore((s) => s.isDark)
  const teams  = useTeamStore((s) => s.teams)

  const [users, setUsers]       = useState<UserRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState<string | null>(null)

  const bg     = isDark ? '#0d0c0a' : '#f5f4f0'
  const cardBg = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f8f7f4'

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_admin, avatar_color, team_id')
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

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return !q || (u.full_name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: bg }}>

      {/* Header */}
      <div style={{ height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: `1px solid ${border}`, backgroundColor: cardBg, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield style={{ width: '16px', height: '16px', color: '#2c5545' }} />
          <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>Gestão de Utilizadores</p>
          <span style={{ fontSize: '11px', color: muted }}>— {users.length} registados</span>
        </div>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: muted, pointerEvents: 'none' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..."
            style={{ height: '32px', paddingLeft: '28px', paddingRight: '10px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', width: '200px' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <p style={{ fontSize: '13px', color: muted, textAlign: 'center', paddingTop: '40px' }}>A carregar...</p>
        ) : (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden' }}>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 160px 100px', padding: '10px 18px', borderBottom: `1px solid ${border}`, backgroundColor: isDark ? '#111110' : '#faf9f6' }}>
              {['Utilizador', 'Grupo / Time', 'Role', 'Admin'].map((h) => (
                <p key={h} style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
              ))}
            </div>

            {filtered.map((user, i) => {
              const initials = (user.full_name ?? user.email).split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?'
              const displayName = user.full_name || user.email.split('@')[0]
              return (
                <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 160px 100px', padding: '12px 18px', borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none', alignItems: 'center' }}>

                  {/* User info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: user.avatar_color || '#2c5545', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                      <p style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                    </div>
                  </div>

                  {/* Team */}
                  <select
                    value={user.team_id ?? ''}
                    onChange={(e) => changeTeam(user.id, e.target.value)}
                    disabled={saving === user.id}
                    style={{ fontSize: '12px', fontWeight: 500, color: user.team_id ? text : muted, backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value="">Sem grupo</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>

                  {/* Role badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                    backgroundColor: user.is_admin ? (isDark ? '#1a2e22' : '#dcfce7') : (isDark ? '#1a1a18' : '#f1f5f9'),
                    color: user.is_admin ? '#2d9e6b' : muted,
                  }}>
                    {user.is_admin ? <><Shield style={{ width: '9px', height: '9px' }} />Admin</> : <><Users style={{ width: '9px', height: '9px' }} />Utilizador</>}
                  </span>

                  {/* Toggle admin */}
                  <button type="button" onClick={() => toggleAdmin(user)} disabled={saving === user.id}
                    style={{
                      width: '36px', height: '20px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                      backgroundColor: user.is_admin ? '#2c5545' : (isDark ? '#2a2a28' : '#d1d5db'),
                      position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
                      opacity: saving === user.id ? 0.5 : 1,
                    }}>
                    <span style={{
                      position: 'absolute', top: '3px', left: user.is_admin ? '18px' : '3px',
                      width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>

                </div>
              )
            })}

            {filtered.length === 0 && (
              <p style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: muted }}>Nenhum utilizador encontrado</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
