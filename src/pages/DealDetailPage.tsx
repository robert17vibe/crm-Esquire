import { useParams, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  Mail, Phone, Linkedin, Globe,
  Building2, Users, Target,
  CalendarClock, MapPin, Zap, Clock,
  Activity, Lightbulb,
} from 'lucide-react'
import { MOCK_DEALS } from '@/lib/mock-data'
import { STAGES, getStageColor } from '@/constants/pipeline'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h)
  }
  return `hsl(${((Math.abs(h) % 360) + 360) % 360}, 52%, 46%)`
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

const SIZE_LABELS: Record<string, string> = {
  '1-50':    '1–50 funcionários',
  '51-200':  '51–200 funcionários',
  '201-1000':'201–1.000 funcionários',
  '1000+':   '1.000+ funcionários',
}
const ARR_LABELS: Record<string, string> = {
  '<100k':    'Abaixo de R$ 100k',
  '100k-500k':'R$ 100k – 500k',
  '500k-1M':  'R$ 500k – 1M',
  '>1M':      'Acima de R$ 1M',
}

// Column separator class
const COL_SEP = 'border-r border-[#f0eeff] dark:border-[#2a2860]'

// ─── Building blocks ──────────────────────────────────────────────────────────

function GroupHead({ title, first }: { title: string; first?: boolean }) {
  return (
    <div style={{ paddingTop: first ? '0' : '16px', marginBottom: '10px' }}>
      {!first && (
        <div
          className="bg-[#f0eeff] dark:bg-[#2a2860]"
          style={{ height: '1px', marginBottom: '14px' }}
        />
      )}
      <p
        className="text-[#8b8aa3] uppercase tracking-widest"
        style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em' }}
      >
        {title}
      </p>
    </div>
  )
}

// Vertical field: label → icon + value
function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon?: LucideIcon
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <p
        className="text-[#8b8aa3] uppercase"
        style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '3px' }}
      >
        {label}
      </p>
      <div className="flex items-center gap-1.5 min-w-0">
        {Icon && (
          <Icon
            className="shrink-0"
            style={{ width: '13px', height: '13px', color: '#8b8aa3' }}
          />
        )}
        <span
          className="text-[#1a1a2e] dark:text-[#e8e6ff] truncate"
          style={{ fontSize: '13px', fontWeight: 500 }}
        >
          {children}
        </span>
      </div>
    </div>
  )
}

// Link field (email / phone / external)
function LinkField({
  label,
  icon: Icon,
  href,
  external,
  children,
}: {
  label: string
  icon: LucideIcon
  href: string
  external?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <p
        className="text-[#8b8aa3] uppercase"
        style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '3px' }}
      >
        {label}
      </p>
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="flex items-center gap-1.5 text-[#5b50e8] hover:underline min-w-0"
        style={{ fontSize: '13px', fontWeight: 500 }}
      >
        <Icon
          className="shrink-0"
          style={{ width: '13px', height: '13px', color: '#8b8aa3' }}
        />
        <span className="truncate">{children}</span>
      </a>
    </div>
  )
}

// Elegant empty state for center / right columns
function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className="bg-[#faf9ff] dark:bg-[#1a1930] flex flex-col items-center text-center"
        style={{ borderRadius: '12px', padding: '48px 32px', maxWidth: '280px' }}
      >
        <div
          className="flex items-center justify-center mb-4 bg-surface-col"
          style={{ width: '48px', height: '48px', borderRadius: '12px' }}
        >
          <Icon style={{ width: '24px', height: '24px', color: '#dddaf5' }} />
        </div>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#8b8aa3', marginBottom: '6px' }}>
          {title}
        </p>
        <p style={{ fontSize: '12px', color: '#b0aec8', lineHeight: 1.6 }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}

// ─── Left column ──────────────────────────────────────────────────────────────

type DealType = (typeof MOCK_DEALS)[number]

