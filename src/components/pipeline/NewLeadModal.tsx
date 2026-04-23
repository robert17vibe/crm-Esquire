import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGES } from '@/constants/pipeline'
import { newLeadSchema, type NewLeadFormValues } from '@/lib/schemas/deal.schema'
import { useDealStore } from '@/store/useDealStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import type { Deal } from '@/types/deal.types'

// ─── Design tokens — warm neutral, alinhado com design system ─────────────────

const T = {
  // Bordas: --line-rgb
  border:      'border border-[#e0dbd4] dark:border-[#242422]',
  // Fundo dos inputs: --surface-base
  inputBg:     'bg-[#f5f4f0] dark:bg-[#111110]',
  // Cor do texto dos inputs: --ink-base
  inputText:   'text-[#1a1814] dark:text-[#e8e4dc]',
  // Placeholder: --ink-faint
  placeholder: 'placeholder-[#c4bfb8] dark:placeholder-[#3a3834]',
  // Focus: --brand
  focusBorder: 'focus:border-[#2c5545] dark:focus:border-[#4a9080] focus:ring-2 focus:ring-[#2c5545]/15 dark:focus:ring-[#4a9080]/15',
  // Erro
  errBorder:   'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/15',
  // Labels: --ink-muted
  labelColor:  'text-[#8a857d] dark:text-[#6b6560]',
  // Separador: --line-rgb
  separator:   'bg-[#e0dbd4] dark:bg-[#242422]',
} as const

// ─── Field label ──────────────────────────────────────────────────────────────

function FLabel({ htmlFor, children, required }: {
  htmlFor: string; children: React.ReactNode; required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className={cn('block', T.labelColor)} style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
      {required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
    </label>
  )
}

// ─── Field error ──────────────────────────────────────────────────────────────

function FError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{msg}</p>
}

// ─── Text input ───────────────────────────────────────────────────────────────

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }

