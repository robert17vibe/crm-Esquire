import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { GitFork, RefreshCw, CheckSquare, Square, Users, Clock, Search, Shuffle, ArrowLeftRight, X, UserMinus } from 'lucide-react'
import { useOwnerStore } from '@/store/useOwnerStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import {
  fetchUnassignedDeals,
  fetchAllDeals,
  fetchOwnerWorkload,
  fetchDistributionHistory,
  assignDealsToOwner,
  distributeDealsEqually,
  logDistribution,
  unassignDeal,
  type UnassignedDeal,
  type AllDeal,
  type DistributionLogEntry,
} from '@/services/distribution.service'
import type { Owner } from '@/types/deal.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function fmtDateShort(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

const SEG_COLOR: Record<string, string> = { B2B: '#2563eb', B2C: '#7c3aed', B2G: '#0891b2' }
const SEG_BG:    Record<string, string> = { B2B: 'rgba(37,99,235,0.12)', B2C: 'rgba(124,58,237,0.12)', B2G: 'rgba(8,145,178,0.12)' }

// ─── WorkloadCard ─────────────────────────────────────────────────────────────

function WorkloadCard({ owner, count, selected, onSelect, isDark }: {
  owner: Owner; count: number; selected: boolean; onSelect: () => void; isDark: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const textColor   = isDark ? 'rgba(255,255,255,0.90)' : '#1a1a18'
  const mutedColor  = isDark ? 'rgba(255,255,255,0.40)' : '#8a857d'
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '36px 1fr auto',
        alignItems: 'center', gap: '12px',
        padding: '10px 16px', cursor: 'pointer', width: '100%', textAlign: 'left',
        border: 'none',
        backgroundColor: selected
          ? (isDark ? 'rgba(227,30,36,0.08)' : 'rgba(227,30,36,0.05)')
          : (hovered ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent'),
        transition: 'background-color 0.15s ease',
        borderLeft: `3px solid ${selected ? '#6b1212' : 'transparent'}`,
      }}
    >
      {/* Avatar */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px', backgroundColor: owner.avatar_color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0,
        boxShadow: selected ? `0 0 0 2px ${owner.avatar_color}50` : 'none',
      }}>
        {owner.initials}
      </div>

      {/* Nome + email */}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: selected ? textColor : (isDark ? 'rgba(255,255,255,0.80)' : '#1a1a18'), margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {owner.name}
        </p>
        {owner.email && (
          <p style={{ fontSize: '10px', color: mutedColor, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {owner.email}
          </p>
        )}
      </div>

      {/* Contagem */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
        <span style={{ fontSize: '16px', fontWeight: 800, color: selected ? '#6b1212' : textColor, lineHeight: 1 }}>
          {count}
        </span>
        <span style={{ fontSize: '8px', fontWeight: 700, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
          leads
        </span>
      </div>
    </button>
  )
}

// ─── OwnerBadge ───────────────────────────────────────────────────────────────

function OwnerBadge({ owner, isDark }: { owner: Owner | undefined; isDark: boolean }) {
  if (!owner) return <span style={{ fontSize: '10px', color: isDark ? 'rgba(255,255,255,0.30)' : '#b0ab9e' }}>Sem dono</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <div style={{
        width: '18px', height: '18px', borderRadius: '3px', backgroundColor: owner.avatar_color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '7px', fontWeight: 800, color: '#fff', flexShrink: 0,
      }}>
        {owner.initials}
      </div>
      <span style={{ fontSize: '10px', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.65)' : '#4a4540' }}>{owner.name.split(' ')[0]}</span>
    </div>
  )
}

// ─── ActionBar (toolbar fixa dentro da tabela) ────────────────────────────────

function ActionBar({ selectedCount, owners, workload, targetOwner, onTargetChange, onAssign, onDistributeEqually, distributing, isDark, border, card, text, muted, search, onSearch }: {
  selectedCount: number; owners: Owner[]; workload: Record<string, number>
  targetOwner: string; onTargetChange: (v: string) => void
  onAssign: () => void; onDistributeEqually: () => void
  distributing: boolean; isDark: boolean; border: string; card: string; text: string; muted: string
  search: string; onSearch: (v: string) => void
}) {
  const hasSelection = selectedCount > 0
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      padding: '10px 16px', borderBottom: `1px solid ${border}`,
      backgroundColor: isDark ? '#111110' : '#fafaf9',
    }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
        <Search style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: muted, pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Pesquisar lead ou empresa…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          style={{ width: '100%', height: '32px', paddingLeft: '28px', paddingRight: search ? '28px' : '10px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: card, color: text, fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
        />
        {search && (
          <button type="button" onClick={() => onSearch('')} style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', alignItems: 'center' }}>
            <X style={{ width: '11px', height: '11px' }} />
          </button>
        )}
      </div>

      {/* Selecionados badge */}
      {hasSelection && (
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b1212', backgroundColor: isDark ? 'rgba(227,30,36,0.12)' : 'rgba(227,30,36,0.08)', padding: '4px 10px', borderRadius: '6px', flexShrink: 0 }}>
          {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
        </span>
      )}

      <div style={{ width: '1px', height: '24px', backgroundColor: border, flexShrink: 0 }} />

      {/* Atribuir a */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <select
          value={targetOwner}
          onChange={(e) => onTargetChange(e.target.value)}
          disabled={!hasSelection}
          style={{
            height: '32px', padding: '0 10px', borderRadius: '6px', fontSize: '11px',
            border: `1px solid ${border}`, backgroundColor: card, color: hasSelection ? text : muted,
            cursor: hasSelection ? 'pointer' : 'default', opacity: hasSelection ? 1 : 0.5,
          }}
        >
          <option value="">Atribuir a…</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>{o.name} ({workload[o.id] ?? 0})</option>
          ))}
        </select>
        <button
          type="button"
          disabled={!targetOwner || !hasSelection || distributing}
          onClick={onAssign}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '32px', padding: '0 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
            cursor: targetOwner && hasSelection && !distributing ? 'pointer' : 'not-allowed',
            backgroundColor: '#6b1212', color: '#fff', border: 'none',
            opacity: targetOwner && hasSelection && !distributing ? 1 : 0.4,
          }}
        >
          <ArrowLeftRight style={{ width: '12px', height: '12px' }} />
          Remanejar
        </button>
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: border, flexShrink: 0 }} />

      <button
        type="button"
        disabled={!hasSelection || distributing}
        onClick={onDistributeEqually}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          height: '32px', padding: '0 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
          cursor: !hasSelection || distributing ? 'not-allowed' : 'pointer',
          backgroundColor: 'transparent', color: isDark ? 'rgba(255,255,255,0.70)' : '#1a1a18',
          border: `1px solid ${border}`, opacity: !hasSelection || distributing ? 0.4 : 1,
        }}
        onMouseEnter={(e) => { if (hasSelection && !distributing) { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb' } }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.70)' : '#1a1a18' }}
      >
        <Shuffle style={{ width: '12px', height: '12px' }} />
        Distribuir igualmente
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminDistribuirLeadsPage() {
  const isDark  = useThemeStore((s) => s.isDark)
  const profile = useAuthStore((s) => s.profile)
  const owners  = useOwnerStore((s) => s.owners)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const bg      = isDark ? '#0d0c0a' : '#f5f4f0'
  const card    = isDark ? '#111110' : '#ffffff'
  const border  = isDark ? 'rgba(255,255,255,0.08)' : '#eaecf0'
  const text    = isDark ? 'rgba(255,255,255,0.90)' : '#1a1a18'
  const muted   = isDark ? 'rgba(255,255,255,0.40)' : '#8a857d'
  const hoverBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'

  const [unassigned, setUnassigned]     = useState<UnassignedDeal[]>([])
  const [allDeals, setAllDeals]         = useState<AllDeal[]>([])
  const [workload, setWorkload]         = useState<Record<string, number>>({})
  const [history, setHistory]           = useState<DistributionLogEntry[]>([])
  const [loading, setLoading]           = useState(true)
  const [err, setErr]                   = useState('')
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [targetOwner, setTargetOwner]   = useState<string>('')
  const [distributing, setDistributing] = useState(false)
  const [tab, setTab]                   = useState<'leads' | 'todos' | 'history'>('leads')
  const [search, setSearch]             = useState('')
  const [ownerSearch, setOwnerSearch]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const [u, all, w, h] = await Promise.all([
        fetchUnassignedDeals(),
        fetchAllDeals(),
        fetchOwnerWorkload(),
        fetchDistributionHistory(),
      ])
      setUnassigned(u)
      setAllDeals(all)
      setWorkload(w)
      setHistory(h)
    } catch {
      setErr('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

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

  // Reset selection when tab changes
  useEffect(() => { setSelected(new Set()); setSearch(''); setTargetOwner('') }, [tab])

  // ─── Filtered lists ──────────────────────────────────────────────────────────

  const q = search.toLowerCase().trim()
  const oq = ownerSearch.toLowerCase().trim()
  const filteredOwners = useMemo(() =>
    oq ? owners.filter((o) => o.name.toLowerCase().includes(oq) || (o.email ?? '').toLowerCase().includes(oq)) : owners,
  [owners, oq])

  const filteredUnassigned = useMemo(() =>
    q ? unassigned.filter((d) => d.title.toLowerCase().includes(q) || (d.company_name ?? '').toLowerCase().includes(q)) : unassigned,
  [unassigned, q])

  const filteredAll = useMemo(() =>
    q ? allDeals.filter((d) => d.title.toLowerCase().includes(q) || (d.company_name ?? '').toLowerCase().includes(q)) : allDeals,
  [allDeals, q])

  const activeList = tab === 'leads' ? filteredUnassigned : filteredAll

  // ─── Selection helpers ───────────────────────────────────────────────────────

  function toggleAll() {
    const ids = activeList.map((d) => d.id)
    if (selected.size === ids.length) setSelected(new Set())
    else setSelected(new Set(ids))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async function handleAssign() {
    if (selected.size === 0 || !targetOwner) return
    setDistributing(true)
    setErr('')
    const ids = Array.from(selected)
    try {
      await assignDealsToOwner(ids, targetOwner)
      if (profile?.id) {
        await logDistribution({ dealIds: ids, distributedBy: profile.id, distributionType: 'manual', assignments: { [targetOwner]: ids } })
      }
      setSelected(new Set())
      setTargetOwner('')
      await load()
    } catch {
      setErr('Erro ao atribuir leads')
    } finally {
      setDistributing(false)
    }
  }

  async function handleDistributeEqually(ids?: string[]) {
    const pool = owners.filter((o) => o.id)
    if (pool.length === 0) { setErr('Sem proprietários disponíveis'); return }
    setDistributing(true)
    setErr('')
    const dealIds = ids ?? Array.from(selected)
    if (dealIds.length === 0) { setDistributing(false); return }
    try {
      const assignments = await distributeDealsEqually(dealIds, pool)
      if (profile?.id) {
        await logDistribution({ dealIds, distributedBy: profile.id, distributionType: 'auto_equal', assignments })
      }
      setSelected(new Set())
      await load()
    } catch {
      setErr('Erro ao distribuir leads')
    } finally {
      setDistributing(false)
    }
  }

  async function handleDistributeAllUnassigned() {
    await handleDistributeEqually(unassigned.map((d) => d.id))
  }

  async function handleUnassign(dealId: string) {
    setErr('')
    try {
      await unassignDeal(dealId)
      await load()
    } catch {
      setErr('Erro ao remover proprietário')
    }
  }

  // ─── Render helpers ───────────────────────────────────────────────────────────

  const allSelected = selected.size > 0 && selected.size === activeList.length
  const tabs = [
    { key: 'leads' as const, label: 'Não atribuídos', icon: GitFork, count: unassigned.length },
    { key: 'todos' as const, label: 'Todos os Leads',  icon: Users,   count: allDeals.length },
    { key: 'history' as const, label: 'Histórico',     icon: Clock,   count: history.length },
  ]

  return (
    <div style={{ backgroundColor: bg, minHeight: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: '12px',
        padding: '28px 28px 20px', marginBottom: '0',
        backgroundColor: isDark ? '#0a0a08' : '#ffffff',
        border: `1px solid ${border}`,
        boxShadow: isDark ? 'none' : '0 1px 4px rgba(16,24,40,0.06)',
      }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: isDark ? 0.35 : 0.2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: isDark ? 'linear-gradient(to bottom, transparent 40%, rgba(10,10,8,0.85) 100%)' : 'linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.88) 100%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <GitFork size={18} color={text} />
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>Distribuir Leads</h1>
            </div>
            <p style={{ fontSize: '13px', color: muted, margin: 0 }}>
              {unassigned.length} sem proprietário · {allDeals.length} total
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 14px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: isDark ? '#1a1a18' : '#f5f4f0', color: muted, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = text; e.currentTarget.style.borderColor = isDark ? '#3a3a38' : '#c4bfb8' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = muted; e.currentTarget.style.borderColor = border }}
          >
            <RefreshCw style={{ width: '12px', height: '12px' }} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Workload table */}
      <div style={{ backgroundColor: card, borderRadius: '10px', border: `1px solid ${border}`, overflow: 'hidden', width: '100%' }}>
        {/* Header com pesquisa */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${border}`, backgroundColor: isDark ? '#0d0c0a' : '#fafaf9', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: muted, flexShrink: 0 }}>Proprietários</span>
            <span style={{ fontSize: '9px', color: muted }}>·</span>
            <span style={{ fontSize: '9px', color: muted }}>{owners.length} total</span>
          </div>
          {/* Pesquisa */}
          <div style={{ position: 'relative', width: '200px' }}>
            <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '11px', height: '11px', color: muted, pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Pesquisar…"
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              style={{ width: '100%', height: '28px', paddingLeft: '26px', paddingRight: ownerSearch ? '26px' : '8px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: card, color: text, fontSize: '11px', outline: 'none', boxSizing: 'border-box' }}
            />
            {ownerSearch && (
              <button type="button" onClick={() => setOwnerSearch('')} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', alignItems: 'center', padding: 0 }}>
                <X style={{ width: '10px', height: '10px' }} />
              </button>
            )}
          </div>
        </div>
        {/* Col headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: '12px', padding: '6px 16px', borderBottom: `1px solid ${border}`, backgroundColor: isDark ? '#0d0c0a' : '#fafaf9', alignItems: 'center' }}>
          <span />
          <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted }}>Nome / Email</span>
          <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted }}>Leads</span>
        </div>
        {/* Scrollable rows — 7 visible */}
        <div style={{ overflowY: 'auto', maxHeight: `${7 * 57}px` }}>
          {filteredOwners.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: muted }}>Nenhum proprietário encontrado</div>
          ) : filteredOwners.map((o, i) => (
            <div key={o.id} style={{ borderBottom: i < filteredOwners.length - 1 ? `1px solid ${border}` : 'none' }}>
              <WorkloadCard
                owner={o}
                count={workload[o.id] ?? 0}
                selected={targetOwner === o.id}
                onSelect={() => setTargetOwner((prev) => prev === o.id ? '' : o.id)}
                isDark={isDark}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: `1px solid ${border}` }}>
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.06em', cursor: 'pointer',
              border: 'none', backgroundColor: 'transparent',
              color: tab === key ? '#6b1212' : muted,
              borderBottom: `2px solid ${tab === key ? '#6b1212' : 'transparent'}`,
              marginBottom: '-1px', transition: 'color 0.12s ease',
            }}
          >
            <Icon style={{ width: '12px', height: '12px' }} />
            {label}
            {count > 0 && (
              <span style={{
                fontSize: '8px', fontWeight: 800,
                backgroundColor: tab === key ? '#6b1212' : (isDark ? 'rgba(255,255,255,0.12)' : '#eaecf0'),
                color: tab === key ? '#fff' : muted,
                borderRadius: '3px', padding: '1px 5px',
              }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {err && (
        <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(184,53,53,0.10)', border: '1px solid rgba(184,53,53,0.25)', fontSize: '12px', color: '#b83535' }}>
          {err}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: muted, fontSize: '12px' }}>
          Carregando...
        </div>
      ) : tab === 'history' ? (
        <HistoryTab history={history} owners={owners} isDark={isDark} border={border} card={card} text={text} muted={muted} />
      ) : (
        <>
          {/* Leads table — toolbar + headers + scrollable rows all in one container */}
          {(() => {
            const COL = tab === 'todos' ? '36px 1fr 120px 100px 140px 100px 40px' : '36px 1fr 120px 100px 100px'
            const headers = tab === 'todos'
              ? ['Lead / Empresa', 'Segmento', 'Origem', 'Proprietário', 'Criado em', '']
              : ['Lead / Empresa', 'Segmento', 'Origem', 'Criado em']

            return (
              <div style={{ backgroundColor: card, borderRadius: '8px', border: `1px solid ${border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* ── Toolbar fixa ── */}
                <ActionBar
                  selectedCount={selected.size}
                  owners={owners}
                  workload={workload}
                  targetOwner={targetOwner}
                  onTargetChange={setTargetOwner}
                  onAssign={handleAssign}
                  onDistributeEqually={() => handleDistributeEqually()}
                  distributing={distributing}
                  isDark={isDark}
                  border={border}
                  card={card}
                  text={text}
                  muted={muted}
                  search={search}
                  onSearch={setSearch}
                />
                {/* Table header — fixed */}
                <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0 16px', height: '36px', alignItems: 'center', borderBottom: `1px solid ${border}`, backgroundColor: isDark ? '#0d0c0a' : '#fafaf9', flexShrink: 0 }}>
                  <button type="button" onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', alignItems: 'center', padding: 0 }}>
                    {allSelected ? <CheckSquare style={{ width: '13px', height: '13px', color: '#6b1212' }} /> : <Square style={{ width: '13px', height: '13px' }} />}
                  </button>
                  {headers.map((h, i) => (
                    <span key={i} style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted }}>{h}</span>
                  ))}
                </div>

                {/* Scrollable body — 12 rows */}
                <div style={{ overflowY: 'auto', maxHeight: `${12 * 50}px` }}>
                  {activeList.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: muted, fontSize: '12px' }}>
                      {q ? 'Nenhum resultado' : (tab === 'leads' ? 'Nenhum lead sem proprietário' : 'Sem leads')}
                    </div>
                  ) : (
                    activeList.map((deal) => {
                      const isSelected     = selected.has(deal.id)
                      const seg            = deal.segment ?? ''
                      const currentOwnerId = ('owner_id' in deal ? (deal as AllDeal).owner_id : null) ?? ''
                      const owner          = currentOwnerId ? owners.find((o) => o.id === currentOwnerId) : undefined

                      return (
                        <div
                          key={deal.id}
                          onClick={() => toggleOne(deal.id)}
                          style={{
                            display: 'grid', gridTemplateColumns: COL,
                            padding: '0 16px', height: '50px', alignItems: 'center',
                            borderBottom: `1px solid ${border}`,
                            backgroundColor: isSelected ? (isDark ? 'rgba(227,30,36,0.08)' : 'rgba(227,30,36,0.05)') : 'transparent',
                            cursor: 'pointer', transition: 'background-color 0.1s ease',
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = hoverBg }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {isSelected ? <CheckSquare style={{ width: '13px', height: '13px', color: '#6b1212' }} /> : <Square style={{ width: '13px', height: '13px', color: muted }} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{deal.title}</p>
                            <p style={{ fontSize: '10px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>{deal.company_name}</p>
                          </div>
                          <div>
                            {seg ? (
                              <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: '3px', backgroundColor: SEG_BG[seg] ?? '#eaecf0', color: SEG_COLOR[seg] ?? muted }}>
                                {seg}
                              </span>
                            ) : <span style={{ fontSize: '10px', color: muted }}>—</span>}
                          </div>
                          <span style={{ fontSize: '10px', color: muted }}>{deal.lead_source ?? '—'}</span>
                          {tab === 'todos' && <OwnerBadge owner={owner} isDark={isDark} />}
                          <span style={{ fontSize: '10px', color: muted }}>{fmtDateShort(deal.created_at)}</span>
                          {tab === 'todos' && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              {currentOwnerId && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleUnassign(deal.id) }}
                                  title="Remover proprietário"
                                  style={{
                                    width: '26px', height: '26px', borderRadius: '6px',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#eaecf0'}`,
                                    backgroundColor: 'transparent', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted,
                                    transition: 'all 0.15s',
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#b83535'; e.currentTarget.style.color = '#b83535'; e.currentTarget.style.backgroundColor = isDark ? 'rgba(184,53,53,0.12)' : 'rgba(184,53,53,0.07)' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#eaecf0'; e.currentTarget.style.color = muted; e.currentTarget.style.backgroundColor = 'transparent' }}
                                >
                                  <UserMinus style={{ width: '11px', height: '11px' }} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {activeList.length > 12 && (
                  <div style={{ padding: '8px 16px', borderTop: `1px solid ${border}`, backgroundColor: isDark ? '#0d0c0a' : '#fafaf9' }}>
                    <span style={{ fontSize: '10px', color: muted }}>{activeList.length} leads no total</span>
                  </div>
                )}
              </div>
            )
          })()}

          {q && activeList.length > 0 && (
            <p style={{ fontSize: '10px', color: muted, textAlign: 'center' }}>
              {activeList.length} resultado{activeList.length !== 1 ? 's' : ''} para "{search}"
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ─── HistoryTab ───────────────────────────────────────────────────────────────

function HistoryTab({ history, owners, isDark, border, card, text, muted }: {
  history: DistributionLogEntry[]; owners: Owner[]
  isDark: boolean; border: string; card: string; text: string; muted: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {history.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: muted, fontSize: '12px', backgroundColor: card, borderRadius: '8px', border: `1px solid ${border}` }}>
          Sem histórico ainda
        </div>
      ) : history.map((entry) => {
        const assignments = Object.entries(entry.assignments)
        const isAuto = entry.distribution_type === 'auto_equal'
        return (
          <div key={entry.id} style={{
            backgroundColor: card, borderRadius: '8px', border: `1px solid ${border}`,
            padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            {/* Row 1: date + type + count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: muted }}>{fmtDate(entry.created_at)}</span>
              <span style={{
                fontSize: '8px', fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
                padding: '2px 7px', borderRadius: '3px',
                backgroundColor: isAuto ? 'rgba(37,99,235,0.12)' : 'rgba(124,58,237,0.12)',
                color: isAuto ? '#2563eb' : '#7c3aed',
              }}>
                {isAuto ? 'Distribuição automática' : 'Atribuição manual'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: text }}>
                {entry.deal_ids.length} lead{entry.deal_ids.length !== 1 ? 's' : ''}
              </span>
            </div>
            {/* Row 2: assignments per owner */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {assignments.map(([ownerId, ids]) => {
                const owner = owners.find((o) => o.id === ownerId)
                const count = (ids as string[]).length
                return (
                  <div key={ownerId} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '4px 8px', borderRadius: '5px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  }}>
                    {owner && (
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '3px', backgroundColor: owner.avatar_color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '6px', fontWeight: 800, color: '#fff',
                      }}>
                        {owner.initials}
                      </div>
                    )}
                    <span style={{ fontSize: '10px', fontWeight: 600, color: text }}>
                      {owner?.name.split(' ')[0] ?? ownerId.slice(0, 8)}
                    </span>
                    <span style={{ fontSize: '10px', color: muted }}>+{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
