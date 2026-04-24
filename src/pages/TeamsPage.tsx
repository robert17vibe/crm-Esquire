import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Check, X, UserPlus, UserMinus, Users2,
  TrendingUp, Activity, Settings, Eye,
} from 'lucide-react'
import { useTeamStore } from '@/store/useTeamStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import { Can } from '@/components/ui/Can'
import type { Team, Owner } from '@/types/deal.types'
import { UserAvatarRow } from '@/components/ui/UserAvatar'

// ─── Role system ─────────────────────────────────────────────────────────────

type MemberRole = 'leader' | 'member' | 'observer'
const ROLES_KEY = 'esq_team_roles_v1'

function loadRoles(): Record<string, MemberRole> {
  try { return JSON.parse(localStorage.getItem(ROLES_KEY) ?? '{}') } catch { return {} }
}
function saveRoles(r: Record<string, MemberRole>) {
  localStorage.setItem(ROLES_KEY, JSON.stringify(r))
}

// ─── Health ──────────────────────────────────────────────────────────────────

type HealthStatus = 'healthy' | 'warning' | 'critical'

function computeHealth(winRate: number, overdueRate: number): HealthStatus {
  if (winRate >= 0.3 && overdueRate < 0.2) return 'healthy'
  if (winRate >= 0.15 || overdueRate < 0.4) return 'warning'
  return 'critical'
}

const HEALTH_LABEL: Record<HealthStatus, string> = {
  healthy: 'Saudável', warning: 'Atenção', critical: 'Crítico',
}
const HEALTH_COLOR: Record<HealthStatus, string> = {
  healthy: '#2c5545', warning: '#92400e', critical: '#dc2626',
}
const HEALTH_BG: Record<HealthStatus, string> = {
  healthy: '#d1fae5', warning: '#fef3c7', critical: '#fee2e2',
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}
function fmtPct(v: number) { return `${(v * 100).toFixed(0)}%` }

// ─── GroupDetailModal ─────────────────────────────────────────────────────────

type DetailTab = 'membros' | 'metricas' | 'atividade' | 'config'