function LeftColumn({ deal }: { deal: DealType }) {
  const stageColor = getStageColor(deal.stage_id)
  const stage      = STAGES.find((s) => s.id === deal.stage_id)
  const tag        = deal.tags?.[0]

  const contactName  = deal.contact_name ?? deal.company_name
  const initials     = contactName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const avatarColor  = hashColor(contactName)

  return (
    <aside
      className={cn('shrink-0 overflow-y-auto bg-surface-base', COL_SEP)}
      style={{ width: '270px' }}
    >
      <div style={{ padding: '24px 20px' }}>

        {/* ── Identity block ── */}
        <div
          className="flex items-center justify-center text-white"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: avatarColor,
            fontSize: '18px',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <p
          className="text-[#1a1a2e] dark:text-[#e8e6ff]"
          style={{ fontSize: '17px', fontWeight: 700, marginTop: '12px', lineHeight: 1.25 }}
        >
          {contactName}
        </p>
        {deal.contact_title && (
          <p style={{ fontSize: '13px', color: '#8b8aa3', marginTop: '2px' }}>
            {deal.contact_title}
          </p>
        )}
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#5b50e8', marginTop: '2px' }}>
          {deal.company_name}
        </p>
        {tag && (
          <span
            className="inline-block text-white"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: stageColor,
              borderRadius: '99px',
              padding: '3px 10px',
              marginTop: '8px',
            }}
          >
            {tag}
          </span>
        )}

        {/* ── Deal summary 2×2 ── */}
        <div
          className="bg-[#f8f7ff] dark:bg-[#1e1d3a]"
          style={{ borderRadius: '12px', padding: '12px 14px', marginTop: '16px' }}
        >
          <div className="grid grid-cols-2" style={{ gap: '14px' }}>
            {/* Valor */}
            <div>
              <p className="text-[#8b8aa3] uppercase" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>
                Valor
              </p>
              <p
                className="text-[#1a1a2e] dark:text-[#e8e6ff]"
                style={{ fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}
              >
                {formatCurrency(deal.value)}
              </p>
            </div>

            {/* Probabilidade */}
            <div>
              <p className="text-[#8b8aa3] uppercase" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>
                Prob.
              </p>
              <p
                className="text-[#1a1a2e] dark:text-[#e8e6ff]"
                style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.2, marginBottom: '5px' }}
              >
                {deal.probability}%
              </p>
              <div
                className="bg-[#eeecf9] dark:bg-[#2e2b4a] rounded-full overflow-hidden"
                style={{ height: '3px' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${deal.probability}%`, backgroundColor: stageColor }}
                />
              </div>
            </div>

            {/* Estágio */}
            <div>
              <p className="text-[#8b8aa3] uppercase" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>
                Estágio
              </p>
              <span
                className="inline-flex items-center gap-1"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: `${stageColor}1a`,
                  color: stageColor,
                  borderRadius: '99px',
                  padding: '2px 8px',
                }}
              >
                <span
                  style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: stageColor, flexShrink: 0 }}
                />
                {stage?.label}
              </span>
            </div>

            {/* Dias */}
            <div>
              <p className="text-[#8b8aa3] uppercase" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>
                Dias etapa
              </p>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: deal.days_in_stage > 90 ? '#ef4444' : 'var(--ink-base)',
                }}
              >
                {deal.days_in_stage}d
                {deal.days_in_stage > 90 && (
                  <span style={{ fontSize: '10px', color: '#ef4444', marginLeft: '4px', fontWeight: 600 }}>
                    stale
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── CONTATO ── */}
        <div style={{ marginTop: '20px' }}>
          <GroupHead title="Contato" first />

          {deal.contact_email && (
            <LinkField label="Email" icon={Mail} href={`mailto:${deal.contact_email}`}>
              {deal.contact_email}
            </LinkField>
          )}
          {deal.contact_phone && (
            <LinkField label="Telefone" icon={Phone} href={`tel:${deal.contact_phone}`}>
              {deal.contact_phone}
            </LinkField>
          )}
          {deal.contact_linkedin && (
            <LinkField label="LinkedIn" icon={Linkedin} href={deal.contact_linkedin} external>
              Ver perfil ↗
            </LinkField>
          )}
          {deal.company_website && (
            <LinkField label="Site" icon={Globe} href={deal.company_website} external>
              {deal.company_website.replace(/^https?:\/\//, '')} ↗
            </LinkField>
          )}
        </div>

        {/* ── EMPRESA ── */}
        <GroupHead title="Empresa" />
        {deal.company_sector && (
          <Field label="Setor" icon={Building2}>{deal.company_sector}</Field>
        )}
        {deal.company_size && (
          <Field label="Tamanho" icon={Users}>
            {SIZE_LABELS[deal.company_size] ?? deal.company_size}
          </Field>
        )}
        {deal.company_arr_range && (
          <Field label="ARR Estimado" icon={Target}>
            {ARR_LABELS[deal.company_arr_range] ?? deal.company_arr_range}
          </Field>
        )}

        {/* ── DEAL ── */}
        <GroupHead title="Deal" />

        {/* Responsável — custom (avatar + nome) */}
        <div style={{ marginBottom: '10px' }}>
          <p
            className="text-[#8b8aa3] uppercase"
            style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '3px' }}
          >
            Responsável
          </p>
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center justify-center text-white shrink-0"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: deal.owner.avatar_color,
                fontSize: '7px',
                fontWeight: 700,
              }}
            >
              {deal.owner.initials}
            </div>
            <span
              className="text-[#1a1a2e] dark:text-[#e8e6ff]"
              style={{ fontSize: '13px', fontWeight: 500 }}
            >
              {deal.owner.name}
            </span>
          </div>
        </div>

        <Field label="Data de fechamento" icon={CalendarClock}>
          {formatDate(deal.expected_close)}
        </Field>
        {deal.lead_source && (
          <Field label="Origem do lead" icon={MapPin}>{deal.lead_source}</Field>
        )}

        {/* Próxima atividade */}
        {deal.next_activity && (
          <div style={{ marginBottom: '10px' }}>
            <p
              className="text-[#8b8aa3] uppercase"
              style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '3px' }}
            >
              Próxima atividade
            </p>
            <div className="flex items-start gap-1.5">
              <Zap
                className="shrink-0 mt-0.5"
                style={{ width: '13px', height: '13px', color: '#8b8aa3' }}
              />
              <div className="min-w-0">
                <p className="text-[#1a1a2e] dark:text-[#e8e6ff]" style={{ fontSize: '13px', fontWeight: 500 }}>
                  {deal.next_activity.label}
                </p>
                <p style={{ fontSize: '11px', color: '#8b8aa3', marginTop: '1px', textTransform: 'capitalize' }}>
                  {deal.next_activity.type} · {formatDate(deal.next_activity.due_date)}
                </p>
              </div>
            </div>
          </div>
        )}
        {deal.last_activity_at && (
          <Field label="Última atividade" icon={Clock}>
            {formatDate(deal.last_activity_at)}
          </Field>
        )}

      </div>
    </aside>
  )
}

// ─── Center column ────────────────────────────────────────────────────────────

function CenterColumn() {
  return (
    <div className={cn('flex-1 flex flex-col overflow-y-auto bg-surface-card', COL_SEP)}>
      {/* Column header */}
      <div
        className="shrink-0 border-b border-[#f0eeff] dark:border-[#2a2860]"
        style={{ padding: '20px 24px' }}
      >
        <p
          className="text-[#1a1a2e] dark:text-[#e8e6ff]"
          style={{ fontSize: '15px', fontWeight: 600 }}
        >
          Histórico & Atividades
        </p>
      </div>

      <EmptyState
        icon={Activity}
        title="Nenhuma atividade registrada ainda"
        subtitle="As atividades, reuniões e transcrições do Plaud aparecerão aqui"
      />
    </div>
  )
}

// ─── Right column ─────────────────────────────────────────────────────────────

function RightColumn() {
  return (
    <div className="flex flex-col overflow-y-auto bg-surface-card" style={{ width: '290px', flexShrink: 0 }}>
      {/* Column header */}
      <div
        className="shrink-0 border-b border-[#f0eeff] dark:border-[#2a2860]"
        style={{ padding: '20px 24px' }}
      >
        <p
          className="text-[#1a1a2e] dark:text-[#e8e6ff]"
          style={{ fontSize: '15px', fontWeight: 600 }}
        >
          Insights
        </p>
      </div>

      <EmptyState
        icon={Lightbulb}
        title="Painel de insights em breve"
        subtitle="Recomendações de IA e análise do deal aparecerão aqui"
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DealDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const deal       = MOCK_DEALS.find((d) => d.id === id)

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#8b8aa3' }}>
          Deal não encontrado
        </p>
        <button
          type="button"
          onClick={() => navigate('/pipeline')}
          className="text-[#5b50e8] hover:underline"
          style={{ fontSize: '13px', fontWeight: 600 }}
        >
          Voltar ao Pipeline
        </button>
      </div>
    )
  }

  const stageColor = getStageColor(deal.stage_id)
  const stage      = STAGES.find((s) => s.id === deal.stage_id)

  return (
    <div className="flex flex-col h-full" style={{ gap: '16px' }}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center min-w-0" style={{ gap: '8px' }}>
          {/* Back link */}
          <button
            type="button"
            onClick={() => navigate('/pipeline')}
            className="flex items-center gap-1 transition-colors duration-150 hover:text-[#5b50e8] shrink-0"
            style={{ fontSize: '13px', color: '#8b8aa3' }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
            Pipeline
          </button>

          {/* Separator */}
          <span style={{ fontSize: '13px', color: '#dddaf5', flexShrink: 0 }}>/</span>

          {/* Deal name */}
          <p
            className="text-[#1a1a2e] dark:text-[#e8e6ff] truncate"
            style={{ fontSize: '15px', fontWeight: 600 }}
          >
            {deal.title}
          </p>

          {/* Stage badge */}
          {stage && (
            <span
              className="shrink-0 inline-flex items-center gap-1"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: `${stageColor}1a`,
                color: stageColor,
                borderRadius: '99px',
                padding: '3px 10px',
              }}
            >
              <span
                style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stageColor, flexShrink: 0 }}
              />
              {stage.label}
            </span>
          )}
        </div>

        {/* Edit button */}
        <button
          type="button"
          className={cn(
            'shrink-0 transition-colors duration-150',
            'border border-[#dddaf5] dark:border-[#2e2b4a]',
            'text-[#8b8aa3] hover:text-[#5b50e8] hover:border-[#5b50e8]/40',
            'bg-surface-card',
          )}
          style={{ fontSize: '13px', fontWeight: 500, borderRadius: '10px', padding: '7px 16px' }}
        >
          Editar deal
        </button>
      </div>

      {/* ── 3-column area ── */}
      <div
        className={cn(
          'flex flex-1 min-h-0',
          'rounded-[16px] overflow-hidden',
          'border border-[#f0eeff] dark:border-[#2a2860]',
        )}
        style={{ boxShadow: '0 2px 12px rgba(91,80,232,0.06)' }}
      >
        <LeftColumn deal={deal} />
        <CenterColumn />
        <RightColumn />
      </div>
    </div>
  )
}
