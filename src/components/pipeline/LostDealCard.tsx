import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useThemeStore } from '@/store/useThemeStore'
import {
  XCircle, Calendar, User, Building2, TrendingDown, AlertTriangle,
  Clock, DollarSign, Users, Zap, Target, MessageSquareX,
} from 'lucide-react'
import type { Deal } from '@/types/deal.types'

// ─── Motivos rotineiros de declínio ──────────────────────────────────────────

export const LOSS_REASON_PRESETS = [
  { key: 'preco',       label: 'Preço alto',          icon: DollarSign,      color: '#a88030' },
  { key: 'orcamento',   label: 'Sem orçamento',        icon: TrendingDown,    color: '#dc2626' },
  { key: 'concorrente', label: 'Escolheu concorrente', icon: Target,          color: '#7c5cbf' },
  { key: 'timing',      label: 'Timing errado',        icon: Clock,           color: '#0284c7' },
  { key: 'necessidade', label: 'Sem necessidade',      icon: AlertTriangle,   color: '#d97706' },
  { key: 'decisor',     label: 'Sem decisor',          icon: Users,           color: '#6366f1' },
  { key: 'interesse',   label: 'Perdeu interesse',     icon: Zap,             color: '#64748b' },
  { key: 'proposta',    label: 'Proposta inadequada',  icon: MessageSquareX,  color: '#c94444' },
] as const

type PresetKey = typeof LOSS_REASON_PRESETS[number]['key']

function detectPreset(reason?: string | null): PresetKey | null {
  if (!reason) return null
  const lower = reason.toLowerCase()
  if (lower.includes('preço') || lower.includes('preco') || lower.includes('caro')) return 'preco'
  if (lower.includes('orçamento') || lower.includes('orcamento') || lower.includes('budget')) return 'orcamento'
  if (lower.includes('concorrente') || lower.includes('competitor')) return 'concorrente'
  if (lower.includes('timing') || lower.includes('momento') || lower.includes('prazo')) return 'timing'
  if (lower.includes('necessidade') || lower.includes('need')) return 'necessidade'
  if (lower.includes('decisor') || lower.includes('decisão') || lower.includes('decision')) return 'decisor'
  if (lower.includes('interesse') || lower.includes('interest')) return 'interesse'
  if (lower.includes('proposta') || lower.includes('proposal')) return 'proposta'
  return null
}

function fmtDate(iso?: string | null) {
  if (!iso) return null
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso))
}