function GroupDetailModal({
  team, owners, isDark, onClose,
  onRename, onDelete, onToggleMember,
}: {
  team: Team
  owners: Owner[]
  isDark: boolean
  onClose: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onToggleMember: (ownerId: string, teamId: string, isMember: boolean) => void
}) {
  const navigate      = useNavigate()
  const deals         = useDealStore((s) => s.deals)
  const startImperson = useImpersonationStore((s) => s.start)
  const [tab, setTab] = useState<DetailTab>('membros')
  const [roles, setRoles] = useState<Record<string, MemberRole>>(loadRoles)
  const [renameDraft, setRenameDraft] = useState(team.name)
  const [confirmDel, setConfirmDel] = useState(false)

  const border  = isDark ? '#242422' : '#e4e0da'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const surfBg  = isDark ? '#0d0d0b' : '#f9f8f5'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#5a5652' : '#8a857d'
  const hoverBg = isDark ? '#1a1a18' : '#f5f4f0'
  const inputBg = isDark ? '#0d0d0b' : '#f5f4f1'

  const members    = useMemo(() => owners.filter((o) => o.team_id === team.id), [owners, team.id])
  const nonMembers = useMemo(() => owners.filter((o) => o.team_id !== team.id), [owners, team.id])

  const teamDeals = useMemo(() => deals.filter((d) => d.team_id === team.id), [deals, team.id])
  const openDeals = useMemo(() => teamDeals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id)), [teamDeals])
  const wonDeals  = useMemo(() => teamDeals.filter((d) => d.stage_id === 'closed_won'), [teamDeals])
  const pipeline  = useMemo(() => openDeals.reduce((s, d) => s + Number(d.value), 0), [openDeals])
  const winRate   = teamDeals.length > 0 ? wonDeals.length / teamDeals.length : 0
  const now       = Date.now()
  const overdue   = openDeals.filter((d) => d.next_activity_at && new Date(d.next_activity_at).getTime() < now)
  const overdueRate = openDeals.length > 0 ? overdue.length / openDeals.length : 0
  const health    = computeHealth(winRate, overdueRate)

  const memberStats = useMemo(() => {
    return members.map((m) => {
      const md = deals.filter((d) => d.owner_id === m.id)
      const wo = md.filter((d) => d.stage_id === 'closed_won').length
      const op = md.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
      const pipe = op.reduce((s, d) => s + Number(d.value), 0)
      return { owner: m, total: md.length, won: wo, winRate: md.length > 0 ? wo / md.length : 0, openCount: op.length, pipeline: pipe }
    })
  }, [members, deals])

  const maxPipe = useMemo(() => Math.max(...memberStats.map((s) => s.pipeline), 1), [memberStats])

  function setRole(ownerId: string, role: MemberRole) {
    const next = { ...roles, [ownerId]: role }
    setRoles(next)
    saveRoles(next)
  }

  function handleVerComo(owner: Owner) {
    startImperson(owner.id, owner.name)
    onClose()
    navigate('/pipeline')
  }

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'membros', label: 'Membros' },
    { key: 'metricas', label: 'Métricas' },
    { key: 'atividade', label: 'Atividade' },
    { key: 'config', label: 'Configurações' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '680px', maxWidth: '95vw', maxHeight: '85vh',
        backgroundColor: cardBg, borderRadius: '16px',
        border: `1px solid ${border}`, display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ fontSize: '17px', fontWeight: 700, color: text }}>{team.name}</p>
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                backgroundColor: HEALTH_BG[health], color: HEALTH_COLOR[health],
              }}>{HEALTH_LABEL[health]}</span>
            </div>
            <button type="button" onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'transparent', border: `1px solid ${border}`, cursor: 'pointer', color: muted }}>
              <X style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
          <p style={{ fontSize: '12px', color: muted, marginBottom: '16px' }}>
            {members.length} membros · {openDeals.length} deals abertos · {fmtCompact(pipeline)}
          </p>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: `1px solid ${border}` }}>
            {TABS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setTab(key)} style={{
                height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: tab === key ? 700 : 500,
                color: tab === key ? (isDark ? '#a0c4b4' : '#2c5545') : muted,
                backgroundColor: 'transparent', border: 'none', borderBottom: `2px solid ${tab === key ? (isDark ? '#a0c4b4' : '#2c5545') : 'transparent'}`,
                cursor: 'pointer', marginBottom: '-1px', transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── Membros ── */}
          {tab === 'membros' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.length === 0 && (
                <p style={{ fontSize: '13px', color: muted, fontStyle: 'italic' }}>Nenhum membro ainda.</p>
              )}
              {members.map((owner) => {
                const role = roles[owner.id] ?? 'member'
                return (
                  <div key={owner.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '10px',
                    backgroundColor: surfBg, border: `1px solid ${border}`,
                  }}>
                    <UserAvatarRow name={owner.name} initials={owner.initials} color={owner.avatar_color} size="sm" textColor={text} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{owner.name}</p>
                      <p style={{ fontSize: '11px', color: muted }}>{owner.email ?? ''}</p>
                    </div>
                    {/* Role selector */}
                    <Can action="manage_teams">
                      <select
                        value={role}
                        onChange={(e) => setRole(owner.id, e.target.value as MemberRole)}
                        style={{
                          height: '28px', padding: '0 8px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: inputBg, border: `1px solid ${border}`,
                          borderRadius: '6px', color: text, cursor: 'pointer', outline: 'none',
                        }}
                      >
                        <option value="leader">Líder</option>
                        <option value="member">Membro</option>
                        <option value="observer">Observador</option>
                      </select>
                    </Can>
                    {/* Ver como */}
                    <Can action="impersonate">
                      <button type="button" onClick={() => handleVerComo(owner)}
                        title="Ver pipeline como este membro"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          height: '28px', padding: '0 10px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: isDark ? '#0d1a14' : '#f0f7f3',
                          color: isDark ? '#a0c4b4' : '#2c5545',
                          border: `1px solid ${isDark ? '#1e4a38' : '#a3d9c0'}`,
                          borderRadius: '6px', cursor: 'pointer',
                        }}>
                        <Eye style={{ width: '11px', height: '11px' }} />
                        Ver como
                      </button>
                    </Can>
                    {/* Remove */}
                    <Can action="manage_teams">
                      <button type="button" onClick={() => onToggleMember(owner.id, team.id, true)}
                        title="Remover do time"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: muted }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = muted }}
                      >
                        <UserMinus style={{ width: '13px', height: '13px' }} />
                      </button>
                    </Can>
                  </div>
                )
              })}
              {/* Add non-members */}
              {nonMembers.length > 0 && (
                <Can action="manage_teams">
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adicionar ao grupo</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {nonMembers.map((owner) => (
                        <button key={owner.id} type="button"
                          onClick={() => onToggleMember(owner.id, team.id, false)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            height: '30px', padding: '0 10px', fontSize: '12px', fontWeight: 500,
                            backgroundColor: surfBg, border: `1px dashed ${border}`,
                            borderRadius: '8px', cursor: 'pointer', color: text,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = isDark ? '#3d7a62' : '#2c5545')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = border)}
                        >
                          <UserPlus style={{ width: '11px', height: '11px', color: muted }} />
                          {owner.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </Can>
              )}
            </div>
          )}

          {/* ── Métricas ── */}
          {tab === 'metricas' && (
            <div>
              {/* KPI grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Pipeline', value: fmtCompact(pipeline) },
                  { label: 'Deals abertos', value: String(openDeals.length) },
                  { label: 'Deals ganhos', value: String(wonDeals.length) },
                  { label: 'Win rate', value: fmtPct(winRate) },
                  { label: 'Vencidos', value: String(overdue.length) },
                  { label: 'Taxa vencidos', value: fmtPct(overdueRate) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '14px', borderRadius: '10px', backgroundColor: surfBg, border: `1px solid ${border}` }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>{value}</p>
                  </div>
                ))}
              </div>
              {/* Per-member bar chart */}
              {memberStats.length > 0 && (
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Pipeline por membro</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {memberStats.sort((a, b) => b.pipeline - a.pipeline).map(({ owner, pipeline: p, openCount, winRate: wr }) => (
                      <div key={owner.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: text }}>{owner.name}</span>
                          <span style={{ fontSize: '11px', color: muted }}>{fmtCompact(p)} · {openCount} deals · {fmtPct(wr)} WR</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', backgroundColor: isDark ? '#1a1a18' : '#e8e4dc', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(p / maxPipe) * 100}%`, borderRadius: '3px', background: 'linear-gradient(90deg, #2c5545, #3d7a62)', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Atividade ── */}
          {tab === 'atividade' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Deals recentes</p>
              {teamDeals.length === 0 && (
                <p style={{ fontSize: '13px', color: muted, fontStyle: 'italic' }}>Nenhum deal associado ao grupo.</p>
              )}
              {[...teamDeals].sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()).slice(0, 20).map((deal) => {
                const owner = owners.find((o) => o.id === deal.owner_id)
                const updated = new Date(deal.updated_at ?? deal.created_at)
                const diffDays = Math.floor((Date.now() - updated.getTime()) / 86400000)
                const timeLabel = diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Ontem' : `${diffDays}d atrás`
                return (
                  <button key={deal.id} type="button"
                    onClick={() => { navigate(`/deal/${deal.id}`); onClose() }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px', borderRadius: '10px', textAlign: 'left',
                      backgroundColor: surfBg, border: `1px solid ${border}`,
                      cursor: 'pointer', width: '100%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = surfBg)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deal.title}</p>
                      <p style={{ fontSize: '11px', color: muted }}>{owner?.name ?? '—'} · {fmtCompact(Number(deal.value))}</p>
                    </div>
                    <span style={{ fontSize: '11px', color: muted, flexShrink: 0 }}>{timeLabel}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Configurações ── */}
          {tab === 'config' && (
            <Can action="manage_teams">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Rename */}
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '10px' }}>Renomear grupo</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && renameDraft.trim()) { onRename(team.id, renameDraft.trim()); onClose() } }}
                      style={{
                        flex: 1, height: '36px', padding: '0 12px', fontSize: '13px',
                        backgroundColor: inputBg, border: `1px solid ${isDark ? '#3a3834' : '#c4bfb8'}`,
                        borderRadius: '8px', color: text, outline: 'none',
                      }}
                    />
                    <button type="button"
                      onClick={() => { if (renameDraft.trim()) { onRename(team.id, renameDraft.trim()); onClose() } }}
                      disabled={!renameDraft.trim() || renameDraft === team.name}
                      style={{
                        height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 700,
                        background: renameDraft.trim() && renameDraft !== team.name ? 'linear-gradient(135deg, #2c5545, #3d7a62)' : (isDark ? '#1a1a18' : '#e8e4dc'),
                        color: renameDraft.trim() && renameDraft !== team.name ? '#fff' : muted,
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                      }}>
                      <Check style={{ width: '13px', height: '13px' }} />
                    </button>
                  </div>
                </div>
                {/* Danger zone */}
                <div style={{ padding: '16px', borderRadius: '10px', border: `1px solid #dc2626`, backgroundColor: isDark ? '#1a0a0a' : '#fff5f5' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '6px' }}>Zona de perigo</p>
                  <p style={{ fontSize: '12px', color: muted, marginBottom: '12px' }}>Excluir o grupo não remove os membros ou deals. Esta ação não pode ser revertida.</p>
                  {confirmDel ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button"
                        onClick={() => { onDelete(team.id); onClose() }}
                        style={{ height: '34px', padding: '0 16px', fontSize: '12px', fontWeight: 700, backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        Confirmar exclusão
                      </button>
                      <button type="button" onClick={() => setConfirmDel(false)}
                        style={{ height: '34px', padding: '0 14px', fontSize: '12px', backgroundColor: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: '8px', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDel(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 14px', fontSize: '12px', fontWeight: 600, backgroundColor: 'transparent', color: '#dc2626', border: `1px solid #dc2626`, borderRadius: '8px', cursor: 'pointer' }}>
                      <Trash2 style={{ width: '12px', height: '12px' }} />
                      Excluir grupo
                    </button>
                  )}
                </div>
              </div>
            </Can>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── GroupCard ────────────────────────────────────────────────────────────────

function GroupCard({
  team, owners, isDark, health, pipeline, openCount, wonCount, overdueCount, winRate,
  onOpen,
}: {
  team: Team
  owners: Owner[]
  isDark: boolean
  health: HealthStatus
  pipeline: number
  openCount: number
  wonCount: number
  overdueCount: number
  winRate: number
  onOpen: () => void
}) {
  const border  = isDark ? '#242422' : '#e4e0da'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#5a5652' : '#8a857d'
  const members = owners.filter((o) => o.team_id === team.id)

  return (
    <button type="button" onClick={onOpen} style={{
      display: 'flex', flexDirection: 'column', gap: '14px',
      backgroundColor: cardBg, border: `1px solid ${border}`,
      borderRadius: '12px', padding: '18px', cursor: 'pointer', textAlign: 'left',
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = isDark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.12)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: text, letterSpacing: '-0.01em', marginBottom: '3px' }}>{team.name}</p>
          <p style={{ fontSize: '11px', color: muted }}>{members.length} {members.length === 1 ? 'membro' : 'membros'}</p>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
          backgroundColor: HEALTH_BG[health], color: HEALTH_COLOR[health],
          flexShrink: 0,
        }}>{HEALTH_LABEL[health]}</span>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Pipeline', value: fmtCompact(pipeline) },
          { label: 'Win rate', value: `${(winRate * 100).toFixed(0)}%` },
          { label: 'Abertos', value: String(openCount) },
          { label: 'Vencidos', value: String(overdueCount) },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: isDark ? '#0d0d0b' : '#f5f4f0', border: `1px solid ${border}` }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{label}</p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: text }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Win-rate bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '11px', color: muted }}>Ganhos</span>
          <span style={{ fontSize: '11px', color: muted }}>{wonCount} de {wonCount + openCount}</span>
        </div>
        <div style={{ height: '5px', borderRadius: '3px', backgroundColor: isDark ? '#1a1a18' : '#e8e4dc' }}>
          <div style={{ height: '100%', width: `${Math.min(winRate * 100, 100)}%`, borderRadius: '3px', background: `linear-gradient(90deg, ${HEALTH_COLOR[health]}, ${HEALTH_COLOR[health]}aa)` }} />
        </div>
      </div>

      {/* Avatar row */}
      {members.length > 0 && (
        <div style={{ display: 'flex', gap: '-4px' }}>
          {members.slice(0, 5).map((owner) => (
            <div key={owner.id} title={owner.name} style={{
              width: '26px', height: '26px', borderRadius: '50%', marginRight: '-6px',
              backgroundColor: owner.avatar_color || '#2c5545',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, color: '#fff',
              border: `2px solid ${cardBg}`,
            }}>
              {owner.initials}
            </div>
          ))}
          {members.length > 5 && (
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%', marginRight: '-6px',
              backgroundColor: isDark ? '#1a1a18' : '#e8e4dc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700, color: muted,
              border: `2px solid ${cardBg}`,
            }}>+{members.length - 5}</div>
          )}
        </div>
      )}
    </button>
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

  const [newName, setNewName]     = useState('')
  const [creating, setCreating]   = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [openTeamId, setOpenTeamId] = useState<string | null>(null)

  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#5a5652' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#ffffff'

  const now = Date.now()

  // Per-team stats
  const teamStats = useMemo(() => {
    return teams.map((team) => {
      const td     = deals.filter((d) => d.team_id === team.id)
      const open   = td.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
      const won    = td.filter((d) => d.stage_id === 'closed_won')
      const pipe   = open.reduce((s, d) => s + Number(d.value), 0)
      const ov     = open.filter((d) => d.next_activity_at && new Date(d.next_activity_at).getTime() < now)
      const wr     = td.length > 0 ? won.length / td.length : 0
      const ovr    = open.length > 0 ? ov.length / open.length : 0
      return { team, pipeline: pipe, openCount: open.length, wonCount: won.length, overdueCount: ov.length, winRate: wr, health: computeHealth(wr, ovr) }
    })
  }, [teams, deals, now])

  const healthSummary = useMemo(() => ({
    healthy:  teamStats.filter((s) => s.health === 'healthy').length,
    warning:  teamStats.filter((s) => s.health === 'warning').length,
    critical: teamStats.filter((s) => s.health === 'critical').length,
  }), [teamStats])

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

  const openTeam = openTeamId ? teams.find((t) => t.id === openTeamId) ?? null : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ minHeight: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 16px', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <p style={{ fontSize: '20px', fontWeight: 700, color: text, letterSpacing: '-0.02em' }}>Grupos & Squads</p>
            {/* Health summary badges */}
            {teams.length > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['healthy', 'warning', 'critical'] as HealthStatus[]).map((h) => healthSummary[h] > 0 && (
                  <span key={h} style={{
                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                    backgroundColor: HEALTH_BG[h], color: HEALTH_COLOR[h],
                  }}>{healthSummary[h]} {HEALTH_LABEL[h]}</span>
                ))}
              </div>
            )}
          </div>
          <p style={{ fontSize: '12px', color: muted }}>
            {teams.length} {teams.length === 1 ? 'grupo' : 'grupos'} · {totalMembers} {totalMembers === 1 ? 'membro' : 'membros'} na organização
          </p>
        </div>
        <Can action="manage_teams">
          <button type="button" onClick={() => setShowForm((v) => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            height: '38px', padding: '0 18px', fontSize: '13px', fontWeight: 700,
            background: showForm ? (isDark ? '#1a1a18' : '#e8e4dc') : 'linear-gradient(135deg, #2c5545 0%, #3d7a62 100%)',
            color: showForm ? muted : '#ffffff',
            border: 'none', borderRadius: '10px', cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 2px 8px rgba(44,85,69,0.35)',
            transition: 'all 0.2s ease',
          }}>
            <Plus style={{ width: '15px', height: '15px' }} />
            Novo grupo
          </button>
        </Can>
      </div>

      {/* New group form */}
      {showForm && (
        <div style={{
          marginBottom: '20px', padding: '18px 20px',
          backgroundColor: isDark ? '#0f0f0d' : '#f9f8f5',
          border: `1px solid ${border}`, borderRadius: '12px', flexShrink: 0,
        }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '12px' }}>Novo grupo</p>
          <div style={{ display: 'flex', gap: '8px', maxWidth: '440px' }}>
            <input
              autoFocus type="text" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowForm(false); setNewName('') } }}
              placeholder="Ex: Comercial, Enterprise, Growth..."
              style={{
                flex: 1, height: '38px', padding: '0 12px', fontSize: '13px',
                backgroundColor: inputBg, border: `1px solid ${isDark ? '#3a3834' : '#c4bfb8'}`,
                borderRadius: '8px', color: text, outline: 'none',
              }}
            />
            <button type="button" onClick={handleCreate} disabled={creating || !newName.trim()} style={{
              height: '38px', padding: '0 18px', fontSize: '13px', fontWeight: 700,
              background: newName.trim() ? 'linear-gradient(135deg, #2c5545 0%, #3d7a62 100%)' : (isDark ? '#1a1a18' : '#e8e4dc'),
              color: newName.trim() ? '#fff' : muted,
              border: 'none', borderRadius: '8px', cursor: newName.trim() ? 'pointer' : 'not-allowed',
              boxShadow: newName.trim() ? '0 2px 6px rgba(44,85,69,0.3)' : 'none',
            }}>
              {creating ? 'A criar...' : 'Criar grupo'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setNewName('') }} style={{
              height: '38px', padding: '0 14px', fontSize: '13px',
              backgroundColor: 'transparent', color: muted,
              border: `1px solid ${border}`, borderRadius: '8px', cursor: 'pointer',
            }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {teams.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: isDark ? '#1a1a18' : '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users2 style={{ width: '28px', height: '28px', color: muted }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: text, marginBottom: '6px' }}>Nenhum grupo criado</p>
              <p style={{ fontSize: '13px', color: muted, lineHeight: 1.6, maxWidth: '300px' }}>
                Crie grupos para organizar a equipa de vendas e filtrar deals por time
              </p>
            </div>
            <Can action="manage_teams">
              <button type="button" onClick={() => setShowForm(true)} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                height: '40px', padding: '0 20px', fontSize: '13px', fontWeight: 700,
                background: 'linear-gradient(135deg, #2c5545 0%, #3d7a62 100%)',
                color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(44,85,69,0.35)',
              }}>
                <Plus style={{ width: '15px', height: '15px' }} />
                Criar primeiro grupo
              </button>
            </Can>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', alignItems: 'start' }}>
            {teamStats.map(({ team, pipeline, openCount, wonCount, overdueCount, winRate, health }) => (
              <GroupCard
                key={team.id}
                team={team}
                owners={owners}
                isDark={isDark}
                health={health}
                pipeline={pipeline}
                openCount={openCount}
                wonCount={wonCount}
                overdueCount={overdueCount}
                winRate={winRate}
                onOpen={() => setOpenTeamId(team.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {openTeam && (
        <GroupDetailModal
          team={openTeam}
          owners={owners}
          isDark={isDark}
          onClose={() => setOpenTeamId(null)}
          onRename={renameTeamFn}
          onDelete={deleteTeam}
          onToggleMember={handleToggleMember}
        />
      )}
    </div>
  )
}