function Input({ hasError, className, style, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        'w-full outline-none transition-all duration-150',
        T.inputText, T.inputBg, T.border, T.placeholder,
        hasError ? T.errBorder : T.focusBorder,
        className,
      )}
      style={{
        height: '38px',
        borderRadius: '8px',
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

// ─── Select ───────────────────────────────────────────────────────────────────

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }

function Select({ hasError, className, style, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'w-full outline-none appearance-none transition-all duration-150 cursor-pointer',
          T.inputText, T.inputBg, T.border,
          hasError ? T.errBorder : T.focusBorder,
          className,
        )}
        style={{
          height: '38px',
          borderRadius: '8px',
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
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8a857d] dark:text-[#6b6560]"
        style={{ width: '13px', height: '13px' }}
      />
    </div>
  )
}

// ─── Currency input ───────────────────────────────────────────────────────────

function formatBRL(raw: number | undefined) {
  if (!raw && raw !== 0) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(raw)
}

function parseBRL(display: string): number {
  const digits = display.replace(/\D/g, '')
  return digits === '' ? 0 : parseInt(digits, 10)
}

function CurrencyInput({
  value,
  onChange,
  hasError,
  id,
}: {
  value?: number
  onChange: (v: number) => void
  hasError?: boolean
  id: string
}) {
  const [display, setDisplay] = useState(value ? formatBRL(value) : '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseBRL(e.target.value)
    setDisplay(raw === 0 ? '' : formatBRL(raw))
    onChange(raw)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder="R$ 0"
      value={display}
      onChange={handleChange}
      className={cn(
        'w-full outline-none transition-all duration-150',
        T.inputText, T.inputBg, T.border, T.placeholder,
        hasError ? T.errBorder : T.focusBorder,
      )}
      style={{
        height: '38px', borderRadius: '8px', fontSize: '13px',
        fontWeight: 500, paddingLeft: '12px', paddingRight: '12px',
        fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
      }}
    />
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({ title, first }: { title: string; first?: boolean }) {
  return (
    <div style={{ paddingTop: first ? '4px' : '20px', paddingBottom: '12px' }}>
      <p className="text-[#8a857d] dark:text-[#6b6560] uppercase" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '10px' }}>
        {title}
      </p>
      <div className={T.separator} style={{ height: '1px' }} />
    </div>
  )
}

// ─── 2-col row ────────────────────────────────────────────────────────────────

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2" style={{ gap: '14px', marginBottom: '12px' }}>
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
  const createDeal          = useDealStore((s) => s.createDeal)
  const deals               = useDealStore((s) => s.deals)
  const owners              = useOwnerStore((s) => s.owners)
  const getRoundRobinOwner  = useOwnerStore((s) => s.getRoundRobinOwner)
  const [autoAssign, setAutoAssign] = useState(true)

  const activeDealsByOwner = useMemo(() => {
    const m: Record<string, number> = {}
    deals.forEach((d) => {
      if (!['closed_won', 'closed_lost'].includes(d.stage_id)) m[d.owner_id] = (m[d.owner_id] ?? 0) + 1
    })
    return m
  }, [deals])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NewLeadFormValues>({
    resolver: zodResolver(newLeadSchema),
    defaultValues: { stage_id: 'leads', owner_id: '', value: 0 },
  })

  useEffect(() => {
    if (!owners.length) return
    if (autoAssign) {
      const next = getRoundRobinOwner(activeDealsByOwner)
      setValue('owner_id', next?.id ?? owners[0].id, { shouldValidate: true })
    } else {
      setValue('owner_id', owners[0].id, { shouldValidate: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owners, autoAssign])

  function handleClose() { reset(); onClose() }

  async function onSubmit(values: NewLeadFormValues) {
    const deal = await createDeal(values)
    onCreated(deal)
    reset()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <Dialog.Portal>

        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70" />

        {/* Modal */}
        <Dialog.Content
          className={cn(
            'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'max-w-[calc(100vw-32px)] max-h-[90vh]',
            // surface-card
            'bg-[#ffffff] dark:bg-[#161614]',
            T.border,
            'flex flex-col',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-150',
          )}
          style={{
            width: '580px',
            borderRadius: '16px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}
        >

          {/* Header */}
          <div className="flex items-start justify-between shrink-0" style={{ padding: '24px 28px 18px' }}>
            <div>
              <Dialog.Title
                className="text-[#1a1814] dark:text-[#e8e4dc]"
                style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}
              >
                Novo Lead
              </Dialog.Title>
              <Dialog.Description
                className="text-[#8a857d] dark:text-[#6b6560]"
                style={{ fontSize: '12px', marginTop: '3px' }}
              >
                Preencha os dados do novo lead
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="flex items-center justify-center rounded-[6px] transition-colors duration-150 text-[#8a857d] dark:text-[#6b6560] hover:text-[#1a1814] dark:hover:text-[#e8e4dc] hover:bg-[#f5f4f0] dark:hover:bg-[#1a1a18]"
                style={{ width: '28px', height: '28px', flexShrink: 0, marginTop: '-2px', marginRight: '-4px' }}
              >
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Header separator */}
          <div className={cn(T.separator, 'shrink-0')} style={{ height: '1px' }} />

          {/* Form body (scrollable) */}
          <form
            id="new-lead-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto"
            style={{ padding: '0 28px 4px' }}
          >

            {/* SEÇÃO 1 — Contato */}
            <SectionHead title="Contato" first />

            <Row>
              <div>
                <FLabel htmlFor="contact_name" required>Nome completo</FLabel>
                <Input id="contact_name" type="text" placeholder="João Silva" hasError={!!errors.contact_name} {...register('contact_name')} />
                <FError msg={errors.contact_name?.message} />
              </div>
              <div>
                <FLabel htmlFor="company_name" required>Empresa</FLabel>
                <Input id="company_name" type="text" placeholder="Acme Corp" hasError={!!errors.company_name} {...register('company_name')} />
                <FError msg={errors.company_name?.message} />
              </div>
            </Row>

            <Row>
              <div>
                <FLabel htmlFor="contact_email" required>Email</FLabel>
                <Input id="contact_email" type="email" placeholder="joao@empresa.com" hasError={!!errors.contact_email} {...register('contact_email')} />
                <FError msg={errors.contact_email?.message} />
              </div>
              <div>
                <FLabel htmlFor="contact_phone">Telefone</FLabel>
                <Input id="contact_phone" type="tel" placeholder="+55 11 99999-9999" {...register('contact_phone')} />
              </div>
            </Row>

            <Row>
              <div>
                <FLabel htmlFor="contact_title">Cargo</FLabel>
                <Input id="contact_title" type="text" placeholder="CTO" {...register('contact_title')} />
              </div>
              <div>
                <FLabel htmlFor="contact_linkedin">LinkedIn</FLabel>
                <Input id="contact_linkedin" type="url" placeholder="https://linkedin.com/in/..." hasError={!!errors.contact_linkedin} {...register('contact_linkedin')} />
                <FError msg={errors.contact_linkedin?.message} />
              </div>
            </Row>

            {/* SEÇÃO 2 — Empresa & Lead */}
            <SectionHead title="Empresa & Lead" />

            <Row>
              <div>
                <FLabel htmlFor="company_sector">Setor</FLabel>
                <Input id="company_sector" type="text" placeholder="Fintech, SaaS…" {...register('company_sector')} />
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

            <Row>
              <div>
                <FLabel htmlFor="value">Valor estimado (R$)</FLabel>
                <Controller
                  name="value"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="value"
                      value={field.value}
                      onChange={field.onChange}
                      hasError={!!errors.value}
                    />
                  )}
                />
                <FError msg={errors.value?.message} />
              </div>
              <div>
                <FLabel htmlFor="probability">Probabilidade (%)</FLabel>
                <Input
                  id="probability" type="number" min="0" max="100" placeholder="25"
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}
                  {...register('probability')}
                />
              </div>
            </Row>

            <Row>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <FLabel htmlFor="owner_id" required>Responsável</FLabel>
                  <button type="button" onClick={() => setAutoAssign((v) => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, color: autoAssign ? '#2c5545' : '#8a857d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ width: '24px', height: '13px', borderRadius: '99px', backgroundColor: autoAssign ? '#2c5545' : '#c4bfb8', position: 'relative', transition: 'background-color 0.2s', display: 'inline-block', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: '2px', left: autoAssign ? '13px' : '2px', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
                    </span>
                    Auto
                  </button>
                </div>
                <Select id="owner_id" hasError={!!errors.owner_id} {...register('owner_id')} disabled={autoAssign}>
                  <option value="">Selecione</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} {autoAssign ? '' : `(${activeDealsByOwner[o.id] ?? 0} ativos)`}</option>
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

            <div style={{ marginBottom: '12px' }}>
              <FLabel htmlFor="stage_id" required>Estágio inicial</FLabel>
              <Select id="stage_id" hasError={!!errors.stage_id} {...register('stage_id')}>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
              <FError msg={errors.stage_id?.message} />
            </div>

            {/* SEÇÃO 3 — Observação */}
            <SectionHead title="Observação inicial" />

            <div style={{ marginBottom: '20px' }}>
              <textarea
                id="notes"
                rows={3}
                placeholder="Contexto do lead, quem indicou, próximos passos…"
                className={cn(
                  'w-full outline-none resize-none transition-all duration-150',
                  T.inputText, T.inputBg, T.border, T.placeholder, T.focusBorder,
                )}
                style={{ borderRadius: '8px', fontSize: '13px', fontWeight: 500, padding: '10px 12px', lineHeight: 1.6 }}
                {...register('notes')}
              />
            </div>
          </form>

          {/* Footer separator */}
          <div className={cn(T.separator, 'shrink-0')} style={{ height: '1px' }} />

          {/* Footer */}
          <div className="flex items-center justify-end shrink-0" style={{ padding: '14px 28px 20px', gap: '8px' }}>

            {/* Cancelar */}
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'transition-colors duration-150',
                T.border,
                'text-[#8a857d] dark:text-[#6b6560]',
                'hover:bg-[#f5f4f0] dark:hover:bg-[#1a1a18]',
              )}
              style={{
                height: '38px', borderRadius: '8px', padding: '0 20px',
                fontSize: '13px', fontWeight: 600,
                background: 'transparent', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            {/* Criar Lead — fundo --ink-base, texto --surface-base */}
            <button
              type="submit"
              form="new-lead-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 transition-opacity duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                height: '38px', borderRadius: '8px', padding: '0 24px',
                fontSize: '13px', fontWeight: 700,
                // light: #1a1814 on #f5f4f0 / dark: #e8e4dc on #0d0c0a
                backgroundColor: 'var(--ink-base)',
                color: 'var(--surface-base)',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting && <Loader2 style={{ width: '13px', height: '13px' }} className="animate-spin" />}
              {isSubmitting ? 'Criando...' : 'Criar Lead'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
