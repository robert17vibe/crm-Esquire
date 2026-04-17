import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_OWNERS } from '@/lib/mock-data'
import { STAGES } from '@/constants/pipeline'
import { newLeadSchema, type NewLeadFormValues } from '@/lib/schemas/deal.schema'
import { useDealStore } from '@/store/useDealStore'
import type { Deal } from '@/types/deal.types'

// ─── Design tokens (local) ────────────────────────────────────────────────────

const T = {
  border:      'border border-[#dddaf5] dark:border-[#2e2b4a]',
  inputBg:     'bg-[#f8f7ff] dark:bg-[#1e1d3a]',
  focusBorder: 'focus:border-[#5b50e8] focus:ring-2 focus:ring-[#5b50e8]/15',
  errBorder:   'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/15',
  labelColor:  'text-[#1a1a2e] dark:text-[#a8a6d4]',
  separator:   'bg-[#f0eeff] dark:bg-[#2a2860]',
} as const

// ─── Field label ──────────────────────────────────────────────────────────────

function FLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block', T.labelColor)}
      style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}
    >
      {children}
      {required && (
        <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
      )}
    </label>
  )
}

// ─── Field error ──────────────────────────────────────────────────────────────

function FError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
      {msg}
    </p>
  )
}

// ─── Text input ───────────────────────────────────────────────────────────────

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }

function Input({ hasError, className, style, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        'w-full outline-none transition-all duration-150',
        'text-[#1a1a2e] dark:text-[#e8e6ff] placeholder-[#c5c4d6]',
        T.inputBg,
        T.border,
        hasError ? T.errBorder : T.focusBorder,
        className,
      )}
      style={{
        height: '40px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 500,
        paddingLeft: '12px',
        paddingRight: '12px',
        ...style,
      }}
      {...rest}
    />
  )
}

// ─── Select input ─────────────────────────────────────────────────────────────

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }

function Select({ hasError, className, style, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'w-full outline-none appearance-none transition-all duration-150 cursor-pointer',
          'text-[#1a1a2e] dark:text-[#e8e6ff]',
          T.inputBg,
          T.border,
          hasError ? T.errBorder : T.focusBorder,
          className,
        )}
        style={{
          height: '40px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 500,
          paddingLeft: '12px',
          paddingRight: '36px',
          ...style,
        }}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8aa3] pointer-events-none"
        style={{ width: '14px', height: '14px' }}
      />
    </div>
  )
}

// ─── Section header (title + separator line) ──────────────────────────────────

function SectionHead({ title, first }: { title: string; first?: boolean }) {
  return (
    <div style={{ paddingTop: first ? '4px' : '24px', paddingBottom: '14px' }}>
      <p
        className="text-[#8b8aa3] uppercase"
        style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}
      >
        {title}
      </p>
      <div className={T.separator} style={{ height: '1px' }} />
    </div>
  )
}

// ─── 2-col row ────────────────────────────────────────────────────────────────

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-2"
      style={{ gap: '16px', marginBottom: '14px' }}
    >
      {children}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (deal: Deal) => void
}

