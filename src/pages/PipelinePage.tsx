import { useState, useMemo, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Zap, LayoutGrid, List, RefreshCcw, CheckSquare, ChevronDown, ChevronRight, Clock, Kanban, FileText } from 'lucide-react'

import { useTaskStore } from '@/store/useTaskStore'
import { useAuthStore } from '@/store/useAuthStore'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { NewLeadModal } from '@/components/pipeline/NewLeadModal'
import { EditDealModal } from '@/components/pipeline/EditDealModal'
import { PageEmptyState, PageLoadingState } from '@/components/ui/PageState'
import { useDealStore } from '@/store/useDealStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { STAGES } from '@/constants/pipeline'
import type { Deal } from '@/types/deal.types'

type ViewMode = 'kanban' | 'list' | 'renovacao'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.id, s.label]))
const STAGE_COLOR: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.id, s.color]))

// ─── Brazil map — coordinate system 500×500 ──────────────────────────────────
// lon: -73.98..−28.85  x = (lon + 73.98) / 45.13 * 500
// lat:  −33.75..5.27   y = (5.27 − lat)  / 39.02 * 500

const BRAZIL_OUTLINE = '144,3 180,14 220,8 243,16 252,22 260,24 258,35 255,48 260,56 271,61 278,68 288,80 305,85 321,86 338,91 355,100 376,108 393,115 407,126 418,135 427,140 429,142 432,153 432,168 430,180 424,192 418,198 409,207 403,217 395,226 393,234 390,244 387,258 382,270 379,298 376,313 374,327 368,338 358,348 342,360 328,366 313,370 306,372 298,381 290,394 283,411 272,426 258,438 252,443 244,457 236,472 228,500 222,480 217,465 213,450 213,440 214,388 212,372 208,360 201,352 194,349 179,349 179,340 180,328 181,318 181,314 181,296 181,285 178,276 170,269 162,267 155,266 153,250 152,236 153,230 145,216 133,197 112,181 96,186 82,196 72,206 52,196 30,178 15,166 22,153 32,140 46,120 54,105 64,89 76,65 95,52 113,42 130,34 147,31 144,3'

const BR_STATES = [
  { abbr: 'SP', x: 303, y: 368 }, { abbr: 'RJ', x: 345, y: 358 },
  { abbr: 'MG', x: 333, y: 320 }, { abbr: 'RS', x: 240, y: 455 },
  { abbr: 'PR', x: 268, y: 393 }, { abbr: 'SC', x: 271, y: 422 },
  { abbr: 'BA', x: 380, y: 240 }, { abbr: 'PE', x: 415, y: 172 },
  { abbr: 'CE', x: 393, y: 128 }, { abbr: 'GO', x: 273, y: 268 },
  { abbr: 'DF', x: 290, y: 270 }, { abbr: 'MT', x: 200, y: 255 },
  { abbr: 'MS', x: 218, y: 330 }, { abbr: 'PA', x: 268, y: 125 },
  { abbr: 'AM', x: 130, y: 122 }, { abbr: 'RO', x: 130, y: 196 },
  { abbr: 'TO', x: 290, y: 200 }, { abbr: 'MA', x: 332, y: 120 },
  { abbr: 'PI', x: 355, y: 148 }, { abbr: 'PB', x: 430, y: 157 },
  { abbr: 'RN', x: 430, y: 140 }, { abbr: 'AL', x: 422, y: 188 },
  { abbr: 'SE', x: 410, y: 203 }, { abbr: 'ES', x: 376, y: 315 },
  { abbr: 'AC', x:  80, y: 188 }, { abbr: 'RR', x: 147, y:  28 },
  { abbr: 'AP', x: 254, y:  55 },
]

function hashNum(s: string, mod: number) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % mod
}

// ─── Stage Funnel (subtle) ────────────────────────────────────────────────────

