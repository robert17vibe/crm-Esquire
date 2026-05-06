import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Check, X, UserPlus, UserMinus, Users2,
} from 'lucide-react'
import { useTeamStore } from '@/store/useTeamStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
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
  healthy: '#6b1212', warning: '#a88030', critical: '#b83535',
}
const HEALTH_BG: Record<HealthStatus, string> = {
  healthy: 'rgba(227,30,36,0.10)', warning: '#fef3c7', critical: '#fee2e2',
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
  const overdue   = openDeals.filter((d) => d.next_activity?.due_date && new Date(d.next_activity.due_date).getTime() < now)
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
                color: tab === key ? (isDark ? 'rgba(227,30,36,0.50)' : '#6b1212') : muted,
                backgroundColor: 'transparent', border: 'none', borderBottom: `2px solid ${tab === key ? (isDark ? 'rgba(227,30,36,0.50)' : '#6b1212') : 'transparent'}`,
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
                      <p style={{ fontSize: '11px', color: muted }}>{(owner as unknown as Record<string, string>).email ?? ''}</p>
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
                    {/* Remove */}
                    <Can action="manage_teams">
                      <button type="button" onClick={() => onToggleMember(owner.id, team.id, true)}
                        title="Remover do time"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: muted }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#b83535' }}
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
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = isDark ? '#3d7a62' : '#6b1212')}
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
                          <div style={{ height: '100%', width: `${(p / maxPipe) * 100}%`, borderRadius: '3px', background: 'linear-gradient(90deg, #6b1212, #3d7a62)', transition: 'width 0.4s' }} />
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
                        background: renameDraft.trim() && renameDraft !== team.name ? 'linear-gradient(135deg, #6b1212, #3d7a62)' : (isDark ? '#1a1a18' : '#e8e4dc'),
                        color: renameDraft.trim() && renameDraft !== team.name ? '#fff' : muted,
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                      }}>
                      <Check style={{ width: '13px', height: '13px' }} />
                    </button>
                  </div>
                </div>
                {/* Danger zone */}
                <div style={{ padding: '16px', borderRadius: '10px', border: `1px solid #b83535`, backgroundColor: isDark ? '#1a0a0a' : '#fff5f5' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#b83535', marginBottom: '6px' }}>Zona de perigo</p>
                  <p style={{ fontSize: '12px', color: muted, marginBottom: '12px' }}>Excluir o grupo não remove os membros ou deals. Esta ação não pode ser revertida.</p>
                  {confirmDel ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button"
                        onClick={() => { onDelete(team.id); onClose() }}
                        style={{ height: '34px', padding: '0 16px', fontSize: '12px', fontWeight: 700, backgroundColor: '#b83535', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        Confirmar exclusão
                      </button>
                      <button type="button" onClick={() => setConfirmDel(false)}
                        style={{ height: '34px', padding: '0 14px', fontSize: '12px', backgroundColor: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: '8px', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDel(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 14px', fontSize: '12px', fontWeight: 600, backgroundColor: 'transparent', color: '#b83535', border: `1px solid #b83535`, borderRadius: '8px', cursor: 'pointer' }}>
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

const ROLE_LABELS: Record<MemberRole, string> = {
  leader: 'Líder', member: 'Membro', observer: 'Observador',
}
const ROLE_COLORS: Record<MemberRole, string> = {
  leader: '#6b1212', member: '#1e40af', observer: '#667085',
}

export function GroupCard({
  team, owners, isDark, health, pipeline, openCount, wonCount, winRate, rank,
  onOpen,
}: {
  team: Team; owners: Owner[]; isDark: boolean; health: HealthStatus
  pipeline: number; openCount: number; wonCount: number; winRate: number
  rank: number; onOpen: () => void
}) {
  const border  = isDark ? 'rgba(255,255,255,0.07)' : '#eaecf0'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const text    = isDark ? '#e8e4dc' : '#101828'
  const muted   = isDark ? '#5a5652' : '#667085'
  const members = owners.filter((o) => o.team_id === team.id)
  const roles   = loadRoles()

  const sortedMembers = [...members].sort((a, b) => {
    const order: Record<MemberRole, number> = { leader: 0, member: 1, observer: 2 }
    return (order[roles[a.id] ?? 'member'] ?? 1) - (order[roles[b.id] ?? 'member'] ?? 1)
  })

  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null

  return (
    <button type="button" onClick={onOpen} style={{
      display: 'flex', flexDirection: 'column',
      backgroundColor: cardBg, border: `1px solid ${border}`,
      borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
      overflow: 'hidden', transition: 'box-shadow 0.15s ease', padding: '16px 18px', gap: '12px',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = isDark ? '0 0 0 1px rgba(255,255,255,0.1)' : '0 4px 12px rgba(16,24,40,0.09)' }}
    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ fontSize: rankEmoji ? '18px' : '12px', fontWeight: 700, color: muted, flexShrink: 0 }}>
            {rankEmoji ?? `#${rank}`}
          </span>
          <p style={{ fontSize: '14px', fontWeight: 600, color: text, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {team.name}
          </p>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
          backgroundColor: HEALTH_BG[health], color: HEALTH_COLOR[health], flexShrink: 0,
        }}>
          {HEALTH_LABEL[health]}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div>
          <p style={{ fontSize: '11px', color: muted, marginBottom: '2px' }}>Pipeline</p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: text, fontFamily: "'Geist Mono', monospace" }}>{fmtCompact(pipeline)}</p>
        </div>
        <div>
          <p style={{ fontSize: '11px', color: muted, marginBottom: '2px' }}>Ganhos</p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#2c5545', fontFamily: "'Geist Mono', monospace" }}>{wonCount}</p>
        </div>
        <div>
          <p style={{ fontSize: '11px', color: muted, marginBottom: '2px' }}>Win Rate</p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>{(winRate * 100).toFixed(0)}%</p>
        </div>
        <div>
          <p style={{ fontSize: '11px', color: muted, marginBottom: '2px' }}>Abertos</p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>{openCount}</p>
        </div>
      </div>

      {/* Win rate bar */}
      <div style={{ height: '4px', borderRadius: '99px', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }}>
        <div style={{ height: '100%', width: `${Math.min(winRate * 100, 100)}%`, borderRadius: '99px', backgroundColor: '#6b1212', transition: 'width 0.4s ease' }} />
      </div>

      {/* Members */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sortedMembers.length === 0 ? (
          <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Sem membros</p>
        ) : (
          sortedMembers.slice(0, 5).map((owner) => {
            const role: MemberRole = roles[owner.id] ?? 'member'
            return (
              <div key={owner.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                  backgroundColor: owner.avatar_color || '#6b1212',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', fontWeight: 700, color: '#fff',
                }}>
                  {owner.initials}
                </div>
                <span style={{ flex: 1, fontSize: '12px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {owner.name}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 500, color: ROLE_COLORS[role] }}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
            )
          })
        )}
        {sortedMembers.length > 5 && (
          <p style={{ fontSize: '11px', color: muted }}>+{sortedMembers.length - 5} mais</p>
        )}
      </div>
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

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [newName, setNewName]     = useState('')
  const [creating, setCreating]   = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [openTeamId, setOpenTeamId] = useState<string | null>(null)

  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#5a5652' : '#8a857d'
  const now = Date.now()

  // Per-team stats
  const teamStats = useMemo(() => {
    return teams.map((team) => {
      const td     = deals.filter((d) => d.team_id === team.id)
      const open   = td.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
      const won    = td.filter((d) => d.stage_id === 'closed_won')
      const pipe   = open.reduce((s, d) => s + Number(d.value), 0)
      const ov     = open.filter((d) => d.next_activity?.due_date && new Date(d.next_activity.due_date).getTime() < now)
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

  return (
    <div style={{ backgroundColor: isDark ? '#0d0c0a' : '#f9fafb', minHeight: '100%', overflowY: 'auto' }}>

      {/* Header card with matrix rain */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderBottom: `1px solid ${border}`,
        backgroundColor: isDark ? '#0a0a08' : '#ffffff',
        flexShrink: 0,
      }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: isDark ? 0.35 : 0.2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: isDark ? 'linear-gradient(to bottom, transparent 40%, rgba(10,10,8,0.85) 100%)' : 'linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.88) 100%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 32px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Users2 size={18} color={text} />
              <p style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>Grupos & Squads</p>
              {teams.length > 0 && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['healthy', 'warning', 'critical'] as HealthStatus[]).map((h) => healthSummary[h] > 0 && (
                    <span key={h} style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                      backgroundColor: HEALTH_BG[h], color: HEALTH_COLOR[h],
                    }}>{healthSummary[h]} {HEALTH_LABEL[h]}</span>
                  ))}
                </div>
              )}
            </div>
            <p style={{ fontSize: '13px', color: muted, margin: 0 }}>
              {teams.length} {teams.length === 1 ? 'grupo' : 'grupos'} · {totalMembers} {totalMembers === 1 ? 'membro' : 'membros'} na organização
            </p>
          </div>
          <Can action="manage_teams">
            <button type="button" onClick={() => setShowForm((v) => !v)} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              height: '36px', padding: '0 18px', fontSize: '13px', fontWeight: 700,
              background: showForm ? (isDark ? '#1a1a18' : '#f0eeea') : '#6b1212',
              color: showForm ? muted : '#ffffff',
              border: 'none', borderRadius: '10px', cursor: 'pointer',
              boxShadow: showForm ? 'none' : '0 2px 8px rgba(107,18,18,0.30)',
              transition: 'all 0.2s ease',
            }}>
              <Plus style={{ width: '15px', height: '15px' }} />
              Novo grupo
            </button>
          </Can>
        </div>
      </div>

      {/* Page content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 32px 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* New group form */}
        {showForm && (
          <div style={{
            padding: '20px 24px',
            backgroundColor: isDark ? '#111110' : '#ffffff',
            border: `1px solid ${border}`, borderRadius: '12px',
            boxShadow: isDark ? 'none' : '0 1px 4px rgba(16,24,40,0.06)',
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
                  backgroundColor: isDark ? '#1a1a18' : '#f5f4f0', border: `1px solid ${border}`,
                  borderRadius: '8px', color: text, outline: 'none',
                }}
              />
              <button type="button" onClick={handleCreate} disabled={creating || !newName.trim()} style={{
                height: '38px', padding: '0 18px', fontSize: '13px', fontWeight: 700,
                backgroundColor: newName.trim() ? '#6b1212' : (isDark ? '#1a1a18' : '#e8e4dc'),
                color: newName.trim() ? '#fff' : muted,
                border: 'none', borderRadius: '8px', cursor: newName.trim() ? 'pointer' : 'not-allowed',
                boxShadow: newName.trim() ? '0 2px 6px rgba(107,18,18,0.25)' : 'none',
              }}>
                {creating ? 'A criar...' : 'Criar grupo'}
              </button>
            </div>
          </div>
        )}

        {/* Teams grid */}
        {teamStats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: muted, fontSize: '13px' }}>
            Nenhum grupo criado ainda.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {teamStats.map(({ team, pipeline, wonCount, winRate, health, overdueCount }) => {
              const members = owners.filter((o) => o.team_id === team.id)
              return (
                <div
                  key={team.id}
                  style={{
                    backgroundColor: isDark ? '#111110' : '#ffffff',
                    border: `1px solid ${border}`,
                    borderRadius: '14px', padding: '20px',
                    boxShadow: isDark ? 'none' : '0 1px 4px rgba(16,24,40,0.06)',
                    cursor: 'pointer', transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                  }}
                  onClick={() => setOpenTeamId(team.id)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6b1212'; e.currentTarget.style.boxShadow = isDark ? '0 0 0 1px #6b1212' : '0 4px 12px rgba(107,18,18,0.12)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = isDark ? 'none' : '0 1px 4px rgba(16,24,40,0.06)' }}
                >
                  {/* Team header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: text, margin: 0 }}>{team.name}</p>
                      <p style={{ fontSize: '12px', color: muted, marginTop: '2px' }}>{members.length} {members.length === 1 ? 'membro' : 'membros'}</p>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                      backgroundColor: HEALTH_BG[health], color: HEALTH_COLOR[health],
                    }}>{HEALTH_LABEL[health]}</span>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                    {[
                      { label: 'Pipeline', value: fmtCompact(pipeline) },
                      { label: 'Ganhos', value: wonCount.toString() },
                      { label: 'Win Rate', value: fmtPct(winRate) },
                    ].map((s) => (
                      <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px', backgroundColor: isDark ? '#0d0c0a' : '#f9fafb', borderRadius: '8px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: text, margin: 0 }}>{s.value}</p>
                        <p style={{ fontSize: '10px', color: muted, margin: 0 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Members avatars */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {members.slice(0, 5).map((m) => (
                        <div key={m.id} style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: m.avatar_color ?? '#667085', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {m.initials}
                        </div>
                      ))}
                      {members.length > 5 && (
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: isDark ? '#1a1a18' : '#e8e4dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: muted }}>
                          +{members.length - 5}
                        </div>
                      )}
                    </div>
                    {overdueCount > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#b83535' }}>{overdueCount} em atraso</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Unassigned members */}
        {(() => {
          const unassigned = owners.filter((o) => !teams.some((t) => t.id === o.team_id))
          if (unassigned.length === 0) return null
          return (
            <div style={{ backgroundColor: isDark ? '#111110' : '#ffffff', border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: isDark ? 'none' : '0 1px 4px rgba(16,24,40,0.06)' }}>
              <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, backgroundColor: isDark ? '#0d0c0a' : '#f9fafb' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Sem grupo · {unassigned.length}</p>
              </div>
              {unassigned.map((o, i) => (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 20px',
                  borderBottom: i < unassigned.length - 1 ? `1px solid ${border}` : 'none',
                  backgroundColor: 'transparent',
                  transition: 'background-color 0.1s ease',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#0d0c0a' : '#f9fafb' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: o.avatar_color ?? '#667085', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(o.name ?? '?').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: text, margin: 0 }}>{o.name}</p>
                    {o.email && <p style={{ fontSize: '11px', color: muted, margin: 0 }}>{o.email}</p>}
                  </div>
                  {teams.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) handleToggleMember(o.id, e.target.value, false) }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ height: '30px', padding: '0 8px', fontSize: '11px', color: muted, backgroundColor: isDark ? '#1a1a18' : '#f0eeea', border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="" disabled>Atribuir grupo...</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Group detail modal */}
      {openTeam && (
        <GroupDetailModal
          team={openTeam}
          owners={owners}
          isDark={isDark}
          onClose={() => setOpenTeamId(null)}
          onRename={(id, name) => renameTeamFn(id, name)}
          onDelete={(id) => { deleteTeam(id); setOpenTeamId(null) }}
          onToggleMember={handleToggleMember}
        />
      )}
    </div>
  )
}
