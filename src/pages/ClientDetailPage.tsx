import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Mail, Globe, Phone,
  Users, Pencil, Check, ArrowRight, Zap,
  ExternalLink, Phone as PhoneIcon, CheckSquare, FileText, Video,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useDealStore } from '@/store/useDealStore'
import { useVisibleDeals } from '@/hooks/useVisibleDeals'
import { STAGES } from '@/constants/pipeline'
import { evaluateDealScore } from '@/lib/dealScore'
import { supabase } from '@/lib/supabase'
import type { LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactActivity = {
  id: string
  type: string
  subject: string
  body?: string | null
  created_at: string
  deal_title?: string
  owner_name?: string
  owner_color?: string
  owner_initials?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SIZE_LABELS: Record<string, string> = {
  '1-50': '1–50', '51-200': '51–200', '201-1000': '201–1k', '1000+': '1k+',
}

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`
  return `R$ ${v.toFixed(0)}`
}

function relativeDate(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30)  return `${days}d atrás`
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

const ACT_COLORS: Record<string, string> = {
  call: '#4a90d9', email: '#78909c', meeting: '#b83535', task: '#2c5545', note: '#a88030',
}
const ACT_ICONS: Record<string, LucideIcon> = {
  call: PhoneIcon, email: Mail, meeting: Video, task: CheckSquare, note: FileText,
}
const ACT_LABELS: Record<string, string> = {
  call: 'Ligação', email: 'Email', meeting: 'Reunião', task: 'Tarefa', note: 'Nota',
}

function HealthRing({ score, size = 40, isDark }: { score: number; size?: number; isDark: boolean }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (score / 100)
  const color = score >= 70 ? '#2c5545' : score >= 45 ? '#a88030' : '#b83535'
  const trackColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ClientDetailPage() {
  const { name: encodedName } = useParams<{ name: string }>()
  const navigate   = useNavigate()
  const isDark     = useThemeStore((s) => s.isDark)
  const deals      = useVisibleDeals()
  const updateDeal = useDealStore((s) => s.updateDeal)

  const companyName = encodedName ? decodeURIComponent(encodedName) : ''

  const bg       = isDark ? '#0d0c0a' : '#f5f4f0'
  const surface  = isDark ? '#111110' : '#ffffff'
  const subtleBg = isDark ? '#161614' : '#fafaf8'
  const border   = isDark ? '#242422' : '#e8e5df'
  const text      = isDark ? '#e8e4dc' : '#1a1814'
  const muted     = isDark ? '#6b6560' : '#8a857d'
  const inputBg   = isDark ? '#0d0c0a' : '#f5f4f0'
  const accent    = '#6b1212'

  // ── Company deals ──────────────────────────────────────────────────────────
  const companyDeals = useMemo(
    () => deals.filter((d) => (d.company_name ?? '').toLowerCase() === companyName.toLowerCase()),
    [deals, companyName],
  )

  const activeDeals = companyDeals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage_id))
  const wonDeals    = companyDeals.filter((d) => d.stage_id === 'closed_won')
  const closedDeals = companyDeals.filter((d) => ['closed_won', 'closed_lost'].includes(d.stage_id))

  const pipeline   = activeDeals.reduce((s, d) => s + Number(d.value), 0)
  const revenue    = wonDeals.reduce((s, d) => s + Number(d.value), 0)
  const winRate    = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0
  const avgHealth  = activeDeals.length > 0
    ? Math.round(activeDeals.reduce((s, d) => s + evaluateDealScore(d), 0) / activeDeals.length)
    : 0

  const contact = useMemo(() => {
    for (const d of companyDeals) {
      if (d.contact_name || d.contact_email || d.contact_phone) {
        return {
          name:  d.contact_name  ?? undefined,
          email: d.contact_email ?? undefined,
          phone: d.contact_phone ?? undefined,
          website: d.company_website ?? undefined,
          sector: d.company_sector ?? undefined,
          size:   d.company_size   ?? undefined,
        }
      }
    }
    return {
      website: companyDeals[0]?.company_website ?? undefined,
      sector:  companyDeals[0]?.company_sector  ?? undefined,
      size:    companyDeals[0]?.company_size    ?? undefined,
    }
  }, [companyDeals])

  const healthColor = avgHealth >= 70 ? '#2c5545' : avgHealth >= 45 ? '#a88030' : '#b83535'

  // ── Edit contact ───────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [editName,  setEditName]  = useState(contact.name  ?? '')
  const [editEmail, setEditEmail] = useState(contact.email ?? '')
  const [editPhone, setEditPhone] = useState(contact.phone ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await Promise.all(companyDeals.map((d) =>
        updateDeal(d.id, {
          contact_name:  editName  || d.contact_name  || '',
          contact_email: editEmail || d.contact_email || '',
          contact_phone: editPhone || d.contact_phone || '',
          company_name:  d.company_name ?? '',
          stage_id:      d.stage_id as 'leads',
        })
      ))
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  // ── Contact history ────────────────────────────────────────────────────────
  const [history, setHistory] = useState<ContactActivity[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    if (companyDeals.length === 0) { setLoadingHistory(false); return }
    const dealIds = companyDeals.map((d) => d.id)
    setLoadingHistory(true)
    supabase
      .from('deal_activities')
      .select('id, type, subject, body, created_at, deal_id, owner_id, owner')
      .in('deal_id', dealIds)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const dealMap = Object.fromEntries(companyDeals.map((d) => [d.id, d.title]))
        setHistory((data ?? []).map((a) => ({
          id:             a.id,
          type:           a.type,
          subject:        a.subject,
          body:           a.body,
          created_at:     a.created_at,
          deal_title:     dealMap[a.deal_id] ?? undefined,
          owner_name:     (a.owner as { name?: string } | null)?.name,
          owner_color:    (a.owner as { avatar_color?: string } | null)?.avatar_color,
          owner_initials: (a.owner as { initials?: string } | null)?.initials,
        })))
        setLoadingHistory(false)
      })
  }, [companyDeals.length])  // eslint-disable-line react-hooks/exhaustive-deps

  const sortedDeals = [...companyDeals].sort((a, b) =>
    STAGES.findIndex((s) => s.id === b.stage_id) - STAGES.findIndex((s) => s.id === a.stage_id)
  )

  if (companyDeals.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: bg, alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <Building2 size={32} color={isDark ? '#2a2a28' : '#d1cdc8'} />
        <p style={{ fontSize: '14px', fontWeight: 600, color: muted }}>Empresa não encontrada</p>
        <button type="button" onClick={() => navigate('/clients')}
          style={{ height: '32px', padding: '0 16px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={12} /> Voltar
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: bg, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '0 24px', height: '64px', minHeight: '64px', flexShrink: 0, borderBottom: `1px solid ${border}`, backgroundColor: surface, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button type="button" onClick={() => navigate('/clients')}
          style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, flexShrink: 0 }}>
          <ArrowLeft size={13} />
        </button>

        <div style={{
          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
          background: isDark ? '#1e1e1c' : '#eeece8',
          border: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: 700, color: muted,
        }}>
          {companyName.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '17px', fontWeight: 700, color: text, margin: 0, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {companyName}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
            {contact.sector && <span style={{ fontSize: '11px', color: muted }}>{contact.sector}</span>}
            {contact.sector && contact.size && <span style={{ fontSize: '11px', color: isDark ? '#2a2a28' : '#d1d5db' }}>·</span>}
            {contact.size && <span style={{ fontSize: '11px', color: muted }}>{SIZE_LABELS[contact.size] ?? contact.size} func.</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {saved && <span style={{ fontSize: '11px', color: '#2c5545', alignSelf: 'center' }}>✓ Guardado</span>}
          <button type="button" onClick={() => navigate('/pipeline')}
            style={{ height: '30px', padding: '0 14px', borderRadius: '7px', border: 'none', backgroundColor: accent, color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
            + Novo Lead
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '340px 1fr', gap: 0 }}>

        {/* ── Left column: info + contact + deals ── */}
        <div style={{ borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${border}` }}>
            {[
              { label: 'Pipeline',  value: formatCurrency(pipeline),    color: text },
              { label: 'Receita',   value: formatCurrency(revenue),     color: revenue > 0 ? '#2c5545' : muted },
              { label: 'Win Rate',  value: `${winRate}%`,               color: winRate >= 50 ? '#2c5545' : '#a88030' },
              { label: 'Deals',     value: String(companyDeals.length), color: text },
            ].map((m, i) => (
              <div key={m.label} style={{ padding: '14px 16px', borderRight: i % 2 === 0 ? `1px solid ${border}` : 'none', borderBottom: i < 2 ? `1px solid ${border}` : 'none', backgroundColor: subtleBg }}>
                <p style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '3px' }}>{m.label}</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: m.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Health */}
          {activeDeals.length > 0 && (
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <HealthRing score={avgHealth} size={44} isDark={isDark} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: healthColor }}>{avgHealth}</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Saúde média</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: healthColor, marginTop: '1px' }}>
                  {avgHealth >= 70 ? 'Saudável' : avgHealth >= 45 ? 'Atenção' : 'Crítico'}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '10px', color: muted, textAlign: 'right' }}>
                <p style={{ fontWeight: 700, color: text }}>{activeDeals.length}</p>
                <p>ativo{activeDeals.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {/* Contact */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contacto Principal</p>
              <button type="button" onClick={() => setIsEditing((v) => !v)}
                style={{ width: '24px', height: '24px', borderRadius: '6px', border: `1px solid ${isEditing ? accent : border}`, backgroundColor: isEditing ? `${accent}15` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isEditing ? accent : muted }}>
                <Pencil size={11} />
              </button>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[
                  { label: 'Nome', value: editName,  onChange: setEditName,  placeholder: 'Ex: João Silva' },
                  { label: 'Email', value: editEmail, onChange: setEditEmail, placeholder: 'email@empresa.com' },
                  { label: 'Telefone', value: editPhone, onChange: setEditPhone, placeholder: '+55 11 99999-9999' },
                ].map(({ label, value, onChange, placeholder }) => (
                  <div key={label}>
                    <p style={{ fontSize: '10px', color: muted, marginBottom: '3px' }}>{label}</p>
                    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                      style={{ width: '100%', height: '30px', padding: '0 9px', fontSize: '12px', backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '7px', color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = accent }}
                      onBlur={(e)  => { e.currentTarget.style.borderColor = border }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button type="button" onClick={() => setIsEditing(false)}
                    style={{ flex: 1, height: '28px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: 'transparent', fontSize: '11px', color: muted, cursor: 'pointer' }}>Cancelar</button>
                  <button type="button" onClick={handleSave} disabled={saving}
                    style={{ flex: 1, height: '28px', borderRadius: '7px', border: 'none', backgroundColor: saving ? '#a0403e' : accent, color: '#fff', fontSize: '11px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Check size={11} />{saving ? 'A guardar…' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {!contact.name && !contact.email && !contact.phone && !contact.website ? (
                  <p style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Sem contacto registado</p>
                ) : (
                  <>
                    {contact.name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={11} color={muted} />
                        <span style={{ fontSize: '12px', color: text }}>{contact.name}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={11} color={muted} />
                        <button type="button" onClick={() => navigate(`/email?to=${encodeURIComponent(contact.email!)}`)}
                          style={{ fontSize: '12px', color: accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                          {contact.email}
                        </button>
                      </div>
                    )}
                    {contact.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={11} color={muted} />
                        <span style={{ fontSize: '12px', color: text }}>{contact.phone}</span>
                      </div>
                    )}
                    {contact.website && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={11} color={muted} />
                        <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '12px', color: accent, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {contact.website.replace(/^https?:\/\//, '')}
                          <ExternalLink size={9} />
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Deals list */}
          <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              Deals ({companyDeals.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {sortedDeals.map((deal) => {
                const ds = STAGES.find((s) => s.id === deal.stage_id)
                const sc = evaluateDealScore(deal)
                const sc_color = sc >= 70 ? '#2c5545' : sc >= 45 ? '#a88030' : '#b83535'
                return (
                  <button key={deal.id} type="button" onClick={() => navigate(`/deal/${deal.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '10px', backgroundColor: isDark ? '#161614' : '#fafaf8', border: `1px solid ${border}`, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'border-color 0.12s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = border }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ds?.color ?? '#94a3b8', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                        {ds && <span style={{ fontSize: '10px', color: ds.color, fontWeight: 500 }}>{ds.label}</span>}
                        {deal.owner?.name && <span style={{ fontSize: '10px', color: muted }}>· {deal.owner.name.split(' ')[0]}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: sc_color }}>{sc}</span>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sc_color }} />
                    </div>
                    <ArrowRight size={11} color={muted} style={{ flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right column: contact history ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
            <p style={{ fontSize: '9px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Histórico de Contacto
            </p>
          </div>
          <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
            {loadingHistory ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '10px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${border}`, borderTopColor: accent, animation: 'spin 0.7s linear infinite' }} />
                <p style={{ fontSize: '12px', color: muted }}>A carregar...</p>
              </div>
            ) : history.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '60px 0' }}>
                <Zap size={28} color={isDark ? '#2a2a28' : '#d1cdc8'} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: muted }}>Sem histórico de contacto</p>
                <p style={{ fontSize: '11px', color: isDark ? '#3a3834' : '#c4bfb8', textAlign: 'center', maxWidth: '220px', lineHeight: 1.6 }}>
                  As actividades registadas nos deals da empresa aparecem aqui
                </p>
              </div>
            ) : (
              <div>
                {history.map((act, i) => {
                  const color = ACT_COLORS[act.type] ?? '#8a857d'
                  const Icon  = ACT_ICONS[act.type]  ?? FileText
                  return (
                    <div key={act.id} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: `${color}14`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon style={{ width: '12px', height: '12px', color }} />
                        </div>
                        {i < history.length - 1 && (
                          <div style={{ width: '1px', flex: 1, backgroundColor: border, marginTop: '4px' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, paddingBottom: '16px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '9px', fontWeight: 700, color, backgroundColor: `${color}14`, borderRadius: '3px', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {ACT_LABELS[act.type] ?? act.type}
                              </span>
                              {act.deal_title && (
                                <span style={{ fontSize: '9px', color: muted, backgroundColor: isDark ? '#1e1e1c' : '#f0eeea', borderRadius: '3px', padding: '1px 5px' }}>
                                  {act.deal_title}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: text, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {act.subject}
                            </p>
                            {act.body && (
                              <p style={{ fontSize: '12px', color: muted, marginTop: '3px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {act.body}
                              </p>
                            )}
                          </div>
                          <span style={{ fontSize: '10px', color: muted, flexShrink: 0, marginTop: '2px', whiteSpace: 'nowrap' }}>
                            {relativeDate(act.created_at)}
                          </span>
                        </div>
                        {act.owner_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: act.owner_color ?? muted, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '6px', fontWeight: 700 }}>
                              {act.owner_initials ?? act.owner_name.charAt(0)}
                            </div>
                            <span style={{ fontSize: '10px', color: muted }}>{act.owner_name.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
