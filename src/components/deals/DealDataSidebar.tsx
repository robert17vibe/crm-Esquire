import { ExternalLink, Mail, Phone, Linkedin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStageColor, getTagStyle } from '@/constants/pipeline'
import type { Deal } from '@/types/deal.types'

// ─── Building blocks ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-bold text-ink-muted uppercase tracking-widest leading-none">
      {children}
    </span>
  )
}

function Value({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-[13px] font-medium text-ink-base leading-snug', className)}>
      {children}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-0 py-2.5">
      <span className="w-[88px] shrink-0 pt-0.5">
        <Label>{label}</Label>
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function Separator() {
  return <div className="h-px bg-line/40 my-0.5" />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold text-ink-muted uppercase tracking-widest pt-3 pb-1">
      {children}
    </p>
  )
}

function LinkValue({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: typeof Mail
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline truncate"
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="truncate">{children}</span>
    </a>
  )
}

// ─── Probability bar ──────────────────────────────────────────────────────────

function ProbabilityBar({ probability, stageId }: { probability: number; stageId: string }) {
  const color = getStageColor(stageId)
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-ink-base">{probability}%</span>
      </div>
      <div className="w-full rounded-full overflow-hidden h-[5px]" style={{ backgroundColor: 'var(--progress-bg)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${probability}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

interface Props {
  deal: Deal
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

const COMPANY_SIZE_LABELS: Record<string, string> = {
  '1-50': '1–50 funcionários',
  '51-200': '51–200 funcionários',
  '201-1000': '201–1.000 funcionários',
  '1000+': '1.000+ funcionários',
}

const ARR_LABELS: Record<string, string> = {
  '<100k': 'Abaixo de R$ 100k',
  '100k-500k': 'R$ 100k – 500k',
  '500k-1M': 'R$ 500k – 1M',
  '>1M': 'Acima de R$ 1M',
}

export function DealDataSidebar({ deal }: Props) {
  const tag = deal.tags?.[0]
  const tagStyle = tag ? getTagStyle(tag) : null

  return (
    <aside className="w-[260px] shrink-0 rounded-[18px] bg-surface-base border border-line/60 overflow-y-auto flex flex-col">
      <div className="px-5 py-4 flex-1">

        {/* Tag de categoria */}
        {tagStyle && tag && (
          <div className="mb-4">
            <span
              className="inline-block text-[10px] font-semibold text-white rounded-full"
              style={{ backgroundColor: tagStyle.bg, padding: '3px 12px' }}
            >
              {tag}
            </span>
          </div>
        )}

        {/* ── Contato principal ── */}
        <SectionTitle>Contato Principal</SectionTitle>
        {deal.contact_name && (
          <Field label="Nome">
            <Value>{deal.contact_name}</Value>
          </Field>
        )}
        {deal.contact_title && (
          <Field label="Cargo">
            <Value className="text-ink-muted">{deal.contact_title}</Value>
          </Field>
        )}
        {deal.contact_email && (
          <Field label="Email">
            <LinkValue href={`mailto:${deal.contact_email}`} icon={Mail}>
              {deal.contact_email}
            </LinkValue>
          </Field>
        )}
        {deal.contact_phone && (
          <Field label="Telefone">
            <LinkValue href={`tel:${deal.contact_phone}`} icon={Phone}>
              {deal.contact_phone}
            </LinkValue>
          </Field>
        )}
        {deal.contact_linkedin && (
          <Field label="LinkedIn">
            <LinkValue href={deal.contact_linkedin} icon={Linkedin}>
              Ver perfil
            </LinkValue>
          </Field>
        )}

        <Separator />

        {/* ── Empresa ── */}
        <SectionTitle>Empresa</SectionTitle>
        <Field label="Empresa">
          <div className="flex items-center gap-1.5">
            <Value>{deal.company_name}</Value>
            {deal.company_website && (
              <a
                href={deal.company_website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-faint hover:text-brand transition-colors"
                aria-label="Site da empresa"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </Field>
        {deal.company_sector && (
          <Field label="Setor">
            <Value>{deal.company_sector}</Value>
          </Field>
        )}
        {deal.company_size && (
          <Field label="Tamanho">
            <Value>{COMPANY_SIZE_LABELS[deal.company_size] ?? deal.company_size}</Value>
          </Field>
        )}
        {deal.company_arr_range && (
          <Field label="ARR Est.">
            <Value>{ARR_LABELS[deal.company_arr_range] ?? deal.company_arr_range}</Value>
          </Field>
        )}

        <Separator />

        {/* ── Deal ── */}
        <SectionTitle>Deal</SectionTitle>
        <Field label="Valor">
          <span className="font-mono text-[15px] font-semibold text-ink-base">
            {formatCurrency(deal.value)}
          </span>
        </Field>
        <Field label="Prob.">
          <ProbabilityBar probability={deal.probability} stageId={deal.stage_id} />
        </Field>
        <Field label="Responsável">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
              style={{ backgroundColor: deal.owner.avatar_color }}
            >
              {deal.owner.initials}
            </div>
            <Value>{deal.owner.name}</Value>
          </div>
        </Field>
        <Field label="Fechamento">
          <Value>{formatDate(deal.expected_close)}</Value>
        </Field>
        <Field label="Dias etapa">
          <span
            className={cn(
              'font-mono text-[13px] font-medium',
              deal.days_in_stage > 90 ? 'text-[#ef4444]' : 'text-ink-base',
            )}
          >
            {deal.days_in_stage}d
            {deal.days_in_stage > 90 && (
              <span className="text-[10px] text-[#ef4444] ml-1">· stale</span>
            )}
          </span>
        </Field>
        {deal.lead_source && (
          <Field label="Origem">
            <Value>{deal.lead_source}</Value>
          </Field>
        )}

        {/* ── Próxima atividade ── */}
        {deal.next_activity && (
          <>
            <Separator />
            <SectionTitle>Próxima Atividade</SectionTitle>
            <div className="py-2">
              <p className="text-[13px] font-medium text-ink-base">{deal.next_activity.label}</p>
              <p className="text-[11px] text-ink-muted mt-0.5 capitalize">{deal.next_activity.type} · {formatDate(deal.next_activity.due_date)}</p>
            </div>
          </>
        )}

      </div>
    </aside>
  )
}