export function NewLeadModal({ open, onClose, onCreated }: Props) {
  const createDeal = useDealStore((s) => s.createDeal)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewLeadFormValues>({
    resolver: zodResolver(newLeadSchema),
    defaultValues: {
      stage_id: 'prospecting',
      owner_id: MOCK_OWNERS[0].id,
    },
  })

  function handleClose() {
    reset()
    onClose()
  }

  function onSubmit(values: NewLeadFormValues) {
    const deal = createDeal(values)
    onCreated(deal)
    reset()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <Dialog.Portal>

        {/* ── Overlay — sólido, sem blur ── */}
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'rgba(10,9,26,0.75)' }}
        />

        {/* ── Modal container ── */}
        <Dialog.Content
          className={cn(
            'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'max-w-[calc(100vw-32px)] max-h-[90vh]',
            'bg-white dark:bg-[#16152a]',
            T.border,
            'flex flex-col',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-150',
          )}
          style={{
            width: '580px',
            borderRadius: '20px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          }}
        >

          {/* ── Header ── */}
          <div
            className="flex items-start justify-between shrink-0"
            style={{ padding: '28px 32px 20px' }}
          >
            <div>
              <Dialog.Title
                className="text-[#1a1a2e] dark:text-[#e8e6ff]"
                style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}
              >
                Novo Lead
              </Dialog.Title>
              <Dialog.Description
                style={{ fontSize: '13px', color: '#8b8aa3', marginTop: '4px' }}
              >
                Preencha os dados do novo deal
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="flex items-center justify-center rounded-[8px] transition-colors duration-150 hover:text-[#1a1a2e] dark:hover:text-[#e8e6ff]"
                style={{
                  width: '32px',
                  height: '32px',
                  color: '#8b8aa3',
                  flexShrink: 0,
                  marginTop: '-2px',
                  marginRight: '-4px',
                }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Header separator */}
          <div className={T.separator} style={{ height: '1px', flexShrink: 0 }} />

          {/* ── Form body (scrollable) ── */}
          <form
            id="new-lead-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto"
            style={{ padding: '0 32px 4px' }}
          >

            {/* ════ SEÇÃO 1 — Contato ════ */}
            <SectionHead title="Contato" first />

            {/* Nome + Empresa */}
            <Row>
              <div>
                <FLabel htmlFor="contact_name" required>Nome completo</FLabel>
                <Input
                  id="contact_name"
                  type="text"
                  placeholder="João Silva"
                  hasError={!!errors.contact_name}
                  {...register('contact_name')}
                />
                <FError msg={errors.contact_name?.message} />
              </div>
              <div>
                <FLabel htmlFor="company_name" required>Empresa</FLabel>
                <Input
                  id="company_name"
                  type="text"
                  placeholder="Acme Corp"
                  hasError={!!errors.company_name}
                  {...register('company_name')}
                />
                <FError msg={errors.company_name?.message} />
              </div>
            </Row>

            {/* Email + Telefone */}
            <Row>
              <div>
                <FLabel htmlFor="contact_email" required>Email</FLabel>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="joao@empresa.com"
                  hasError={!!errors.contact_email}
                  {...register('contact_email')}
                />
                <FError msg={errors.contact_email?.message} />
              </div>
              <div>
                <FLabel htmlFor="contact_phone">Telefone</FLabel>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder="+55 11 99999-9999"
                  {...register('contact_phone')}
                />
              </div>
            </Row>

            {/* Cargo + LinkedIn */}
            <Row>
              <div>
                <FLabel htmlFor="contact_title">Cargo</FLabel>
                <Input
                  id="contact_title"
                  type="text"
                  placeholder="CTO"
                  {...register('contact_title')}
                />
              </div>
              <div>
                <FLabel htmlFor="contact_linkedin">LinkedIn</FLabel>
                <Input
                  id="contact_linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  hasError={!!errors.contact_linkedin}
                  {...register('contact_linkedin')}
                />
                <FError msg={errors.contact_linkedin?.message} />
              </div>
            </Row>

            {/* ════ SEÇÃO 2 — Empresa & Deal ════ */}
            <SectionHead title="Empresa & Deal" />

            {/* Setor + Tamanho */}
            <Row>
              <div>
                <FLabel htmlFor="company_sector">Setor</FLabel>
                <Input
                  id="company_sector"
                  type="text"
                  placeholder="Fintech, SaaS…"
                  {...register('company_sector')}
                />
              </div>
              <div>
                <FLabel htmlFor="company_size">Tamanho da empresa</FLabel>
                <Select id="company_size" {...register('company_size')}>
                  <option value="">Selecione</option>
                  <option value="1-50">1–50 funcionários</option>
                  <option value="51-200">51–200 funcionários</option>
                  <option value="201-1000">201–1.000 funcionários</option>
                  <option value="1000+">1.000+ funcionários</option>
                </Select>
              </div>
            </Row>

            {/* Valor + Probabilidade */}
            <Row>
              <div>
                <FLabel htmlFor="value">Valor estimado (R$)</FLabel>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="500000"
                  hasError={!!errors.value}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}
                  {...register('value')}
                />
                <FError msg={errors.value?.message} />
              </div>
              <div>
                <FLabel htmlFor="probability">Probabilidade (%)</FLabel>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="25"
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}
                  {...register('probability')}
                />
              </div>
            </Row>

            {/* Responsável + Origem */}
            <Row>
              <div>
                <FLabel htmlFor="owner_id" required>Responsável</FLabel>
                <Select
                  id="owner_id"
                  hasError={!!errors.owner_id}
                  {...register('owner_id')}
                >
                  <option value="">Selecione</option>
                  {MOCK_OWNERS.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </Select>
                <FError msg={errors.owner_id?.message} />
              </div>
              <div>
                <FLabel htmlFor="lead_source">Origem do lead</FLabel>
                <Select id="lead_source" {...register('lead_source')}>
                  <option value="">Selecione</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Inbound">Inbound</option>
                  <option value="Outbound">Outbound</option>
                  <option value="Evento">Evento</option>
                </Select>
              </div>
            </Row>

            {/* Estágio — largura total */}
            <div style={{ marginBottom: '14px' }}>
              <FLabel htmlFor="stage_id" required>Estágio inicial</FLabel>
              <Select
                id="stage_id"
                hasError={!!errors.stage_id}
                {...register('stage_id')}
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
              <FError msg={errors.stage_id?.message} />
            </div>

            {/* ════ SEÇÃO 3 — Observação ════ */}
            <SectionHead title="Observação inicial" />

            <div style={{ marginBottom: '20px' }}>
              <textarea
                id="notes"
                rows={3}
                placeholder="Contexto do deal, quem indicou, próximos passos…"
                className={cn(
                  'w-full outline-none resize-none transition-all duration-150',
                  'text-[#1a1a2e] dark:text-[#e8e6ff] placeholder-[#c5c4d6]',
                  T.inputBg,
                  T.border,
                  T.focusBorder,
                )}
                style={{
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '10px 12px',
                  lineHeight: 1.6,
                }}
                {...register('notes')}
              />
            </div>
          </form>

          {/* Footer separator */}
          <div className={cn(T.separator, 'shrink-0')} style={{ height: '1px' }} />

          {/* ── Footer ── */}
          <div
            className="flex items-center justify-end shrink-0"
            style={{ padding: '16px 32px 24px', gap: '10px' }}
          >

            {/* Cancelar */}
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'transition-colors duration-150',
                'border border-[#dddaf5] dark:border-[#2e2b4a]',
                'text-[#8b8aa3] hover:bg-[#f8f7ff] dark:hover:bg-[#1e1d3a]',
              )}
              style={{
                height: '40px',
                borderRadius: '10px',
                padding: '0 24px',
                fontSize: '13px',
                fontWeight: 600,
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            {/* Criar Lead */}
            <button
              type="submit"
              form="new-lead-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 transition-opacity duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                height: '40px',
                borderRadius: '10px',
                padding: '0 28px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: '#5b50e8',
                color: '#ffffff',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 12px rgba(91,80,232,0.35)',
              }}
            >
              {isSubmitting && (
                <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />
              )}
              {isSubmitting ? 'Criando...' : 'Criar Lead'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