export function StageFunnel({ deals, isDark, border, muted }: {
  deals: Deal[]
  isDark: boolean
  border: string
  muted: string
}) {
  const activeStages = STAGES.filter((s) => s.id !== 'closed_won' && s.id !== 'closed_lost')
  const counts = activeStages.map((s) => ({
    ...s,
    count: deals.filter((d) => d.stage_id === s.id).length,
  }))
  const maxCount = Math.max(...counts.map((s) => s.count), 1)
  const totalValue = deals.reduce((s, d) => s + (d.value ?? 0), 0)
  const wonCount = deals.filter((d) => d.stage_id === 'closed_won').length
  const closedCount = deals.filter((d) => d.stage_id === 'closed_won' || d.stage_id === 'closed_lost').length
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0
  const textStrong = isDark ? '#c8c4bc' : '#374151'

  return (
    <div style={{
      borderBottom: `1px solid ${border}`,
      backgroundColor: isDark ? '#0f0e0d' : '#fafaf9',
      padding: '7px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      flexShrink: 0,
      overflowX: 'auto',
    }}>
      {counts.map((stage, i) => {
        const barWidth = Math.max(6, Math.round((stage.count / maxCount) * 100))
        const convPct = i > 0 && counts[i - 1].count > 0
          ? Math.round((stage.count / counts[i - 1].count) * 100)
          : null

        return (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {i > 0 && (
              <div style={{ padding: '0 5px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '12px', height: '1px', backgroundColor: border }} />
                {convPct !== null && (
                  <span style={{ fontSize: '8px', color: isDark ? '#3a3a38' : '#d1d5db', marginTop: '1px', whiteSpace: 'nowrap' }}>
                    {convPct}%
                  </span>
                )}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, padding: '1px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: stage.color, flexShrink: 0 }} />
                <span style={{ fontSize: '9px', fontWeight: 500, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stage.label}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: textStrong, fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>
                  {stage.count}
                </span>
              </div>
              <div style={{ height: '2px', borderRadius: '1px', backgroundColor: isDark ? '#1a1a18' : '#eeece8', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${barWidth}%`,
                  backgroundColor: stage.color,
                  borderRadius: '1px',
                  opacity: stage.count === 0 ? 0.15 : 0.7,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          </div>
        )
      })}

      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        paddingLeft: '14px', marginLeft: '8px',
        borderLeft: `1px solid ${border}`,
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '8px', color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1px' }}>Pipeline</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: textStrong, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.02em' }}>
            {fmt(totalValue)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '8px', color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1px' }}>Win Rate</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: winRate >= 50 ? '#2c5545' : winRate >= 25 ? '#a88030' : textStrong, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.02em' }}>
            {winRate}%
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Mapa View ────────────────────────────────────────────────────────────────

export function MapaView({ deals, isDark, border, muted }: { deals: Deal[]; isDark: boolean; border: string; muted: string }) {
  const navigate = useNavigate()
  const [tooltip, setTooltip] = useState<{ deal: Deal; svgX: number; svgY: number } | null>(null)
  const [hoveredDeal, setHoveredDeal] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const oceanBg  = isDark ? '#0c1220' : '#dbeafe'
  const landFill = isDark ? '#1a2438' : '#e8f0f7'
  const landStroke = isDark ? '#2a3a58' : '#93c5fd'
  const cardBg   = isDark ? '#161614' : '#ffffff'
  const text      = isDark ? '#e8e4dc' : '#101828'
  const stateLabelCol = isDark ? 'rgba(150,170,210,0.45)' : 'rgba(30,60,120,0.35)'

  const stageDeals = STAGES.filter((s) => s.id !== 'closed_lost').map((s) => ({
    ...s,
    count: deals.filter((d) => d.stage_id === s.id).length,
    value: deals.filter((d) => d.stage_id === s.id).reduce((sum, d) => sum + (d.value ?? 0), 0),
  })).filter((s) => s.count > 0)

  const maxValue = Math.max(...deals.map((d) => d.value ?? 0), 1)

  const dealDots = deals.filter((d) => d.stage_id !== 'closed_lost').map((deal) => {
    const stateIdx = hashNum(deal.id, BR_STATES.length)
    const state = BR_STATES[stateIdx]
    const jx = ((hashNum(deal.id + 'x', 100) - 50) / 50) * 10
    const jy = ((hashNum(deal.id + 'y', 100) - 50) / 50) * 10
    const r = 5 + Math.round(((deal.value ?? 0) / maxValue) * 7)
    return { deal, x: state.x + jx, y: state.y + jy, color: STAGE_COLOR[deal.stage_id] ?? '#94a3b8', r }
  })

  function handleDotEnter(e: React.MouseEvent<SVGCircleElement>, deal: Deal, x: number, y: number) {
    setHoveredDeal(deal.id)
    setTooltip({ deal, svgX: x, svgY: y })
    e.currentTarget.setAttribute('r', String(Number(e.currentTarget.getAttribute('r')) + 3))
  }
  function handleDotLeave(e: React.MouseEvent<SVGCircleElement>, origR: number) {
    setHoveredDeal(null)
    setTooltip(null)
    e.currentTarget.setAttribute('r', String(origR))
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{
        width: '240px', flexShrink: 0, borderRight: `1px solid ${border}`,
        backgroundColor: cardBg, overflowY: 'auto', padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
          Por etapa
        </div>
        {stageDeals.map((s) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 10px', borderRadius: '8px',
            backgroundColor: isDark ? '#0f0f0e' : '#f9f9f8',
            border: `1px solid ${isDark ? '#1e1e1c' : '#eeece8'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: text, fontFamily: "'Geist Mono', monospace" }}>{s.count}</span>
              <div style={{ fontSize: '9px', color: muted, fontFamily: "'Geist Mono', monospace" }}>{fmt(s.value)}</div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: '10px', borderTop: `1px solid ${border}`, paddingTop: '12px' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Top leads
          </div>
          {[...deals].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 10).map((deal) => (
            <div
              key={deal.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/clients?search=${encodeURIComponent(deal.company_name || deal.title)}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/clients?search=${encodeURIComponent(deal.company_name || deal.title)}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 6px', borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: hoveredDeal === deal.id ? (isDark ? '#1a1a18' : '#f5f4f0') : 'transparent',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={() => setHoveredDeal(deal.id)}
              onMouseLeave={() => setHoveredDeal(null)}
            >
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: STAGE_COLOR[deal.stage_id] ?? '#94a3b8', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {deal.company_name || deal.title}
                </div>
                <div style={{ fontSize: '9px', color: muted, fontFamily: "'Geist Mono', monospace" }}>{fmt(deal.value ?? 0)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: oceanBg }}>

        {/* Subtle dot grid */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <defs>
            <pattern id="dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,80,200,0.07)'} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* Brazil SVG map */}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 500 500"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 0 }}
        >
          <defs>
            <filter id="land-shadow" x="-8%" y="-8%" width="116%" height="116%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={isDark ? '#000' : '#93c5fd'} floodOpacity="0.35" />
            </filter>
            <filter id="dot-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Brazil land */}
          <polygon
            points={BRAZIL_OUTLINE}
            fill={landFill}
            stroke={landStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
            filter="url(#land-shadow)"
          />

          {/* State reference marks */}
          {BR_STATES.map((s) => (
            <g key={s.abbr}>
              <circle cx={s.x} cy={s.y} r="2" fill={stateLabelCol} />
              <text
                x={s.x} y={s.y - 5}
                textAnchor="middle"
                fontSize="7"
                fill={stateLabelCol}
                fontFamily="'Geist Mono', monospace"
                fontWeight="700"
                letterSpacing="0.05em"
              >{s.abbr}</text>
            </g>
          ))}

          {/* Deal dots */}
          {dealDots.map(({ deal, x, y, color, r }) => (
            <g key={deal.id} filter={hoveredDeal === deal.id ? 'url(#dot-glow)' : undefined}>
              {/* Pulse ring */}
              <circle
                cx={x} cy={y}
                r={r + 5}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeOpacity={hoveredDeal === deal.id ? 0.5 : 0}
                style={{ transition: 'stroke-opacity 0.2s' }}
              />
              <circle
                cx={x} cy={y} r={r}
                fill={color}
                fillOpacity={hoveredDeal === deal.id ? 1 : 0.82}
                stroke={isDark ? '#0c1220' : '#fff'}
                strokeWidth="1.5"
                style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
                onMouseEnter={(e) => handleDotEnter(e, deal, x, y)}
                onMouseLeave={(e) => handleDotLeave(e, r)}
                onClick={() => navigate(`/clients?search=${encodeURIComponent(deal.company_name || deal.title)}`)}
              />
            </g>
          ))}

          {/* Tooltip rendered inside SVG as foreignObject */}
          {tooltip && (
            <foreignObject
              x={Math.min(tooltip.svgX + 14, 330)}
              y={Math.max(tooltip.svgY - 44, 4)}
              width="160" height="72"
              style={{ pointerEvents: 'none', overflow: 'visible' }}
            >
              <div style={{
                backgroundColor: cardBg,
                border: `1px solid ${border}`,
                borderRadius: '8px',
                padding: '8px 11px',
                boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.14)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '3px', whiteSpace: 'nowrap' }}>
                  {tooltip.deal.company_name || tooltip.deal.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: STAGE_COLOR[tooltip.deal.stage_id], flexShrink: 0 }} />
                  <span style={{ fontSize: '10px', color: muted, whiteSpace: 'nowrap' }}>
                    {STAGE_LABEL[tooltip.deal.stage_id]}
                  </span>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: STAGE_COLOR[tooltip.deal.stage_id], fontFamily: "'Geist Mono', monospace" }}>
                  {fmt(tooltip.deal.value ?? 0)}
                </div>
              </div>
            </foreignObject>
          )}
        </svg>

        {/* Top-right badge */}
        <div style={{
          position: 'absolute', top: '14px', right: '18px',
          backgroundColor: cardBg, border: `1px solid ${border}`,
          borderRadius: '8px', padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6b1212' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: text, fontFamily: "'Geist Mono', monospace" }}>
            {dealDots.length} leads ativos
          </span>
        </div>

        {/* Bottom watermark */}
        <div style={{
          position: 'absolute', bottom: '12px', right: '18px',
          fontSize: '9px', color: isDark ? 'rgba(150,170,220,0.2)' : 'rgba(30,60,120,0.2)',
          fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          Brasil · CRM Esquire
        </div>
      </div>
    </div>
  )
}

// ─── Renovação Kanban ─────────────────────────────────────────────────────────

const RENOV_COLUMNS = [
  { id: 'integracao', label: 'Integração',         color: '#4d7aa8', desc: 'Setup e briefing inicial' },
  { id: 'producao',   label: 'Em Produção',        color: '#7c5cbf', desc: 'Conteúdo sendo produzido' },
  { id: 'revisao',    label: 'Em Revisão',         color: '#a88030', desc: 'Aguardando aprovação do cliente' },
  { id: 'ativo',      label: 'Ativo',              color: '#2c5545', desc: 'Contrato em vigor' },
  { id: 'renovar',    label: 'Renovar',            color: '#a16207', desc: 'Período encerrado · a renegociar' },
  { id: 'encerrado',  label: 'Contrato Encerrado', color: '#4b5563', desc: 'Contrato vencido — reativar' },
]

type RenovColId = 'integracao' | 'producao' | 'revisao' | 'ativo' | 'renovar' | 'encerrado'

interface RenovMaterial {
  id: string
  type: 'briefing' | 'conteudo' | 'relatorio' | 'proposta' | 'contrato'
  label: string
  date: string
  status: 'enviado' | 'aprovado' | 'pendente'
}

interface RenovClient {
  id: string
  company: string
  contact: string
  sector: string
  value: number
  contractStart: string
  contractEnd: string
  col: RenovColId
  ownerName: string
  ownerColor: string
  notes: string
  material: RenovMaterial[]
}

const MOCK_RENOV_CLIENTS: RenovClient[] = [
  {
    id: 'rc-1', company: 'Itaú Unibanco', contact: 'Mariana Costa', sector: 'Financeiro',
    value: 84000, contractStart: '2026-01-10', contractEnd: '2026-12-10',
    col: 'ativo', ownerName: 'Rafael Mendes', ownerColor: '#4d7aa8',
    notes: 'Cliente VIP — contrato ativo e saudável. Foco em branded content financeiro para Q3.',
    material: [
      { id: 'm1', type: 'briefing',  label: 'Briefing Q1 2026',          date: '2026-01-12', status: 'aprovado' },
      { id: 'm2', type: 'conteudo',  label: 'Especial Investimentos',     date: '2026-02-08', status: 'aprovado' },
      { id: 'm3', type: 'relatorio', label: 'Relatório de Performance Q1',date: '2026-04-02', status: 'enviado'  },
    ],
  },
  {
    id: 'rc-2', company: 'BTG Pactual', contact: 'Rodrigo Alves', sector: 'Financeiro',
    value: 62000, contractStart: '2025-08-01', contractEnd: '2026-01-31',
    col: 'renovar', ownerName: 'Camila Nunes', ownerColor: '#a16207',
    notes: 'Contrato encerrou em jan/2026. Reunião de renegociação marcada para 10/05. Interesse em ampliar escopo para canais digitais.',
    material: [
      { id: 'm4', type: 'briefing',  label: 'Briefing Lançamento BTG+',   date: '2025-08-10', status: 'aprovado' },
      { id: 'm5', type: 'relatorio', label: 'Relatório Final de Entregas', date: '2026-02-05', status: 'enviado'  },
      { id: 'm6', type: 'proposta',  label: 'Proposta Renovação 2026/2',  date: '2026-04-20', status: 'pendente' },
    ],
  },
  {
    id: 'rc-8', company: 'Magazine Luiza', contact: 'Thiago Barros', sector: 'Varejo',
    value: 45000, contractStart: '2025-06-01', contractEnd: '2025-11-30',
    col: 'renovar', ownerName: 'Ana Beatriz', ownerColor: '#7c5cbf',
    notes: 'Parceria muito bem-sucedida em conteúdo de performance. Interesse em renovar com foco em vídeo e social. Budget aprovado internamente.',
    material: [
      { id: 'm17', type: 'relatorio', label: 'Relatório de Resultados H2/25',date: '2025-12-10', status: 'enviado'  },
      { id: 'm18', type: 'proposta',  label: 'Proposta Renovação + Vídeo',   date: '2026-04-15', status: 'pendente' },
    ],
  },
  {
    id: 'rc-3', company: 'BMW Brasil', contact: 'Stefan Kruger', sector: 'Automotivo',
    value: 96000, contractStart: '2026-03-01', contractEnd: '2027-02-28',
    col: 'producao', ownerName: 'Ana Beatriz', ownerColor: '#7c5cbf',
    notes: 'Campanha premium — 4 editoriais por trimestre. Material visual de alto padrão.',
    material: [
      { id: 'm7', type: 'briefing',  label: 'Briefing Série BMW M',       date: '2026-03-05', status: 'aprovado' },
      { id: 'm8', type: 'conteudo',  label: 'Editorial BMW M4 Competition', date: '2026-04-15', status: 'pendente' },
    ],
  },
  {
    id: 'rc-4', company: 'Amaro Fashion', contact: 'Juliana Rego', sector: 'Moda',
    value: 38000, contractStart: '2026-04-01', contractEnd: '2026-09-30',
    col: 'revisao', ownerName: 'Pedro Lima', ownerColor: '#a88030',
    notes: 'Aguardando aprovação do lookbook de inverno. 2ª revisão solicitada.',
    material: [
      { id: 'm9',  type: 'briefing',  label: 'Briefing Coleção Inverno 26', date: '2026-04-03', status: 'aprovado' },
      { id: 'm10', type: 'conteudo',  label: 'Lookbook Inverno — draft 2',  date: '2026-04-22', status: 'pendente' },
    ],
  },
  {
    id: 'rc-5', company: 'XP Investimentos', contact: 'Fernanda Souza', sector: 'Financeiro',
    value: 55000, contractStart: '2026-04-15', contractEnd: '2027-04-14',
    col: 'integracao', ownerName: 'Lucas Moreira', ownerColor: '#2c5545',
    notes: 'Novo cliente. Primeira reunião de kickoff realizada. Aguardando briefing completo.',
    material: [
      { id: 'm11', type: 'contrato', label: 'Contrato Assinado',           date: '2026-04-14', status: 'aprovado' },
    ],
  },
  {
    id: 'rc-6', company: 'Natura &Co', contact: 'Beatriz Andrade', sector: 'Beleza & Bem-estar',
    value: 72000, contractStart: '2025-01-01', contractEnd: '2025-12-31',
    col: 'encerrado', ownerName: 'Rafael Mendes', ownerColor: '#4d7aa8',
    notes: 'Contrato encerrado em dez/2025. Relacionamento muito positivo — diretor de marketing aberto a conversar sobre nova proposta. Foco em conteúdo institucional e ESG.',
    material: [
      { id: 'm12', type: 'relatorio', label: 'Relatório Anual 2025',        date: '2026-01-08', status: 'enviado'  },
      { id: 'm13', type: 'proposta',  label: 'Proposta Reativação 2026',    date: '2026-03-15', status: 'pendente' },
      { id: 'm14', type: 'briefing',  label: 'Briefing ESG — rascunho',     date: '2026-04-10', status: 'pendente' },
    ],
  },
  {
    id: 'rc-7', company: 'Localiza Rent a Car', contact: 'Carlos Menezes', sector: 'Mobilidade',
    value: 48000, contractStart: '2025-03-01', contractEnd: '2025-08-31',
    col: 'encerrado', ownerName: 'Camila Nunes', ownerColor: '#6b1212',
    notes: 'Encerrado por restrição orçamentária interna. CFO sinalizou revisão de budget em Q3/2026. Manter contato mensal.',
    material: [
      { id: 'm15', type: 'relatorio', label: 'Relatório de Entregas H1/25', date: '2025-09-05', status: 'enviado'  },
      { id: 'm16', type: 'proposta',  label: 'Proposta Reduzida Q3/2026',   date: '2026-04-18', status: 'pendente' },
    ],
  },
]

const MATERIAL_ICON: Record<string, string> = {
  briefing: '📋', conteudo: '✏️', relatorio: '📊', proposta: '📄', contrato: '✅',
}
const MATERIAL_STATUS_COLOR: Record<string, string> = {
  aprovado: '#2c5545', enviado: '#4d7aa8', pendente: '#a88030',
}

export function getRenovCol(deal: Deal): RenovColId {
  const daysSinceWon = deal.updated_at
    ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86_400_000)
    : 999
  const daysToClose = deal.expected_close
    ? Math.round((new Date(deal.expected_close).getTime() - Date.now()) / 86_400_000)
    : null

  if (daysToClose !== null && daysToClose < 0) return 'renovar'
  if (daysToClose !== null && daysToClose <= 30) return 'ativo'
  if (daysToClose !== null && daysToClose <= 90) return 'revisao'
  if (daysSinceWon <= 30) return 'integracao'
  if (daysSinceWon <= 180) return 'producao'
  return 'ativo'
}

// ─── Renovação Detail Panel ───────────────────────────────────────────────────

const MAT_TYPES: RenovMaterial['type'][] = ['briefing', 'conteudo', 'relatorio', 'proposta', 'contrato']
const MAT_TYPE_LABEL: Record<RenovMaterial['type'], string> = {
  briefing: 'Briefing', conteudo: 'Conteúdo', relatorio: 'Relatório', proposta: 'Proposta', contrato: 'Contrato',
}

function RenovacaoDetailPanel({ client, isDark, border, onClose, onMoveClient, onUpdateClient }: {
  client: RenovClient; isDark: boolean; border: string; onClose: () => void
  onMoveClient: (clientId: string, col: RenovColId) => void
  onUpdateClient: (clientId: string, updates: Partial<RenovClient>) => void
}) {
  const text  = isDark ? '#e8e4dc' : '#101828'
  const muted = isDark ? '#6b6560' : '#667085'
  const col   = RENOV_COLUMNS.find((c) => c.id === client.col)!
  const cardBg = isDark ? '#161614' : '#ffffff'
  const secBg  = isDark ? '#111110' : '#f8f7f5'
  const [moveOpen,    setMoveOpen]    = useState(false)
  const [addingMat,   setAddingMat]   = useState(false)
  const [newMatType,  setNewMatType]  = useState<RenovMaterial['type']>('briefing')
  const [newMatLabel, setNewMatLabel] = useState('')
  const [newMatStatus, setNewMatStatus] = useState<RenovMaterial['status']>('pendente')
  const [notes,       setNotes]       = useState(client.notes)
  const [renovChecks, setRenovChecks] = useState<Record<string, boolean>>({
    'Enviar relatório de resultados':    client.material.some((m) => m.type === 'relatorio' && m.status !== 'pendente'),
    'Apresentar proposta de renovação':  client.material.some((m) => m.type === 'proposta' && m.status === 'aprovado'),
    'Reunião de alinhamento de escopo':  false,
    'Assinar novo contrato':             false,
  })
  const [encChecks, setEncChecks] = useState<Record<string, boolean>>({
    'Enviar email de reativação':    true,
    'Agendar reunião de alinhamento': false,
    'Apresentar nova proposta':      false,
  })

  const contractDaysLeft = Math.round(
    (new Date(client.contractEnd).getTime() - Date.now()) / 86_400_000
  )
  const isExpiring  = contractDaysLeft <= 45 && contractDaysLeft > 0
  const isEncerrado = client.col === 'encerrado'
  const isRenovar   = client.col === 'renovar'

  function addMaterial() {
    if (!newMatLabel.trim()) return
    const mat: RenovMaterial = {
      id: `m-${Date.now()}`,
      type: newMatType,
      label: newMatLabel.trim(),
      date: new Date().toISOString().slice(0, 10),
      status: newMatStatus,
    }
    onUpdateClient(client.id, { material: [...client.material, mat] })
    setNewMatLabel('')
    setNewMatType('briefing')
    setNewMatStatus('pendente')
    setAddingMat(false)
  }

  function removeMaterial(matId: string) {
    onUpdateClient(client.id, { material: client.material.filter((m) => m.id !== matId) })
  }

  function cycleMaterialStatus(matId: string) {
    const order: RenovMaterial['status'][] = ['pendente', 'enviado', 'aprovado']
    onUpdateClient(client.id, {
      material: client.material.map((m) =>
        m.id === matId ? { ...m, status: order[(order.indexOf(m.status) + 1) % order.length] } : m
      ),
    })
  }

  const FLOW_STEPS: { id: RenovColId; label: string }[] = [
    { id: 'integracao', label: 'Integração' },
    { id: 'producao',   label: 'Produção'   },
    { id: 'revisao',    label: 'Revisão'    },
    { id: 'ativo',      label: 'Ativo'      },
    { id: 'renovar',    label: 'Renovar'    },
    { id: 'encerrado',  label: 'Encerrado'  },
  ]
  const stepIdx = FLOW_STEPS.findIndex((s) => s.id === client.col)

  return (
    <div
      className="view-enter"
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', zIndex: 50,
        backgroundColor: cardBg, borderLeft: `1px solid ${border}`,
        boxShadow: isDark ? '-8px 0 32px rgba(0,0,0,0.5)' : '-8px 0 32px rgba(16,24,40,0.14)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: `1px solid ${border}`,
        borderLeft: `4px solid ${col.color}`,
        backgroundColor: isDark ? `${col.color}12` : `${col.color}08`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <span style={{
              fontSize: '9px', fontWeight: 700, color: col.color,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              backgroundColor: `${col.color}18`, borderRadius: '4px', padding: '2px 8px',
            }}>{col.label}</span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginTop: '6px', letterSpacing: '-0.02em' }}>
              {client.company}
            </h2>
            <p style={{ fontSize: '12px', color: muted, marginTop: '2px' }}>{client.contact} · {client.sector}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Mover para dropdown */}
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={() => setMoveOpen((o) => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                Mover
                <ChevronDown size={12} />
              </button>
              {moveOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 10,
                  backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '10px',
                  boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(16,24,40,0.14)',
                  overflow: 'hidden', minWidth: '180px',
                }}>
                  {RENOV_COLUMNS.filter((c) => c.id !== client.col).map((c) => (
                    <button key={c.id} type="button"
                      onClick={() => { onMoveClient(client.id, c.id as RenovColId); setMoveOpen(false) }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '9px 14px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', color: text,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = isDark ? '#1e1e1c' : '#f5f4f0' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color, flexShrink: 0 }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={onClose}
              style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '7px', width: '30px', height: '30px', cursor: 'pointer', color: muted, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ×
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '9px', color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor contrato</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: text, fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.02em' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(client.value)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '9px', color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vigência</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: isExpiring ? '#6b1212' : text }}>
              {new Date(client.contractStart + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              {' — '}
              {new Date(client.contractEnd + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
            </p>
          </div>
          {isExpiring && (
            <div style={{ marginLeft: 'auto', backgroundColor: '#6b121218', border: '1px solid #6b121230', borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={11} color="#6b1212" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b1212' }}>
                {contractDaysLeft <= 0 ? 'Expirado' : `${contractDaysLeft}d restantes`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Fluxo de renovação */}
        <div style={{ backgroundColor: secBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '16px 18px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
            Fluxo de Renovação
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {FLOW_STEPS.map((step, i) => {
              const stepCol = RENOV_COLUMNS.find((c) => c.id === step.id)!
              const isActive  = i === stepIdx
              const isPast    = i < stepIdx
              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: isActive ? '28px' : '20px',
                      height: isActive ? '28px' : '20px',
                      borderRadius: '50%',
                      backgroundColor: isActive ? stepCol.color : isPast ? `${stepCol.color}40` : (isDark ? '#1e1e1c' : '#e8e6e0'),
                      border: isActive ? `2px solid ${stepCol.color}` : 'none',
                      boxShadow: isActive ? `0 0 0 4px ${stepCol.color}22` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease', flexShrink: 0,
                    }}>
                      {isPast && <span style={{ fontSize: '9px', color: '#fff', fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{
                      fontSize: '9px', fontWeight: isActive ? 700 : 400,
                      color: isActive ? stepCol.color : muted,
                      marginTop: '5px', textAlign: 'center', whiteSpace: 'nowrap',
                    }}>{step.label}</span>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div style={{
                      height: '2px', flex: 1, marginBottom: '14px',
                      backgroundColor: i < stepIdx ? RENOV_COLUMNS[i].color : (isDark ? '#1e1e1c' : '#e8e6e0'),
                      opacity: 0.5,
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Material enviado */}
        <div style={{ backgroundColor: secBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '16px 18px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            Material Enviado
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {client.material.map((m) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px',
                backgroundColor: isDark ? '#161614' : '#ffffff',
                border: `1px solid ${border}`,
              }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{MATERIAL_ICON[m.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                      {m.label}
                    </p>
                    {isRenovar && m.type === 'proposta' && (
                      <span style={{ fontSize: '8px', fontWeight: 700, color: '#a16207', backgroundColor: '#a1620718', borderRadius: '4px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>
                        Renovação
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '10px', color: muted }}>
                    {new Date(m.date + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </p>
                </div>
                {/* Status clicável — cicla entre pendente → enviado → aprovado */}
                <button type="button" title="Clique para alterar status"
                  onClick={() => cycleMaterialStatus(m.id)}
                  style={{
                    fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                    color: MATERIAL_STATUS_COLOR[m.status],
                    backgroundColor: `${MATERIAL_STATUS_COLOR[m.status]}15`,
                    border: `1px solid ${MATERIAL_STATUS_COLOR[m.status]}30`,
                    borderRadius: '999px', padding: '2px 8px', flexShrink: 0,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                  {m.status}
                </button>
                {/* Remover */}
                <button type="button" title="Remover" onClick={() => removeMaterial(m.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '14px', lineHeight: 1, padding: '2px', flexShrink: 0, opacity: 0.6 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6' }}
                >×</button>
              </div>
            ))}

            {/* Formulário inline de novo material */}
            {addingMat ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '9px', border: `1px dashed ${border}`, backgroundColor: isDark ? '#161614' : '#ffffff' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={newMatType} onChange={(e) => setNewMatType(e.target.value as RenovMaterial['type'])}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: isDark ? '#1a1a18' : '#f8f7f5', color: text, fontSize: '11px' }}>
                    {MAT_TYPES.map((t) => <option key={t} value={t}>{MAT_TYPE_LABEL[t]}</option>)}
                  </select>
                  <select value={newMatStatus} onChange={(e) => setNewMatStatus(e.target.value as RenovMaterial['status'])}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: isDark ? '#1a1a18' : '#f8f7f5', color: text, fontSize: '11px' }}>
                    <option value="pendente">Pendente</option>
                    <option value="enviado">Enviado</option>
                    <option value="aprovado">Aprovado</option>
                  </select>
                </div>
                <input
                  autoFocus
                  placeholder="Nome do documento…"
                  value={newMatLabel}
                  onChange={(e) => setNewMatLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addMaterial(); if (e.key === 'Escape') setAddingMat(false) }}
                  style={{ padding: '7px 10px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: isDark ? '#1a1a18' : '#f8f7f5', color: text, fontSize: '12px', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={addMaterial}
                    style={{ flex: 1, padding: '8px', borderRadius: '7px', backgroundColor: '#6b1212', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                    Adicionar
                  </button>
                  <button type="button" onClick={() => setAddingMat(false)}
                    style={{ padding: '8px 14px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, cursor: 'pointer', fontSize: '11px' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingMat(true)}
                style={{ width: '100%', padding: '9px', borderRadius: '8px', border: `1px dashed ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                + Registrar envio
              </button>
            )}
          </div>
        </div>

        {/* Notas */}
        <div style={{ backgroundColor: secBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '16px 18px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Notas
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdateClient(client.id, { notes })}
            rows={4}
            style={{
              width: '100%', resize: 'vertical', padding: '10px 12px',
              borderRadius: '8px', border: `1px solid ${border}`,
              backgroundColor: isDark ? '#161614' : '#ffffff',
              color: text, fontSize: '12px', lineHeight: 1.65,
              outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Responsável */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${border}`, backgroundColor: secBg }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: client.ownerColor, color: '#fff',
            fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {client.ownerName.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p style={{ fontSize: '11px', color: muted }}>Responsável</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{client.ownerName}</p>
          </div>
        </div>

        {/* Renovar — só aparece na coluna Renovar */}
        {isRenovar && (
          <div style={{ border: `1px solid #a1620730`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px 12px',
              backgroundColor: isDark ? 'rgba(161,98,7,0.14)' : 'rgba(161,98,7,0.07)',
              borderBottom: `1px solid #a1620720`,
            }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#a16207', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
                Renovar
              </p>
              <p style={{ fontSize: '11px', color: isDark ? '#c49a38' : '#a88030' }}>
                Período encerrado há {Math.abs(contractDaysLeft)} dias · iniciar renegociação
              </p>
            </div>

            <div style={{ backgroundColor: secBg, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Condições propostas */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                  Condições propostas
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'Investimento anterior', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(client.value) },
                    { label: 'Proposta de renovação', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Math.round(client.value * 1.12)) },
                    { label: 'Variação',              value: '+12%' },
                    { label: 'Vigência proposta',     value: '12 meses' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between', gap: '12px',
                      padding: '7px 10px', borderRadius: '7px',
                      backgroundColor: isDark ? '#161614' : '#ffffff',
                      border: `1px solid ${border}`,
                    }}>
                      <span style={{ fontSize: '11px', color: muted, flexShrink: 0 }}>{label}</span>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, color: label === 'Variação' ? '#2c5545' : text,
                        textAlign: 'right', fontFamily: label !== 'Vigência proposta' ? "'Geist Mono', monospace" : undefined,
                      }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documentos de renovação */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                  Documentos de renovação
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { icon: '📊', label: 'Relatório de resultados do contrato', hint: 'Comprova o valor entregue' },
                    { icon: '📄', label: 'Nova proposta comercial',             hint: 'Com condições actualizadas' },
                    { icon: '📋', label: 'Briefing do novo ciclo',              hint: 'Objectivos e escopo 2026/2' },
                    { icon: '✅', label: 'Minuta do novo contrato',             hint: 'Para revisão jurídica' },
                  ].map(({ icon, label, hint }) => {
                    const hasIt = client.material.some((m) =>
                      m.label.toLowerCase().includes(label.toLowerCase().split(' ')[1]) ||
                      (label.includes('Relatório') && m.type === 'relatorio') ||
                      (label.includes('proposta') && m.type === 'proposta')
                    )
                    return (
                      <div key={label} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 12px', borderRadius: '8px',
                        backgroundColor: isDark ? '#161614' : '#ffffff',
                        border: `1px solid ${hasIt ? '#a1620728' : border}`,
                      }}>
                        <span style={{ fontSize: '15px', flexShrink: 0 }}>{icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                          <p style={{ fontSize: '10px', color: muted }}>{hint}</p>
                        </div>
                        <span style={{
                          fontSize: '9px', fontWeight: 700,
                          color: hasIt ? '#2c5545' : '#a88030',
                          backgroundColor: hasIt ? '#2c554515' : '#a8803015',
                          borderRadius: '999px', padding: '2px 8px', flexShrink: 0,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {hasIt ? 'Pronto' : 'Pendente'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <button type="button"
                  style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px', border: `1px dashed #a1620740`, backgroundColor: 'transparent', color: '#a16207', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  + Adicionar documento
                </button>
              </div>

              {/* Próximos passos de renovação */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                  Próximos passos
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {Object.keys(renovChecks).map((label) => {
                    const done = renovChecks[label]
                    return (
                      <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', backgroundColor: isDark ? '#161614' : '#ffffff', border: `1px solid ${border}` }}>
                        <input type="checkbox" checked={done} onChange={() => setRenovChecks((p) => ({ ...p, [label]: !p[label] }))} style={{ accentColor: '#a16207', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: text, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1 }}>{label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* CTAs de transição */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                <button type="button"
                  onClick={() => onMoveClient(client.id, 'integracao')}
                  style={{ width: '100%', padding: '12px', borderRadius: '9px', backgroundColor: '#2c5545', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 8px rgba(21,128,61,0.3)' }}>
                  ✓ Contrato fechado — mover para Integração
                </button>
                <button type="button"
                  onClick={() => onMoveClient(client.id, 'encerrado')}
                  style={{ width: '100%', padding: '10px', borderRadius: '9px', backgroundColor: 'transparent', color: muted, border: `1px solid ${border}`, cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                  Sem acordo — mover para Encerrado
                </button>
              </div>

            </div>

          </div>
        )}

        {/* Trabalhar com ele — só aparece em Contrato Encerrado */}
        {isEncerrado && (
          <div style={{ border: `1px solid #6b121230`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px 12px',
              backgroundColor: isDark ? 'rgba(107,18,18,0.18)' : 'rgba(107,18,18,0.07)',
              borderBottom: `1px solid #6b121222`,
            }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#6b1212', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
                Trabalhar com ele
              </p>
              <p style={{ fontSize: '11px', color: isDark ? '#a87070' : '#8b4a4a' }}>
                Contrato encerrado há {Math.abs(contractDaysLeft)} dias · {new Date(client.contractEnd + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
              </p>
            </div>

            <div style={{ backgroundColor: secBg, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Investimento */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                  Investimento
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'Empresa',        value: client.company },
                    { label: 'Contacto',       value: client.contact },
                    { label: 'Setor',          value: client.sector  },
                    { label: 'Valor anterior', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(client.value) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '7px 10px', borderRadius: '7px', backgroundColor: isDark ? '#161614' : '#ffffff', border: `1px solid ${border}` }}>
                      <span style={{ fontSize: '11px', color: muted, flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: text, textAlign: 'right' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documentos de reativação */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                  Documentos de reativação
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { icon: '📊', label: 'Relatório de resultados anteriores', hint: 'Mostre o valor entregue' },
                    { icon: '📄', label: 'Nova proposta comercial',            hint: 'Condições atualizadas' },
                    { icon: '✉️', label: 'Email de reativação',                hint: 'Personalizado para o contato' },
                    { icon: '📋', label: 'Briefing de retomada',               hint: 'Objetivos para novo ciclo' },
                  ].map(({ icon, label, hint }) => {
                    const hasMaterial = client.material.some((m) => m.label.toLowerCase().includes(label.toLowerCase().split(' ')[1]))
                    return (
                      <div key={label} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 12px', borderRadius: '8px',
                        backgroundColor: isDark ? '#161614' : '#ffffff',
                        border: `1px solid ${hasMaterial ? '#6b121228' : border}`,
                      }}>
                        <span style={{ fontSize: '15px', flexShrink: 0 }}>{icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                          <p style={{ fontSize: '10px', color: muted }}>{hint}</p>
                        </div>
                        <span style={{
                          fontSize: '9px', fontWeight: 700,
                          color: hasMaterial ? '#2c5545' : '#a88030',
                          backgroundColor: hasMaterial ? '#2c554515' : '#a8803015',
                          borderRadius: '999px', padding: '2px 8px', flexShrink: 0,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {hasMaterial ? 'Pronto' : 'Pendente'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <button type="button"
                  style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px', border: `1px dashed #6b121240`, backgroundColor: 'transparent', color: '#6b1212', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  + Adicionar documento
                </button>
              </div>

              {/* Próximos passos */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                  Próximos passos
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {Object.keys(encChecks).map((label) => {
                    const done = encChecks[label]
                    return (
                      <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', backgroundColor: isDark ? '#161614' : '#ffffff', border: `1px solid ${border}` }}>
                        <input type="checkbox" checked={done} onChange={() => setEncChecks((p) => ({ ...p, [label]: !p[label] }))} style={{ accentColor: '#6b1212', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: text, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1 }}>{label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* CTAs de transição */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                <button type="button"
                  onClick={() => onMoveClient(client.id, 'renovar')}
                  style={{ width: '100%', padding: '12px', borderRadius: '9px', backgroundColor: '#a16207', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 8px rgba(161,98,7,0.3)' }}>
                  Retomar contato — mover para Renovar
                </button>
                <button type="button"
                  onClick={() => onMoveClient(client.id, 'integracao')}
                  style={{ width: '100%', padding: '10px', borderRadius: '9px', backgroundColor: '#2c5545', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 8px rgba(21,128,61,0.25)' }}>
                  ✓ Contrato fechado — mover para Integração
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function RenovacaoView({ isDark, border, muted }: { deals: Deal[]; isDark: boolean; border: string; muted: string }) {
  const text   = isDark ? '#e8e4dc' : '#101828'
  const [selected, setSelected] = useState<RenovClient | null>(null)
  const [clients, setClients]   = useState<RenovClient[]>(MOCK_RENOV_CLIENTS)

  function handleMoveClient(clientId: string, col: RenovColId) {
    setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, col } : c))
    setSelected((prev) => prev?.id === clientId ? { ...prev, col } : prev)
  }

  function handleUpdateClient(clientId: string, updates: Partial<RenovClient>) {
    setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, ...updates } : c))
    setSelected((prev) => prev?.id === clientId ? { ...prev, ...updates } : prev)
  }

  const grouped = useMemo(() => {
    const map: Record<string, RenovClient[]> = {}
    RENOV_COLUMNS.forEach((c) => { map[c.id] = [] })
    clients.forEach((c) => { map[c.col].push(c) })
    return map
  }, [clients])

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px', display: 'flex', gap: '14px' }}>
        {RENOV_COLUMNS.map((col) => {
          const clients   = grouped[col.id] ?? []
          const colTotal  = clients.reduce((s, c) => s + c.value, 0)
          return (
            <div key={col.id} style={{ width: '272px', minWidth: '272px', flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>

              {/* Column header — kanban style */}
              <div style={{ height: '44px', flexShrink: 0, padding: '4px 4px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: col.color, letterSpacing: '0.01em' }}>
                      {col.label}
                    </span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: col.color,
                      backgroundColor: `${col.color}18`, borderRadius: '999px', padding: '1px 7px',
                      fontFamily: "'Geist Mono', monospace",
                    }}>{clients.length}</span>
                  </div>
                  {colTotal > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: 600, color: col.color, fontFamily: "'Geist Mono', monospace", opacity: 0.75 }}>
                      {fmt(colTotal)}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '10px', color: col.color, opacity: 0.5, marginTop: '2px' }}>{col.desc}</p>
              </div>

              {/* Cards scroll area */}
              <div style={{
                flex: 1, overflowY: 'auto', borderRadius: '12px',
                backgroundColor: 'var(--surface-raised)',
                border: selected ? `1px solid ${border}` : `1px solid ${col.color}22`,
                padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px',
                minHeight: '300px',
              }}
              className="kanban-cards-scroll"
              >
                {clients.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '32px 0' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${col.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col.color }}>
                      <RefreshCcw size={18} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)' }}>Sem clientes</span>
                  </div>
                ) : clients.map((client) => {
                  const daysLeft = Math.round((new Date(client.contractEnd + 'T00:00').getTime() - Date.now()) / 86_400_000)
                  const isUrgent = daysLeft <= 45
                  const pendingCount = client.material.filter((m) => m.status === 'pendente').length
                  const isSelected = selected?.id === client.id

                  return (
                    <div
                      key={client.id}
                      role="button" tabIndex={0}
                      onClick={() => setSelected(isSelected ? null : client)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelected(isSelected ? null : client)}
                      style={{
                        borderRadius: '12px',
                        backgroundColor: isSelected
                          ? (isDark ? `${col.color}28` : `${col.color}14`)
                          : (isDark ? `${col.color}1a` : `${col.color}0d`),
                        border: `1px solid ${isSelected ? col.color : `${col.color}28`}`,
                        overflow: 'hidden', cursor: 'pointer',
                        boxShadow: isSelected ? `0 0 0 2px ${col.color}40` : '0 1px 2px rgba(16,24,40,0.04)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? `${col.color}28` : `${col.color}14` }}
                      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? `${col.color}1a` : `${col.color}0d` }}
                    >
                      <div style={{ padding: '12px 13px 10px' }}>
                        {/* Stage label */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: col.color }}>
                            {client.sector}
                          </span>
                          {isUrgent && (
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#6b1212', backgroundColor: '#6b121214', borderRadius: '999px', padding: '1px 7px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={8} />
                              {daysLeft <= 0 ? 'Expirado' : `${daysLeft}d`}
                            </span>
                          )}
                        </div>
                        {/* Company */}
                        <p style={{ fontSize: '13px', fontWeight: 600, color: text, lineHeight: 1.3, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {client.company}
                        </p>
                        <p style={{ fontSize: '11px', color: muted, marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {client.contact} · {client.ownerName.split(' ')[0]}
                        </p>
                        {/* Footer */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#2a7a4a', fontFamily: "'Geist Mono', monospace" }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 0 }).format(client.value)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {pendingCount > 0 && (
                              <span style={{ fontSize: '10px', color: '#a88030', fontWeight: 600 }}>
                                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                              </span>
                            )}
                            <span style={{ fontSize: '10px', color: muted }}>
                              {client.material.length} material{client.material.length > 1 ? 'is' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Probability bar — uses contract days remaining as indicator */}
                      <div style={{ height: '3px', backgroundColor: isDark ? '#1a1a18' : '#f0f0f0', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.max(5, Math.min(100, Math.round((daysLeft / 365) * 100)))}%`,
                          background: isUrgent ? 'linear-gradient(90deg,#8b2020,#b83535)' : 'linear-gradient(90deg,#2c5545,#3d8a6e)',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <RenovacaoDetailPanel
          key={selected.id}
          client={clients.find((c) => c.id === selected.id) ?? selected}
          isDark={isDark}
          border={border}
          onClose={() => setSelected(null)}
          onMoveClient={handleMoveClient}
          onUpdateClient={handleUpdateClient}
        />
      )}
    </div>
  )
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function ListRow({ deal, isDark, border, text, muted, taskCount, isAdmin, onMove }: {
  deal: Deal; isDark: boolean; border: string; text: string; muted: string
  taskCount: number; isAdmin: boolean; onMove: (dealId: string, stageId: string) => void
}) {
  const navigate         = useNavigate()
  const stageColor       = STAGE_COLOR[deal.stage_id] ?? '#94a3b8'
  const isWon            = deal.stage_id === 'closed_won'
  const isLost           = deal.stage_id === 'closed_lost'
  const [showMenu, setShowMenu] = useState(false)

  const daysColor = deal.days_in_stage > 21 ? '#b83535'
                  : deal.days_in_stage > 10 ? '#a88030'
                  : muted

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 160px 120px 160px 150px 36px',
        columnGap: '0px',
        alignItems: 'center',
        padding: '14px 20px 14px 23px',
        borderBottom: `1px solid ${border}`,
        transition: 'background-color 0.1s ease',
        borderLeft: `3px solid ${stageColor}`,
        backgroundColor: isDark ? `${stageColor}1c` : `${stageColor}16`,
        opacity: isLost ? 0.55 : 1,
        position: 'relative',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? `${stageColor}30` : `${stageColor}22` }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? `${stageColor}1c` : `${stageColor}16` }}
    >
      {/* Col 1 — Lead / Empresa */}
      <div
        role="button" tabIndex={0}
        onClick={() => navigate(`/deal/${deal.id}`)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/deal/${deal.id}`)}
        style={{ minWidth: 0, cursor: 'pointer' }}
      >
        <div style={{
          fontSize: '13px', fontWeight: 600, color: text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: isLost ? 'line-through' : 'none',
          marginBottom: '4px',
        }}>
          {deal.company_name || deal.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {deal.contact_name && (
            <span style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {deal.contact_name}
            </span>
          )}
          {/* Admin only: show owner */}
          {isAdmin && deal.owner?.name && (
            <>
              {deal.contact_name && <span style={{ color: isDark ? '#2a2a28' : '#d1ccc6', fontSize: '10px' }}>·</span>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '4px',
                  backgroundColor: deal.owner.avatar_color ?? '#667085',
                  color: '#fff', fontSize: '7px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {getInitials(deal.owner.name)}
                </div>
                <span style={{ fontSize: '11px', color: muted }}>{deal.owner.name.split(' ')[0]}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Col 2 — Tarefas pendentes */}
      <div style={{ paddingLeft: '32px' }}>
        {taskCount > 0 ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '11px', fontWeight: 600, color: '#2c5545',
            backgroundColor: isDark ? '#0d2318' : '#f0faf4',
            border: '1px solid #2c554528', borderRadius: '6px', padding: '3px 10px',
          }}>
            <CheckSquare size={11} />
            {taskCount} tarefa{taskCount !== 1 ? 's' : ''}
          </span>
        ) : (
          <span style={{ fontSize: '12px', color: isDark ? '#252522' : '#d8d3cc' }}>—</span>
        )}
      </div>

      {/* Col 3 — Dias na etapa */}
      <div style={{ paddingLeft: '32px' }}>
        {!isWon && !isLost && deal.days_in_stage > 0 ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
            <span style={{
              fontSize: '18px', fontWeight: 700, lineHeight: 1,
              color: daysColor, fontVariantNumeric: 'tabular-nums',
              fontFamily: "'Geist Mono', monospace",
            }}>
              {deal.days_in_stage}
            </span>
            <span style={{ fontSize: '10px', color: daysColor, fontWeight: 500 }}>dias</span>
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: isDark ? '#252522' : '#d8d3cc' }}>—</span>
        )}
      </div>

      {/* Col 4 — Probabilidade */}
      <div style={{ paddingLeft: '32px', paddingRight: '12px' }}>
        {!isWon && !isLost && (deal.probability ?? 0) > 0 ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: (deal.probability ?? 0) >= 70 ? '#2c5545' : (deal.probability ?? 0) >= 40 ? '#a88030' : '#b83535', fontVariantNumeric: 'tabular-nums' }}>
                {deal.probability}%
              </span>
            </div>
            <div style={{ height: '5px', borderRadius: '999px', backgroundColor: isDark ? '#1e1e1c' : '#e8e5e0', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${deal.probability}%`,
                background: (deal.probability ?? 0) >= 70 ? 'linear-gradient(90deg,#2c5545,#3d8a6e)' : (deal.probability ?? 0) >= 40 ? 'linear-gradient(90deg,#a88030,#f59e0b)' : 'linear-gradient(90deg,#8b2020,#b83535)',
                borderRadius: '999px', transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        ) : isWon ? (
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#2c5545' }}>✓ Ganho</span>
        ) : isLost ? (
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#b83535' }}>✗ Perdido</span>
        ) : (
          <span style={{ fontSize: '12px', color: isDark ? '#252522' : '#d8d3cc' }}>—</span>
        )}
      </div>

      {/* Col 5 — Valor */}
      <div style={{ textAlign: 'right', paddingRight: '16px' }}>
        <span style={{
          fontSize: '13px', fontWeight: 700,
          color: isWon ? '#2c5545' : deal.value ? text : muted,
          fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.01em',
        }}>
          {deal.value ? fmt(deal.value) : '—'}
        </span>
      </div>

      {/* Col 6 — Mover etapa */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v) }}
          title="Mover para outra etapa"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '26px', height: '26px', borderRadius: '7px', border: 'none',
            backgroundColor: showMenu ? (isDark ? '#2a2a28' : '#f0eee8') : 'transparent',
            cursor: 'pointer', color: isDark ? '#3a3a38' : '#b8b4ac',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = stageColor }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = isDark ? '#3a3a38' : '#b8b4ac' }}
        >
          <ChevronDown size={13} />
        </button>
        {showMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 50,
              backgroundColor: isDark ? '#1a1a18' : '#ffffff',
              border: `1px solid ${border}`,
              borderRadius: '10px', overflow: 'hidden',
              boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(16,24,40,0.14)',
              minWidth: '160px',
            }}
          >
            {STAGES.filter((s) => s.id !== deal.stage_id).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onMove(deal.id, s.id); setShowMenu(false) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '9px 14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  border: 'none', cursor: 'pointer',
                  backgroundColor: 'transparent', fontSize: '12px', fontWeight: 500,
                  color: text,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = isDark ? '#242422' : '#f5f4f0' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0, display: 'inline-block' }} />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PipelinePage() {
  const navigate         = useNavigate()
  const deals            = useVisibleDeals()
  const deleteDeal       = useDealStore((s) => s.deleteDeal)
  const moveDeal         = useDealStore((s) => s.moveDeal)
  const setLossReason    = useDealStore((s) => s.setLossReason)
  const dealsLoading     = useDealStore((s) => s.isLoading)
  const dealsInitialized = useDealStore((s) => s.initialized)
  const dealsError       = useDealStore((s) => s.error)
  const isDark           = useThemeStore((s) => s.isDark)
  const notifications    = useNotificationStore((s) => s.notifications)
  const isAdmin          = useAuthStore((s) => s.profile?.is_admin ?? false)

  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery    = searchParams.get('search') ?? ''
  const selectedOwners = useMemo(() => {
    const raw = searchParams.get('owners')
    return raw ? raw.split(',').filter(Boolean) : []
  }, [searchParams])

  const allTasks = useTaskStore((s) => s.tasks)

  const [viewFlash, setViewFlash]               = useState<ViewMode | null>(null)
  const [showNewModal, setShowNewModal]         = useState(false)
  const [prioritizeNew, setPrioritizeNew]       = useState(false)
  const [sortMode, _setSortMode]                 = useState<'manual' | 'score'>('manual')
  const [editingDeal, setEditingDeal]           = useState<Deal | null>(null)
  const [viewMode, setViewMode]                 = useState<ViewMode>(() => (localStorage.getItem('esq_pipeline_view') as ViewMode) ?? 'kanban')
  const [listSort, setListSort]                 = useState<'date' | 'value' | 'stage'>('stage')
  const [collapsedStages, setCollapsedStages]   = useState<Set<string>>(new Set())
  const zapRef                                  = useRef<HTMLButtonElement>(null)
  const [zapAnimating, setZapAnimating]         = useState(false)
  const [pendingNewDeal, setPendingNewDeal]     = useState<Deal | null>(null)
  const [updatedDeal, setUpdatedDeal]           = useState<Deal | null>(null)

  function toggleStageCollapse(stageId: string) {
    setCollapsedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  const newDealIds = useMemo(
    () => new Set(notifications.filter((n) => !n.read).map((n) => n.dealId)),
    [notifications],
  )

  const handleZapClick = useCallback(() => {
    setPrioritizeNew((v) => !v)
    setZapAnimating(false)
    requestAnimationFrame(() => setZapAnimating(true))
  }, [])

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('owners')
      next.delete('search')
      return next
    }, { replace: true })
  }

  const displayDeals = useMemo<Deal[]>(() => {
    let result = deals
    if (selectedOwners.length > 0) {
      result = result.filter((d) => selectedOwners.includes(d.owner_id))
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((d) => {
        const val = String(d.value ?? '')
        return (
          d.title?.toLowerCase().includes(q) ||
          d.company_name?.toLowerCase().includes(q) ||
          d.contact_name?.toLowerCase().includes(q) ||
          d.contact_email?.toLowerCase().includes(q) ||
          d.owner?.name?.toLowerCase().includes(q) ||
          val.includes(q)
        )
      })
    }
    if (prioritizeNew) {
      const now = Date.now()
      const sevenDays = 7 * 86_400_000
      const newLeads = result
        .filter((d) => now - new Date(d.created_at).getTime() <= sevenDays)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const rest = result.filter((d) => now - new Date(d.created_at).getTime() > sevenDays)
      result = [...newLeads, ...rest]
    }
    return result
  }, [deals, selectedOwners, searchQuery, prioritizeNew, newDealIds])

  const sortedListDeals = useMemo(() => {
    return [...displayDeals].sort((a, b) => {
      if (listSort === 'value') return (b.value ?? 0) - (a.value ?? 0)
      if (listSort === 'stage') {
        return STAGES.findIndex((s) => s.id === a.stage_id) - STAGES.findIndex((s) => s.id === b.stage_id)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [displayDeals, listSort])

  const activeCount = useMemo(
    () => deals.filter((d) => d.stage_id !== 'closed_won' && d.stage_id !== 'closed_lost').length,
    [deals],
  )

  const hasFilter    = selectedOwners.length > 0 || !!searchQuery
  const headerBorder = isDark ? '#242424' : '#e8e6e1'
  const filterBg     = isDark ? '#111111' : '#f5f4f1'
  const filterBorder = isDark ? '#2a2a2a' : '#e0ddd8'
  const filterText   = isDark ? '#888888' : '#6b6560'
  const border       = isDark ? '#242422' : '#eaecf0'
  const text         = isDark ? '#e8e4dc' : '#101828'
  const muted        = isDark ? '#6b6560' : '#667085'

  const VIEW_MODES: { id: ViewMode; icon: React.ReactNode; label: string }[] = [
    { id: 'kanban',    icon: <LayoutGrid size={13} />,  label: 'Kanban' },
    { id: 'list',      icon: <List size={13} />,        label: 'Lista' },
    { id: 'renovacao', icon: <RefreshCcw size={13} />,  label: 'Renovação' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: '64px', minHeight: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: `1px solid ${headerBorder}`,
        flexShrink: 0, gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <Kanban size={18} color={isDark ? '#e8e4dc' : '#1a1814'} />
            <p style={{ fontSize: '20px', fontWeight: 600, color: isDark ? '#e8e4dc' : '#1a1814', letterSpacing: '-0.03em', margin: 0 }}>
              Jornada
            </p>
          </div>
          <p style={{ fontSize: '13px', color: isDark ? '#6b6560' : '#8a857d', margin: 0 }}>
            {deals.length} leads · {activeCount} activos
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

          {/* View toggle */}
          <div style={{
            display: 'flex', backgroundColor: filterBg,
            border: `1px solid ${filterBorder}`, borderRadius: '9px', padding: '3px', gap: '2px',
          }}>
            {VIEW_MODES.map(({ id, icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setViewMode(id); setViewFlash(id); localStorage.setItem('esq_pipeline_view', id) }}
                onAnimationEnd={() => setViewFlash(null)}
                title={label}
                className={viewFlash === id ? 'view-btn-active' : ''}
                style={{
                  height: '28px', padding: '0 10px', borderRadius: '7px', cursor: 'pointer',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  backgroundColor: viewMode === id ? (isDark ? '#2a2a28' : '#fff') : 'transparent',
                  color: viewMode === id ? (isDark ? '#e8e4dc' : '#101828') : filterText,
                  boxShadow: viewMode === id ? (isDark ? '0 1px 4px rgba(0,0,0,0.35)' : '0 1px 3px rgba(16,24,40,0.10)') : 'none',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  fontSize: '11px', fontWeight: viewMode === id ? 600 : 400,
                }}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Zap — destaca leads novos */}
          <button
            ref={zapRef}
            type="button"
            onClick={handleZapClick}
            className={prioritizeNew ? 'zap-pulse' : zapAnimating ? 'zap-shock' : ''}
            onAnimationEnd={() => setZapAnimating(false)}
            title={prioritizeNew ? 'Desativar destaque de novos leads' : 'Destacar leads dos últimos 7 dias'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '30px', borderRadius: '8px', cursor: 'pointer',
              backgroundColor: prioritizeNew ? (isDark ? 'rgba(107,18,18,0.18)' : 'rgba(107,18,18,0.08)') : filterBg,
              border: `1px solid ${prioritizeNew ? '#6b1212' : filterBorder}`,
              color: prioritizeNew ? '#6b1212' : filterText,
              flexShrink: 0, transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
            }}
          >
            <Zap
              className={prioritizeNew ? 'zap-icon-active' : ''}
              style={{
                width: '13px', height: '13px',
                fill: prioritizeNew ? '#6b1212' : 'none',
                transition: 'fill 0.15s ease',
              }}
            />
          </button>

          {/* Propostas */}
          <button
            type="button"
            onClick={() => navigate('/propostas')}
            title="Ver todas as propostas"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              height: '30px', padding: '0 12px', borderRadius: '8px',
              border: `1px solid ${filterBorder}`, backgroundColor: filterBg,
              color: filterText, fontSize: '11px', fontWeight: 500,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <FileText style={{ width: '13px', height: '13px' }} />
            Propostas
          </button>

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', backgroundColor: filterBorder, flexShrink: 0 }} />

          {/* Novo lead */}
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#6b1212', color: '#fff',
              borderRadius: '8px', padding: '0 16px', height: '32px',
              fontSize: '12px', fontWeight: 600,
              border: 'none', cursor: 'pointer', flexShrink: 0,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Plus style={{ width: '13px', height: '13px' }} />
            Novo lead
          </button>
        </div>
      </div>


      {/* Content */}
      {dealsLoading && !dealsInitialized ? (
        <PageLoadingState title="Carregando pipeline" description="Estamos buscando os leads e organizando a jornada." />
      ) : viewMode === 'renovacao' ? (
        <div key="renovacao" className="view-enter" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <RenovacaoView deals={displayDeals} isDark={isDark} border={border} muted={muted} />
        </div>
      ) : viewMode === 'kanban' ? (
        <div key="kanban" className="view-enter" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {dealsError && (
            <div style={{
              margin: '8px 16px 0', padding: '8px 14px', borderRadius: '8px',
              backgroundColor: isDark ? 'rgba(107,18,18,0.18)' : 'rgba(107,18,18,0.07)',
              border: `1px solid rgba(107,18,18,0.25)`,
              fontSize: '12px', color: isDark ? '#e8a0a0' : '#6b1212', fontWeight: 500,
            }}>
              ⚠ {dealsError}
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <KanbanBoard
              initialDeals={displayDeals}
              pendingNewDeal={pendingNewDeal}
              onNewDealConsumed={() => setPendingNewDeal(null)}
              pendingUpdatedDeal={updatedDeal}
              onUpdatedDealConsumed={() => setUpdatedDeal(null)}
              onEditDeal={setEditingDeal}
              onDeleteDeal={(id) => { deleteDeal(id) }}
              onStageChange={(id, stageId) => { moveDeal(id, stageId) }}
              onLossReasonConfirmed={(id, reason) => { setLossReason(id, reason) }}
              showScore={prioritizeNew || sortMode === 'score'}
              highlightNew={prioritizeNew}
              sortMode={sortMode}
              onAddDeal={() => setShowNewModal(true)}
            />
          </div>
        </div>
      ) : displayDeals.length === 0 ? (
        hasFilter ? (
          <PageEmptyState
            icon={<Zap style={{ width: '28px', height: '28px', color: '#6b1212' }} />}
            title="Nenhum lead encontrado"
            description={dealsError || 'Tente ajustar a busca ou limpar os filtros.'}
            action={
              <button type="button" onClick={clearFilters}
                style={{ fontSize: '12px', fontWeight: 600, color: '#6b1212', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>
                Limpar filtros
              </button>
            }
          />
        ) : (
          <PageEmptyState
            icon={<Plus style={{ width: '28px', height: '28px', color: '#6b1212' }} />}
            title="Sem leads"
            description={dealsError || 'Crie o primeiro lead para começar.'}
            action={
              <button type="button" onClick={() => setShowNewModal(true)}
                style={{ fontSize: '12px', fontWeight: 600, color: '#6b1212', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>
                Novo lead
              </button>
            }
          />
        )
      ) : (
        <div key="list" className="view-enter" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {/* Sticky header row */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            display: 'grid', gridTemplateColumns: '1fr 160px 120px 160px 150px 52px',
            columnGap: '0px',
            padding: '0 20px 0 23px',
            borderBottom: `2px solid ${isDark ? '#1e1e1c' : '#e2e0db'}`,
            borderLeft: '3px solid transparent',
            backgroundColor: isDark ? '#111110' : '#f8f7f5',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 3px 8px rgba(16,24,40,0.07)',
          }}>
            {[
              { label: 'Lead / Empresa', align: 'left' as const },
              { label: 'Tarefas',        align: 'left' as const },
              { label: 'Dias na Etapa',  align: 'left' as const },
              { label: 'Probabilidade',  align: 'left' as const },
              { label: 'Valor',          align: 'right' as const, sort: true },
              { label: '',               align: 'center' as const },
            ].map(({ label, align, sort }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center',
                justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
                gap: 6, padding: '13px 0',
                paddingLeft: i > 0 ? '32px' : 0,
                paddingRight: align === 'right' ? '16px' : 0,
              }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  color: isDark ? '#4a4540' : '#a3a8b2',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  userSelect: 'none',
                }}>
                  {label}
                </span>
                {sort && (
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
                    {(['stage', 'value'] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setListSort(s)}
                        style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700,
                          border: `1px solid ${listSort === s ? '#6b1212' : (isDark ? '#2a2a28' : '#d8d4ce')}`,
                          backgroundColor: listSort === s ? (isDark ? 'rgba(107,18,18,0.22)' : 'rgba(107,18,18,0.08)') : 'transparent',
                          color: listSort === s ? '#6b1212' : muted, cursor: 'pointer',
                          letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1,
                        }}
                      >
                        {s === 'value' ? 'Valor' : 'Etapa'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Grouped by stage */}
          {STAGES.map((stage) => {
            const stageDeals = sortedListDeals.filter((d) => d.stage_id === stage.id)
            if (stageDeals.length === 0) return null
            const isCollapsed = collapsedStages.has(stage.id)
            const stageTotal  = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0)

            return (
              <div key={stage.id}>
                {/* Stage group header */}
                <button
                  type="button"
                  onClick={() => toggleStageCollapse(stage.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 18px 7px 21px',
                    borderBottom: `1px solid ${border}`,
                    borderLeft: `3px solid ${stage.color}`,
                    backgroundColor: isDark ? `${stage.color}0d` : `${stage.color}08`,
                    cursor: 'pointer', border: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ color: muted, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: stage.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {stage.label}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, color: stage.color,
                    backgroundColor: `${stage.color}18`,
                    borderRadius: '999px', padding: '0 6px',
                    fontFamily: "'Geist Mono', monospace",
                  }}>
                    {stageDeals.length}
                  </span>
                  {stageTotal > 0 && (
                    <span style={{ fontSize: '10px', color: muted, fontFamily: "'Geist Mono', monospace", marginLeft: 'auto' }}>
                      {fmt(stageTotal)}
                    </span>
                  )}
                </button>

                {/* Stage rows */}
                {!isCollapsed && stageDeals.map((deal) => (
                  <ListRow
                    key={deal.id}
                    deal={deal}
                    isDark={isDark}
                    border={border}
                    text={text}
                    muted={muted}
                    taskCount={allTasks.filter((t) => t.deal_id === deal.id && !t.completed_at).length}
                    isAdmin={isAdmin}
                    onMove={(dealId, stageId) => moveDeal(dealId, stageId as Parameters<typeof moveDeal>[1])}
                  />
                ))}
              </div>
            )
          })}

          {/* Footer totals */}
          <div style={{ padding: '10px 18px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: muted }}>
              {sortedListDeals.length} leads
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: muted, fontFamily: "'Geist Mono', monospace" }}>
              {fmt(sortedListDeals.reduce((s, d) => s + (d.value ?? 0), 0))} total
            </span>
          </div>
        </div>
      )}

      <NewLeadModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={(deal) => { setPendingNewDeal(deal); setShowNewModal(false) }}
      />
      <EditDealModal
        deal={editingDeal}
        open={!!editingDeal}
        onClose={() => setEditingDeal(null)}
        onUpdated={(deal) => { setUpdatedDeal(deal); setEditingDeal(null) }}
      />
    </div>
  )
}
