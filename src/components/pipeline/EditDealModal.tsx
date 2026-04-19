import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGES } from '@/constants/pipeline'
import { newLeadSchema, type NewLeadFormValues } from '@/lib/schemas/deal.schema'
import { useDealStore } from '@/store/useDealStore'
import { useOwnerStore } from '@/store/useOwnerStore'
import type { Deal } from '@/types/deal.types'

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  border:      'border border-[#e4e0da] dark:border-[#242422]',
  inputBg:     'bg-[#f5f4f0] dark:bg-[#111110]',
  focusBorder: 'focus:border-[#2c5545] dark:focus:border-[#4a9080] focus:ring-2 focus:ring-[#2c5545]/15 dark:focus:ring-[#4a9080]/15',
  errBorder:   'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/15',
  labelColor:  'text-[#8a857d] dark:text-[#6b6560]',
  separator:   'bg-[#e4e0da] dark:bg-[#242422]',
} as const

function FLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={cn('block', T.labelColor)} style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
      {children}
      {required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
    </label>
  )
}

function FError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{msg}</p>
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }

function Input({ hasError, className, style, ...rest }: InputProps) {
  return (
    <input
      className={cn('w-full outline-none transition-all duration-150', 'text-[#1a1814] dark:text-[#e8e4dc] placeholder-[#c4bfb8] dark:placeholder-[#3a3834]', T.inputBg, T.border, hasError ? T.errBorder : T.focusBorder, className)}
      style={{ height: '40px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, paddingLeft: '12px', paddingRight: '12px', ...style }}
      {...rest}
    />
  )
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }

function Select({ hasError, className, style, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn('w-full outline-none appearance-none transition-all duration-150 cursor-pointer', 'text-[#1a1814] dark:text-[#e8e4dc]', T.inputBg, T.border, hasError ? T.errBorder : T.focusBorder, className)}
        style={{ height: '40px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, paddingLeft: '12px', paddingRight: '36px', ...style }}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8aa3] pointer-events-none" style={{ width: '14px', height: '14px' }} />
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
        'text-[#1a1814] dark:text-[#e8e4dc] placeholder-[#c4bfb8] dark:placeholder-[#3a3834]',
        T.inputBg, T.border, hasError ? T.errBorder : T.focusBorder,
      )}
      style={{
        height: '40px', borderRadius: '10px', fontSize: '13px',
        fontWeight: 500, paddingLeft: '12px', paddingRight: '12px',
        fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
      }}
    />
  )
}

function SectionHead({ title, first }: { title: string; first?: boolean }) {
  return (
    <div style={{ paddingTop: first ? '4px' : '24px', paddingBottom: '14px' }}>
      <p className="text-[#8a857d] dark:text-[#6b6560] uppercase" style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}>{title}</p>
      <div className={T.separator} style={{ height: '1px' }} />
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2" style={{ gap: '16px', marginBottom: '14px' }}>{children}</div>
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  deal: Deal | null
  open: boolean
  onClose: () => void
  onUpdated: (deal: Deal) => void
}

export function EditDealModal({ deal, open, onClose, onUpdated }: Props) {
  const updateDeal = useDealStore((s) => s.updateDeal)
  const owners = useOwnerStore((s) => s.owners)

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<NewLeadFormValues>({
    resolver: zodResolver(newLeadSchema),
    values: deal
      ? {
          stage_id:         deal.stage_id,
          owner_id:         deal.owner_id,
          contact_name:     deal.contact_name ?? '',
          company_name:     deal.company_name,
          contact_email:    deal.contact_email ?? '',
          contact_phone:    deal.contact_phone ?? '',
          contact_title:    deal.contact_title ?? '',
          contact_linkedin: deal.contact_linkedin ?? '',
          company_sector:   deal.company_sector ?? '',
          company_size:     deal.company_size,
          value:            deal.value,
          probability:      deal.probability,
          lead_source:      deal.lead_source,
          notes:            deal.notes ?? '',
        }
      : undefined,
  })

  function handleClose() {
    reset()
    onClose()
  }

  async function onSubmit(values: NewLeadFormValues) {
    if (!deal) return
    const updated = await updateDeal(deal.id, values)
    onUpdated(updated)
    reset()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(10,9,26,0.75)' }} />
        <Dialog.Content
          className={cn(
            'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'max-w-[calc(100vw-32px)] max-h-[90vh]',
            'bg-white dark:bg-[#161614]',
            T.border,
            'flex flex-col',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-150',
          )}
          style={{ width: '580px', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}
        >
          {/* ── Header ── */}
          <div className="flex items-start justify-between shrink-0" style={{ padding: '28px 32px 20px' }}>
            <div>
              <Dialog.Title className="text-[#1a1814] dark:text-[#e8e4dc]" style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>
                Editar Lead
              </Dialog.Title>
              <Dialog.Description className="text-[#8a857d] dark:text-[#6b6560]" style={{ fontSize: '13px', marginTop: '4px' }}>
                {deal?.company_name ?? '—'} — {deal?.contact_name ?? '—'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Fechar" className="flex items-center justify-center rounded-[8px] transition-colors duration-150 text-[#8a857d] dark:text-[#6b6560] hover:text-[#1a1814] dark:hover:text-[#e8e4dc]" style={{ width: '32px', height: '32px', flexShrink: 0, marginTop: '-2px', marginRight: '-4px' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </Dialog.Close>
          </div>

          <div className={T.separator} style={{ height: '1px', flexShrink: 0 }} />

          {/* ── Form ── */}
          <form id="edit-deal-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto" style={{ padding: '0 32px 4px' }}>
            <SectionHead title="Contato" first />
            <Row>
              <div>
                <FLabel htmlFor="e_contact_name" required>Nome completo</FLabel>
                <Input id="e_contact_name" type="text" placeholder="João Silva" hasError={!!errors.contact_name} {...register('contact_name')} />
                <FError msg={errors.contact_name?.message} />
              </div>
              <div>
                <FLabel htmlFor="e_company_name" required>Empresa</FLabel>
                <Input id="e_company_name" type="text" placeholder="Acme Corp" hasError={!!errors.company_name} {...register('company_name')} />
                <FError msg={errors.company_name?.message} />
              </div>
            </Row>
            <Row>
              <div>
                <FLabel htmlFor="e_contact_email" required>Email</FLabel>
                <Input id="e_contact_email" type="email" placeholder="joao@empresa.com" hasError={!!errors.contact_email} {...register('contact_email')} />
                <FError msg={errors.contact_email?.message} />
              </div>
              <div>
                <FLabel htmlFor="e_contact_phone">Telefone</FLabel>
                <Input id="e_contact_phone" type="tel" placeholder="+55 11 99999-9999" {...register('contact_phone')} />
              </div>
            </Row>
            <Row>
              <div>
                <FLabel htmlFor="e_contact_title">Cargo</FLabel>
                <Input id="e_contact_title" type="text" placeholder="CTO" {...register('contact_title')} />
              </div>
              <div>
                <FLabel htmlFor="e_contact_linkedin">LinkedIn</FLabel>
                <Input id="e_contact_linkedin" type="url" placeholder="https://linkedin.com/in/..." hasError={!!errors.contact_linkedin} {...register('contact_linkedin')} />
                <FError msg={errors.contact_linkedin?.message} />
              </div>
            </Row>

            <SectionHead title="Empresa & Lead" />
            <Row>
              <div>
                <FLabel htmlFor="e_company_sector">Setor</FLabel>
                <Input id="e_company_sector" type="text" placeholder="Fintech, SaaS…" {...register('company_sector')} />
              </div>
              <div>
                <FLabel htmlFor="e_company_size">Tamanho da empresa</FLabel>
                <Select id="e_company_size" {...register('company_size')}>
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
                <FLabel htmlFor="e_value">Valor estimado (R$)</FLabel>
                <Controller
                  name="value"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="e_value"
                      value={field.value}
                      onChange={field.onChange}
                      hasError={!!errors.value}
                    />
                  )}
                />
                <FError msg={errors.value?.message} />
              </div>
              <div>
                <FLabel htmlFor="e_probability">Probabilidade (%)</FLabel>
                <Input id="e_probability" type="number" min="0" max="100" placeholder="25" style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }} {...register('probability')} />
              </div>
            </Row>
            <Row>
              <div>
                <FLabel htmlFor="e_owner_id" required>Responsável</FLabel>
                <Select id="e_owner_id" hasError={!!errors.owner_id} {...register('owner_id')}>
                  <option value="">Selecione</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </Select>
                <FError msg={errors.owner_id?.message} />
              </div>
              <div>
                <FLabel htmlFor="e_lead_source">Origem do lead</FLabel>
                <Select id="e_lead_source" {...register('lead_source')}>
                  <option value="">Selecione</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Inbound">Inbound</option>
                  <option value="Outbound">Outbound</option>
                  <option value="Evento">Evento</option>
                </Select>
              </div>
            </Row>
            <div style={{ marginBottom: '14px' }}>
              <FLabel htmlFor="e_stage_id" required>Estágio</FLabel>
              <Select id="e_stage_id" hasError={!!errors.stage_id} {...register('stage_id')}>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
              <FError msg={errors.stage_id?.message} />
            </div>

            <SectionHead title="Observação" />
            <div style={{ marginBottom: '20px' }}>
              <textarea
                id="e_notes"
                rows={3}
                placeholder="Contexto do lead, notas, próximos passos…"
                className={cn('w-full outline-none resize-none transition-all duration-150', 'text-[#1a1814] dark:text-[#e8e4dc] placeholder-[#c4bfb8] dark:placeholder-[#3a3834]', T.inputBg, T.border, T.focusBorder)}
                style={{ borderRadius: '10px', fontSize: '13px', fontWeight: 500, padding: '10px 12px', lineHeight: 1.6 }}
                {...register('notes')}
              />
            </div>
          </form>

          <div className={cn(T.separator, 'shrink-0')} style={{ height: '1px' }} />

          {/* ── Footer ── */}
          <div className="flex items-center justify-end shrink-0" style={{ padding: '16px 32px 24px', gap: '10px' }}>
            <button type="button" onClick={handleClose} className={cn('transition-colors duration-150 text-[#8a857d] dark:text-[#6b6560]', 'border border-[#e4e0da] dark:border-[#242422]', 'hover:bg-[#f5f4f0] dark:hover:bg-[#1e1e1c] hover:text-[#1a1814] dark:hover:text-[#e8e4dc]')} style={{ height: '40px', borderRadius: '10px', padding: '0 24px', fontSize: '13px', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" form="edit-deal-form" disabled={isSubmitting} className="flex items-center gap-2 transition-opacity duration-150 disabled:opacity-70 disabled:cursor-not-allowed" style={{ height: '40px', borderRadius: '10px', padding: '0 28px', fontSize: '13px', fontWeight: 700, backgroundColor: '#2c5545', color: '#ffffff', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 2px 12px rgba(44,85,69,0.35)' }}>
              {isSubmitting && <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />}
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