function fmtCurrency(v?: number | null) {
  if (!v || v === 0) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

interface LostDealCardProps {
  deal: Deal
  isOverlay?: boolean
  dimmed?: boolean
}

export function LostDealCard({ deal, isOverlay = false, dimmed = false }: LostDealCardProps) {
  const navigate = useNavigate()
  const isDark   = useThemeStore((s) => s.isDark)
  const [hovered, setHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, disabled: isOverlay })

  const wasDraggingRef = useRef(false)
  useEffect(() => {
    if (isDragging) { wasDraggingRef.current = true }
  }, [isDragging])

  const preset    = detectPreset(deal.loss_reason)
  const presetDef = LOSS_REASON_PRESETS.find((p) => p.key === preset)
  const PresetIcon = presetDef?.icon

  const lostAt    = fmtDate(deal.stage_changed_at ?? deal.updated_at)
  const valueStr  = fmtCurrency(deal.value)
  const daysInFunnel = deal.created_at
    ? Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86_400_000)
    : null

  // ── Colours ────────────────────────────────────────────────────────────────
  const bg         = isDark ? '#150a0a' : '#fff8f8'
  const border     = hovered
    ? (isDark ? '#5a1a1a' : '#f3a0a0')
    : (isDark ? '#2e1010' : '#fde0e0')
  const textMain   = isDark ? '#e8c8c8' : '#3b0f0f'
  const textSub    = isDark ? '#9a7070' : '#a05050'
  const textMuted  = isDark ? '#6a4a4a' : '#c08080'
  const accentRed  = '#b83535'
  const tagBg      = isDark ? '#2a1010' : '#fde8e8'
  const tagText    = isDark ? '#d88080' : '#c94444'
  const presetBg   = isDark ? '#1e1010' : '#fff0f0'

  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: '12px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isOverlay
          ? '0 20px 48px rgba(0,0,0,0.3)'
          : hovered
          ? (isDark ? '0 3px 12px rgba(184,53,53,0.25)' : '0 3px 12px rgba(184,53,53,0.12)')
          : '0 1px 2px rgba(16,24,40,0.04)',
        transform: isOverlay ? 'rotate(1.5deg)' : CSS.Transform.toString(transform),
        transition: isOverlay ? undefined : transition,
        opacity: isDragging ? 0.2 : dimmed ? 0.15 : 1,
        cursor: isOverlay ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
        position: 'relative',
      }}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={isOverlay ? undefined : () => {
        if (wasDraggingRef.current) { wasDraggingRef.current = false; return }
        navigate(`/deal/${deal.id}`)
      }}
    >
      {/* ── Top accent bar ── */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${accentRed}cc, ${accentRed}44)` }} />

      <div style={{ padding: '12px 14px 12px' }}>

        {/* ── Row 1: label + data perda ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '9px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <XCircle size={11} color={accentRed} strokeWidth={2.5} />
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: accentRed }}>
              Perdido
            </span>
          </div>
          {lostAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Calendar size={9} color={textMuted} />
              <span style={{ fontSize: '9px', color: textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {lostAt}
              </span>
            </div>
          )}
        </div>

        {/* ── Row 2: empresa ── */}
        <p style={{
          fontSize: '13px', fontWeight: 700, color: textMain,
          lineHeight: 1.3, letterSpacing: '-0.01em',
          textDecoration: 'line-through',
          textDecorationColor: `${accentRed}60`,
          marginBottom: '3px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {deal.company_name || deal.title}
        </p>

        {/* ── Row 3: contato · responsável ── */}
        {(deal.contact_name || deal.owner?.name) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
            {deal.contact_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <User size={9} color={textSub} />
                <span style={{ fontSize: '10px', color: textSub }}>{deal.contact_name}</span>
              </div>
            )}
            {deal.contact_name && deal.owner?.name && (
              <span style={{ fontSize: '10px', color: textMuted }}>·</span>
            )}
            {deal.owner?.name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Building2 size={9} color={textMuted} />
                <span style={{ fontSize: '10px', color: textMuted }}>{deal.owner.name}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Motivo de perda ── */}
        {deal.loss_reason ? (
          <div style={{
            borderRadius: '8px',
            backgroundColor: presetBg,
            border: `1px solid ${isDark ? '#3a1a1a' : '#fecaca'}`,
            padding: '8px 10px',
            marginBottom: '10px',
          }}>
            {presetDef && PresetIcon && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <PresetIcon size={10} color={presetDef.color} />
                <span style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  color: presetDef.color,
                }}>
                  {presetDef.label}
                </span>
              </div>
            )}
            <p style={{
              fontSize: '11px', color: textSub, lineHeight: 1.45, margin: 0,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {deal.loss_reason}
            </p>
          </div>
        ) : (
          /* Sem motivo — mostra chips de motivos comuns como sugestão */
          <div style={{ marginBottom: '10px' }}>
            <p style={{ fontSize: '9px', color: textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 600 }}>
              Motivo não registado
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {LOSS_REASON_PRESETS.slice(0, 4).map((p) => {
                const Icon = p.icon
                return (
                  <span key={p.key} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    fontSize: '9px', fontWeight: 600,
                    color: isDark ? '#7a5050' : '#c08080',
                    backgroundColor: isDark ? '#200e0e' : '#fdf2f2',
                    border: `1px solid ${isDark ? '#3a1818' : '#fde0e0'}`,
                    borderRadius: '999px', padding: '2px 7px',
                  }}>
                    <Icon size={8} />
                    {p.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Footer: valor + dias no funil + setor ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {valueStr && (
            <span style={{
              fontSize: '11px', fontWeight: 700,
              color: isDark ? '#d06060' : '#c94444',
              fontFamily: "'Geist Mono', monospace",
              textDecoration: 'line-through',
              textDecorationColor: `${accentRed}50`,
            }}>
              {valueStr}
            </span>
          )}
          {daysInFunnel !== null && daysInFunnel > 0 && (
            <span style={{
              fontSize: '9px', fontWeight: 600,
              color: textMuted,
              backgroundColor: tagBg,
              borderRadius: '999px', padding: '1px 6px',
              fontFamily: "'Geist Mono', monospace",
            }}>
              {daysInFunnel}d no funil
            </span>
          )}
          {deal.company_sector && (
            <span style={{
              fontSize: '9px', fontWeight: 600,
              color: tagText,
              backgroundColor: tagBg,
              borderRadius: '999px', padding: '1px 7px',
              marginLeft: 'auto',
            }}>
              {deal.company_sector}
            </span>
          )}
        </div>

      </div>
    </div>
  )
}
