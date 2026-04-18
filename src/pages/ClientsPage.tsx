import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, TrendingUp, ArrowRight } from 'lucide-react'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { STAGES } from '@/constants/pipeline'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

const SIZE_LABELS: Record<string, string> = {
  '1-50': '1–50', '51-200': '51–200', '201-1000': '201–1k', '1000+': '1k+',
}

export function ClientsPage() {
  const deals    = useDealStore((s) => s.deals)
  const isDark   = useThemeStore((s) => s.isDark)
  const navigate = useNavigate()

  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const cardBg  = isDark ? '#161614' : '#ffffff'
  const hoverBg = isDark ? '#1c1c1a' : '#f8f7f4'
  const trackBg = isDark ? '#1e1e1c' : '#eeece8'

  const companies = useMemo(() => {
    const map = new Map<string, {
      name: string
      sector?: string
      size?: string
      website?: string
      deals: typeof deals
    }>()

    for (const deal of deals) {
      const name = deal.company_name ?? ''
      if (!name) continue
      const key = name.toLowerCase()
      if (!map.has(key)) {
        map.set(key, {
          name,
          sector: deal.company_sector ?? undefined,
          size: deal.company_size ?? undefined,
          website: deal.company_website ?? undefined,
          deals: [],
        })
      }
      map.get(key)!.deals.push(deal)
    }

    return [...map.values()]
      .map((c) => {
        const active   = c.deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
        const won      = c.deals.filter((d) => d.stage_id === 'closed_won')
        // Cast to number because Supabase returns numeric columns as strings
        const pipeline = active.reduce((s, d) => s + Number(d.value), 0)
        const revenue  = won.reduce((s, d) => s + Number(d.value), 0)
        const latestStage = c.deals
          .filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
          .sort((a, b) => {
            const ai = STAGES.findIndex((s) => s.id === a.stage_id)
            const bi = STAGES.findIndex((s) => s.id === b.stage_id)
            return bi - ai
          })[0]?.stage_id
        return { ...c, active: active.length, won: won.length, pipeline, revenue, latestStage }
      })
      .sort((a, b) => b.pipeline - a.pipeline || b.revenue - a.revenue)
  }, [deals])

  const totalPipeline = useMemo(() => companies.reduce((s, c) => s + c.pipeline, 0), [companies])
  const totalWon      = useMemo(() => companies.reduce((s, c) => s + c.revenue, 0), [companies])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Clientes</p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
            {`${companies.length} empresas · ${fmt(totalPipeline)} em pipeline · ${fmt(totalWon)} fechado`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#2c5545', backgroundColor: '#2c554514', border: '1px solid #2c554530', borderRadius: '6px', padding: '5px 10px' }}>
          <TrendingUp style={{ width: '12px', height: '12px' }} />
          {companies.filter((c) => c.active > 0).length} ativos
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        {companies.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
            <Building2 style={{ width: '28px', height: '28px', color: border }} />
            <p style={{ fontSize: '13px', fontWeight: 600, color: muted }}>Nenhum cliente ainda</p>
            <p style={{ fontSize: '12px', color: isDark ? '#3a3834' : '#c4bfb8' }}>Adicione deals no Pipeline para ver clientes aqui</p>
          </div>
        ) : (
          <div style={{ minWidth: '640px' }}>
            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(80px, 110px) minmax(60px, 80px) minmax(100px, 120px) minmax(100px, 120px) 32px',
              padding: '8px 20px', gap: '10px',
              borderBottom: `1px solid ${border}`, flexShrink: 0,
              position: 'sticky', top: 0,
              backgroundColor: isDark ? '#0d0c0a' : '#f5f4f0',
              zIndex: 1,
            }}>
              {['Empresa', 'Setor', 'Tam.', 'Pipeline', 'Fechado'].map((h) => (
                <p key={h} style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
              ))}
              <span />
            </div>

            {companies.map((company) => {
              const latestDeal  = company.deals.find((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
              const stage       = STAGES.find((s) => s.id === company.latestStage)
              const ownerColors = [...new Set(
                company.deals
                  .map((d) => d.owner?.avatar_color)
                  .filter((c): c is string => Boolean(c))
              )].slice(0, 3)

              return (
                <button
                  key={company.name}
                  type="button"
                  onClick={() => latestDeal && navigate(`/deal/${latestDeal.id}`)}
                  style={{
                    display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(80px, 110px) minmax(60px, 80px) minmax(100px, 120px) minmax(100px, 120px) 32px',
                    width: '100%', padding: '12px 20px', gap: '10px', alignItems: 'center',
                    borderBottom: `1px solid ${border}`,
                    background: 'none',
                    cursor: latestDeal ? 'pointer' : 'default',
                    textAlign: 'left', transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => { if (latestDeal) e.currentTarget.style.backgroundColor = hoverBg }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {/* Company */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                      backgroundColor: trackBg, border: `1px solid ${border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Building2 style={{ width: '14px', height: '14px', color: muted }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {company.name}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        {stage && (
                          <span style={{
                            fontSize: '9px', fontWeight: 700, color: stage.color,
                            backgroundColor: `${stage.color}14`, borderRadius: '3px', padding: '1px 5px',
                          }}>
                            {stage.label}
                          </span>
                        )}
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {ownerColors.map((color, i) => (
                            <div key={i} style={{
                              width: '14px', height: '14px', borderRadius: '50%',
                              backgroundColor: color, border: `1px solid ${cardBg}`,
                            }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sector */}
                  <p style={{ fontSize: '12px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {company.sector ?? '—'}
                  </p>

                  {/* Size */}
                  <p style={{ fontSize: '12px', color: muted }}>
                    {company.size ? SIZE_LABELS[company.size] ?? company.size : '—'}
                  </p>

                  {/* Pipeline */}
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: text, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                      {company.pipeline > 0 ? fmt(company.pipeline) : '—'}
                    </p>
                    {company.active > 0 && (
                      <p style={{ fontSize: '10px', color: muted, marginTop: '1px' }}>
                        {company.active} deal{company.active > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Won */}
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: company.revenue > 0 ? '#2d9e6b' : muted, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                      {company.revenue > 0 ? fmt(company.revenue) : '—'}
                    </p>
                    {company.won > 0 && (
                      <p style={{ fontSize: '10px', color: '#2d9e6b', marginTop: '1px' }}>
                        {company.won} fechado{company.won > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  {latestDeal
                    ? <ArrowRight style={{ width: '14px', height: '14px', color: muted }} />
                    : <span />
                  }
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
