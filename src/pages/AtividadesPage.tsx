import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, CheckCircle2, Clock, TrendingUp, UserPlus, Zap, Filter } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { STAGES } from '@/constants/pipeline'

const STAGE_LABELS: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.id, s.label]))

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `${diff}m atrás`
  if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`
  if (diff < 10080) return `${Math.floor(diff / 1440)}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

type ActivityEvent = {
  id: string
  type: 'new_deal' | 'stage_move' | 'won' | 'lost' | 'value_update'
  dealId: string
  dealName: string
  company?: string
  fromStage?: string
  toStage?: string
  value?: number
  owner?: string
  ownerColor?: string
  date: string
}

export function AtividadesPage() {
  const isDark = useThemeStore((s) => s.isDark)
  const deals = useVisibleDeals()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'new_deal' | 'stage_move' | 'won'>('all')

  const border = isDark ? '#242422' : '#eaecf0'
  const text = isDark ? '#e8e4dc' : '#101828'
  const muted = isDark ? '#6b6560' : '#667085'
  const cardBg = isDark ? '#161614' : '#ffffff'
  const pageBg = isDark ? '#0d0c0a' : '#f9fafb'
  const subtleBg = isDark ? '#111110' : '#f3f4f6'

  const events = useMemo<ActivityEvent[]>(() => {
    const evts: ActivityEvent[] = []
    for (const deal of deals) {
      evts.push({
        id: `new-${deal.id}`,
        type: 'new_deal',
        dealId: deal.id,
        dealName: deal.name,
        company: deal.company_name ?? undefined,
        toStage: deal.stage,
        value: deal.value ?? undefined,
        owner: deal.owner_name ?? undefined,
        ownerColor: deal.owner_avatar_color ?? undefined,
        date: deal.created_at,
      })

      if (deal.stage === 'won') {
        evts.push({
          id: `won-${deal.id}`,
          type: 'won',
          dealId: deal.id,
          dealName: deal.name,
          company: deal.company_name ?? undefined,
          value: deal.value ?? undefined,
          owner: deal.owner_name ?? undefined,
          ownerColor: deal.owner_avatar_color ?? undefined,
          date: deal.updated_at ?? deal.created_at,
        })
      }
    }
    return evts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 80)
  }, [deals])

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter)

  const stats = useMemo(() => ({
    total: events.length,
    newDeals: events.filter((e) => e.type === 'new_deal').length,
    won: events.filter((e) => e.type === 'won').length,
    today: events.filter((e) => {
      const d = new Date(e.date)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length,
  }), [events])

  const EVENT_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    new_deal:    { icon: <UserPlus size={13} />,    color: '#2563eb', bg: '#2563eb18', label: 'Novo Lead' },
    stage_move:  { icon: <ArrowRight size={13} />,  color: '#7c3aed', bg: '#7c3aed18', label: 'Avançou' },
    won:         { icon: <CheckCircle2 size={13} />, color: '#15803d', bg: '#15803d18', label: 'Ganho' },
    lost:        { icon: <Zap size={13} />,          color: '#b91c22', bg: '#b91c2218', label: 'Perdido' },
    value_update:{ icon: <TrendingUp size={13} />,   color: '#b45309', bg: '#b4530918', label: 'Valor' },
  }

  function getInitials(name?: string) {
    if (!name) return '?'
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  }

  const FILTERS = [
    { key: 'all' as const, label: 'Tudo' },
    { key: 'new_deal' as const, label: 'Novos Leads' },
    { key: 'stage_move' as const, label: 'Movimentos' },
    { key: 'won' as const, label: 'Ganhos' },
  ]

  return (
    <div style={{ backgroundColor: pageBg, minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Activity size={18} color={isDark ? '#fff' : '#101828'} />
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>
              Atividades
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: muted, margin: 0 }}>
            Feed em tempo real de movimentos no pipeline
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total', value: stats.total, icon: <Activity size={14} />, color: '#667085' },
            { label: 'Hoje', value: stats.today, icon: <Clock size={14} />, color: '#2563eb' },
            { label: 'Leads', value: stats.newDeals, icon: <UserPlus size={14} />, color: '#7c3aed' },
            { label: 'Ganhos', value: stats.won, icon: <CheckCircle2 size={14} />, color: '#15803d' },
          ].map((s) => (
            <div key={s.label} style={{
              backgroundColor: cardBg,
              border: `1px solid ${border}`,
              borderRadius: '10px',
              padding: '16px',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: s.color }}>
                {s.icon}
                <span style={{ fontSize: '11px', fontWeight: 500, color: muted }}>{s.label}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: text, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.04em' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          backgroundColor: cardBg,
          border: `1px solid ${border}`,
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
        }}>
          <Filter size={13} color={muted} />
          <span style={{ fontSize: '12px', color: muted, marginRight: '4px' }}>Filtrar:</span>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                border: `1px solid ${filter === f.key ? '#101828' : border}`,
                backgroundColor: filter === f.key ? (isDark ? '#ffffff' : '#101828') : 'transparent',
                color: filter === f.key ? (isDark ? '#000' : '#fff') : muted,
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div style={{
          backgroundColor: cardBg,
          border: `1px solid ${border}`,
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.06)',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: muted, fontSize: '13px' }}>
              Nenhuma atividade encontrada
            </div>
          ) : (
            filtered.map((evt, i) => {
              const cfg = EVENT_ICONS[evt.type]
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => navigate(`/deal/${evt.dealId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    width: '100%', padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer', textAlign: 'left',
                    border: 'none',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = subtleBg }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {/* Event type icon */}
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    backgroundColor: cfg.bg, color: cfg.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {evt.dealName}
                      </span>
                      {evt.company && (
                        <span style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          · {evt.company}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, color: cfg.color,
                        backgroundColor: cfg.bg, borderRadius: '4px', padding: '1px 6px',
                        letterSpacing: '0.03em', textTransform: 'uppercase',
                      }}>
                        {cfg.label}
                      </span>
                      {evt.toStage && evt.type !== 'won' && (
                        <span style={{ fontSize: '11px', color: muted }}>
                          {STAGE_LABELS[evt.toStage] ?? evt.toStage}
                        </span>
                      )}
                      {evt.value && (
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#15803d' }}>
                          {fmt(evt.value)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Owner + time */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    {evt.owner && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '5px',
                          backgroundColor: evt.ownerColor ?? '#667085',
                          color: '#fff', fontSize: '8px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {getInitials(evt.owner)}
                        </div>
                        <span style={{ fontSize: '11px', color: muted }}>{evt.owner.split(' ')[0]}</span>
                      </div>
                    )}
                    <span style={{ fontSize: '11px', color: muted }}>{timeAgo(evt.date)}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
