import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Check, X, UserPlus, UserMinus, Users2 } from 'lucide-react'
import { useTeamStore } from '@/store/useTeamStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import type { Team, Owner } from '@/types/deal.types'
import { UserAvatarRow } from '@/components/ui/UserAvatar'

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({
  team, owners, dealCount, pipeline, isDark,
  onRename, onDelete, onToggleMember,
}: {
  team: Team
  owners: Owner[]
  dealCount: number
  pipeline: number
  isDark: boolean
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onToggleMember: (ownerId: string, teamId: string, isMember: boolean) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [draft, setDraft]             = useState(team.name)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const border     = isDark ? '#242424' : '#e4e0da'
  const cardBg     = isDark ? '#111110' : '#ffffff'
  const text       = isDark ? '#e8e4dc' : '#1a1814'
  const muted      = isDark ? '#5a5652' : '#8a857d'
  const hoverBg    = isDark ? '#1a1a18' : '#f5f4f0'
  const inputBg    = isDark ? '#0d0d0b' : '#f5f4f1'
  const memberBg   = isDark ? '#1c1c1a' : '#f0ede8'
  const nonMembers = owners.filter((o) => o.team_id !== team.id)
  const members    = owners.filter((o) => o.team_id === team.id)

  function fmtCompact(v: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
    }).format(v)
  }

  function saveName() {
    if (draft.trim() && draft.trim() !== team.name) onRename(team.id, draft.trim())
    setEditingName(false)
  }

  return (
    <div style={{
      backgroundColor: cardBg,
      border: `1px solid ${border}`,
      borderRadius: '12px',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') { setDraft(team.name); setEditingName(false) }
                }}
                style={{
                  flex: 1, height: '28px', padding: '0 8px', fontSize: '14px', fontWeight: 600,
                  backgroundColor: inputBg, border: `1px solid ${isDark ? '#3a3834' : '#c4bfb8'}`,
                  borderRadius: '6px', color: text, outline: 'none',
                }}
              />
              <button type="button" onClick={saveName}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#2c5545', border: 'none', cursor: 'pointer' }}>
                <Check style={{ width: '12px', height: '12px', color: '#fff' }} />
              </button>
              <button type="button" onClick={() => { setDraft(team.name); setEditingName(false) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', backgroundColor: 'transparent', border: `1px solid ${border}`, cursor: 'pointer' }}>
                <X style={{ width: '12px', height: '12px', color: muted }} />
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '15px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>
              {team.name}
            </p>
          )}
          <p style={{ fontSize: '11px', color: muted, marginTop: '3px' }}>
            {members.length} {members.length === 1 ? 'membro' : 'membros'}
            {dealCount > 0 && ` · ${dealCount} deal${dealCount > 1 ? 's' : ''} · ${fmtCompact(pipeline)}`}
          </p>
        </div>

        {/* Actions */}
        {!editingName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button type="button" onClick={() => { setDraft(team.name); setEditingName(true) }}
              title="Renomear"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'transparent', border: `1px solid ${border}`, cursor: 'pointer', color: muted }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Pencil style={{ width: '12px', height: '12px' }} />
            </button>
            {confirmDelete ? (
              <>
                <button type="button" onClick={() => onDelete(team.id)}
                  style={{ height: '28px', padding: '0 10px', fontSize: '11px', fontWeight: 600, backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Confirmar
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'transparent', border: `1px solid ${border}`, cursor: 'pointer', color: muted }}>
                  <X style={{ width: '12px', height: '12px' }} />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)}
                title="Excluir time"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'transparent', border: `1px solid ${border}`, cursor: 'pointer', color: muted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
              >
                <Trash2 style={{ width: '12px', height: '12px' }} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Members list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {members.length === 0 && (
          <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic', padding: '4px 0' }}>
            Nenhum membro ainda
          </p>
        )}
        {members.map((owner) => (
          <div key={owner.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '7px 10px', borderRadius: '8px', backgroundColor: memberBg,
          }}>
            <UserAvatarRow
              name={owner.name}
              initials={owner.initials}
              color={owner.avatar_color}
              size="sm"
              textColor={text}
            />
            <button
              type="button"
              onClick={() => onToggleMember(owner.id, team.id, true)}
              title="Remover do time"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '5px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: muted, flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#2a1414' : '#fee2e2'; e.currentTarget.style.color = '#dc2626' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = muted }}
            >
              <UserMinus style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Add member */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setShowAddMenu((v) => !v)}
          disabled={nonMembers.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            width: '100%', height: '32px', padding: '0 10px',
            fontSize: '12px', fontWeight: 500,
            color: nonMembers.length === 0 ? muted : isDark ? '#a0c4b4' : '#2c5545',
            backgroundColor: nonMembers.length === 0 ? 'transparent' : isDark ? '#0d1a14' : '#f0f7f3',
            border: `1px dashed ${nonMembers.length === 0 ? border : isDark ? '#1e4a38' : '#a3d9c0'}`,
            borderRadius: '8px',
            cursor: nonMembers.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { if (nonMembers.length > 0) e.currentTarget.style.opacity = '0.8' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <UserPlus style={{ width: '13px', height: '13px', flexShrink: 0 }} />
          {nonMembers.length === 0 ? 'Todos no time' : 'Adicionar membro'}
        </button>

        {/* Dropdown */}
        {showAddMenu && nonMembers.length > 0 && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '4px',
              backgroundColor: isDark ? '#1a1a18' : '#ffffff',
              border: `1px solid ${border}`, borderRadius: '8px',
              boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 50, overflow: 'hidden',
            }}>
              {nonMembers.map((owner) => (
                <button
                  key={owner.id}
                  type="button"
                  onClick={() => { onToggleMember(owner.id, team.id, false); setShowAddMenu(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '8px 12px',
                    backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <UserAvatarRow
                    name={owner.name}
                    initials={owner.initials}
                    color={owner.avatar_color}
                    size="xs"
                    textColor={text}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TeamsPage() {
  const teams        = useTeamStore((s) => s.teams)
  const createTeam   = useTeamStore((s) => s.createTeam)
  const renameTeamFn = useTeamStore((s) => s.renameTeam)
  const deleteTeam   = useTeamStore((s) => s.deleteTeam)
  const owners       = useOwnerStore((s) => s.owners)
  const setOwnerTeam = useOwnerStore((s) => s.setOwnerTeam)
  const deals        = useDealStore((s) => s.deals)
  const isDark       = useThemeStore((s) => s.isDark)

  const [newName, setNewName]       = useState('')
  const [creating, setCreating]     = useState(false)
  const [showForm, setShowForm]     = useState(false)

  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#5a5652' : '#8a857d'

  // Deal stats per team
  const teamStats = useMemo(() => {
    const map: Record<string, { count: number; pipeline: number }> = {}
    for (const deal of deals) {
      if (!deal.team_id) continue
      if (!map[deal.team_id]) map[deal.team_id] = { count: 0, pipeline: 0 }
      if (!['closed_won', 'closed_lost'].includes(deal.stage_id)) {
        map[deal.team_id].count++
        map[deal.team_id].pipeline += Number(deal.value)
      }
    }
    return map
  }, [deals])

  const totalMembers = useMemo(() => owners.filter((o) => teams.some((t) => t.id === o.team_id)).length, [owners, teams])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createTeam(newName)
      setNewName('')
      setShowForm(false)
    } finally {
      setCreating(false)
    }
  }

  function handleToggleMember(ownerId: string, teamId: string, isMember: boolean) {
    setOwnerTeam(ownerId, isMember ? null : teamId)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>
            Grupos & Squads
          </p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
            {teams.length} {teams.length === 1 ? 'grupo' : 'grupos'} · {totalMembers} {totalMembers === 1 ? 'membro' : 'membros'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '32px', padding: '0 14px',
            fontSize: '12px', fontWeight: 600,
            backgroundColor: isDark ? '#f0ede5' : '#0f0e0c',
            color: isDark ? '#0f0e0c' : '#f0ede5',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Plus style={{ width: '14px', height: '14px' }} />
          Novo grupo
        </button>
      </div>

      {/* New group form */}
      {showForm && (
        <div style={{
          padding: '14px 20px',
          borderBottom: `1px solid ${border}`,
          backgroundColor: isDark ? '#0d0d0b' : '#f9f8f5',
          flexShrink: 0,
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Nome do grupo
          </p>
          <div style={{ display: 'flex', gap: '8px', maxWidth: '400px' }}>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowForm(false) }}
              placeholder="Ex: Comercial, Enterprise, Growth..."
              style={{
                flex: 1, height: '36px', padding: '0 12px', fontSize: '13px',
                backgroundColor: isDark ? '#111110' : '#ffffff',
                border: `1px solid ${isDark ? '#3a3834' : '#c4bfb8'}`,
                borderRadius: '8px', color: text, outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              style={{
                height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 600,
                backgroundColor: newName.trim() ? '#2c5545' : (isDark ? '#1a1a18' : '#e8e4dc'),
                color: newName.trim() ? '#fff' : muted,
                border: 'none', borderRadius: '8px',
                cursor: newName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {creating ? '...' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewName('') }}
              style={{
                height: '36px', padding: '0 12px', fontSize: '13px',
                backgroundColor: 'transparent', color: muted,
                border: `1px solid ${border}`, borderRadius: '8px', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {teams.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: '12px', opacity: 0.5,
          }}>
            <Users2 style={{ width: '36px', height: '36px', color: muted }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: muted }}>Nenhum grupo criado</p>
            <p style={{ fontSize: '12px', color: muted, textAlign: 'center', maxWidth: '280px', lineHeight: 1.6 }}>
              Crie grupos para organizar sua equipe de vendas e filtrar deals por time
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                height: '36px', padding: '0 16px',
                fontSize: '13px', fontWeight: 600,
                color: '#2c5545', backgroundColor: '#2c554514',
                border: '1px solid #2c554530', borderRadius: '8px', cursor: 'pointer',
              }}
            >
              <Plus style={{ width: '14px', height: '14px' }} />
              Criar primeiro grupo
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            alignItems: 'start',
          }}>
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                owners={owners}
                dealCount={teamStats[team.id]?.count ?? 0}
                pipeline={teamStats[team.id]?.pipeline ?? 0}
                isDark={isDark}
                onRename={renameTeamFn}
                onDelete={deleteTeam}
                onToggleMember={handleToggleMember}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
