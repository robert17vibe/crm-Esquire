import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Briefcase, Target, DollarSign,
  Video, Phone, CheckSquare, Mail, ArrowRight,
} from 'lucide-react'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { STAGES } from '@/constants/pipeline'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso))
}

function daysDiff(iso: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(iso); d.setHours(0,0,0,0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

const ACT_ICON = { meeting: Video, call: Phone, task: CheckSquare, email: Mail } as const

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, accent, isDark,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  accent: string
  isDark: boolean
}) {
  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'

  return (
    <div style={{
      backgroundColor: bg, border: `1px solid ${border}`,
      borderRadius: '8px', padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </p>
        <div style={{
          width: '30px', height: '30px', borderRadius: '6px',
          backgroundColor: `${accent}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: '14px', height: '14px', color: accent }} />
        </div>
      </div>
      <div>
        <p style={{ fontSize: '24px', fontWeight: 700, color: text, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </p>
        {sub && (
          <p style={{ fontSize: '11px', color: muted, marginTop: '4px' }}>{sub}</p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const deals    = useDealStore((s) => s.deals)
  const isDark   = useThemeStore((s) => s.isDark)
  const navigate = useNavigate()

  const activeDeals  = useMemo(() => deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id)), [deals])
  const closedWon    = useMemo(() => deals.filter((d) => d.stage_id === 'closed_won'), [deals])
  const closedLost   = useMemo(() => deals.filter((d) => d.stage_id === 'closed_lost'), [deals])
  const pipelineVal  = useMemo(() => activeDeals.reduce((s, d) => s + d.value, 0), [activeDeals])
  const wonVal       = useMemo(() => closedWon.reduce((s, d) => s + d.value, 0), [closedWon])
  const winRate      = closedWon.length + closedLost.length > 0
    ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100)
    : 0
  const avgTicket    = activeDeals.length > 0 ? pipelineVal / activeDeals.length : 0

  const activeStages   = STAGES.filter((s) => !s.is_closed)
  const stageBreakdown = useMemo(() => activeStages.map((stage) => {
    const sd  = activeDeals.filter((d) => d.stage_id === stage.id)
    return { stage, count: sd.length, value: sd.reduce((s, d) => s + d.value, 0) }
  }), [activeDeals])
  const maxStageVal = Math.max(...stageBreakdown.map((s) => s.value), 1)

  const upcoming = useMemo(() =>
    deals
      .filter((d) => d.next_activity)
      .map((d) => ({ deal: d, activity: d.next_activity! }))
      .sort((a, b) => a.activity.due_date.localeCompare(b.activity.due_date))
      .slice(0, 6)
  , [deals])

  const cardBg  = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const trackBg = isDark ? '#1e1e1c' : '#eeece8'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center',
        padding: '0 20px', borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>
            Dashboard
          </p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
            Visão geral do pipeline
          </p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <KpiCard label="Pipeline Ativo"  value={fmt(pipelineVal)}  sub={`${activeDeals.length} deals ativos`}     icon={TrendingUp} accent="#5b50e8" isDark={isDark} />
          <KpiCard label="Deals Ativos"    value={String(activeDeals.length)} sub="em andamento"              icon={Briefcase}  accent="#4a90d9" isDark={isDark} />
          <KpiCard label="Win Rate"        value={`${winRate}%`}     sub={`${closedWon.length} fechados ganhos`}    icon={Target}     accent="#2d9e6b" isDark={isDark} />
          <KpiCard label="Ticket Médio"    value={fmt(avgTicket)}    sub={fmt(wonVal) + ' em contratos'}           icon={DollarSign} accent="#78909c" isDark={isDark} />
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '12px' }}>

          {/* Pipeline por etapa */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: text, marginBottom: '16px' }}>
              Pipeline por Etapa
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {stageBreakdown.map(({ stage, count, value }) => (
                <div key={stage.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stage.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: text }}>{stage.label}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: muted, backgroundColor: trackBg, borderRadius: '3px', padding: '1px 5px' }}>
                        {count}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: muted, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                      {value > 0 ? fmt(value) : '—'}
                    </span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '99px', backgroundColor: trackBg, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px',
                      width: `${Math.round((value / maxStageVal) * 100)}%`,
                      backgroundColor: stage.color, opacity: 0.85,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${border}`, display: 'flex', gap: '24px' }}>
              {[
                { label: 'Ganhos', value: wonVal, color: '#2d9e6b' },
                { label: 'Perdidos', value: closedLost.reduce((s, d) => s + d.value, 0), color: isDark ? '#fc8181' : '#c53030' },
                { label: 'Win Rate', value: null, color: text },
              ].map(({ label, value: v, color }) => (
                <div key={label}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                    {v !== null ? fmt(v) : `${winRate}%`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Próximas atividades */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: text, marginBottom: '12px' }}>
              Próximas Atividades
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              {upcoming.map(({ deal, activity }) => {
                const diff      = daysDiff(activity.due_date)
                const Icon      = ACT_ICON[activity.type] ?? CheckSquare
                const urgent    = diff < 0
                const today     = diff === 0
                const dateColor = urgent ? '#c53030' : today ? '#b45309' : muted

                return (
                  <button
                    key={deal.id}
                    type="button"
                    onClick={() => navigate(`/deal/${deal.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px', borderRadius: '6px',
                      border: 'none', backgroundColor: 'transparent',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trackBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      backgroundColor: `${deal.owner.avatar_color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon style={{ width: '12px', height: '12px', color: deal.owner.avatar_color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.company_name}
                      </p>
                      <p style={{ fontSize: '10px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activity.label}
                      </p>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <p style={{ fontSize: '10px', fontWeight: 600, color: dateColor }}>
                        {urgent ? `${Math.abs(diff)}d atrás` : today ? 'Hoje' : diff === 1 ? 'Amanhã' : fmtDate(activity.due_date)}
                      </p>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        backgroundColor: deal.owner.avatar_color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '6px', fontWeight: 700,
                        marginTop: '3px', marginLeft: 'auto',
                      }}>
                        {deal.owner.initials}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => navigate('/pipeline')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${border}`,
                fontSize: '11px', fontWeight: 600, color: muted,
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#5b50e8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
            >
              Ver pipeline
              <ArrowRight style={{ width: '11px', height: '11px' }} />
            </button>
          </div>
        </div>

        {/* Deals recentes */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: text }}>Deals Recentes</p>
          </div>
          {[...deals]
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
            .slice(0, 5)
            .map((deal, i, arr) => {
              const stage = STAGES.find((s) => s.id === deal.stage_id)
              return (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => navigate(`/deal/${deal.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    width: '100%', padding: '12px 20px',
                    borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none',
                    backgroundColor: 'transparent', cursor: 'pointer',
                    transition: 'background-color 0.1s ease', textAlign: 'left', border: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trackBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ width: '3px', height: '32px', borderRadius: '99px', backgroundColor: stage?.color, flexShrink: 0, display: 'inline-block' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deal.title}
                    </p>
                    <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>
                      {deal.company_name} · {stage?.label}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: text, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                      {fmt(deal.value)}
                    </p>
                    <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>
                      {fmtDate(deal.updated_at)}
                    </p>
                  </div>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    backgroundColor: deal.owner.avatar_color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '7px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {deal.owner.initials}
                  </div>
                </button>
              )
            })}
        </div>

      </div>
    </div>
  )
}
