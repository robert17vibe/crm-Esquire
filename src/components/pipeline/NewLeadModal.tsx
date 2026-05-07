import * as Dialog from '@radix-ui/react-dialog'
import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGES } from '@/constants/pipeline'
import { useDealStore } from '@/store/useDealStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useToastStore } from '@/store/useToastStore'
import type { Deal } from '@/types/deal.types'

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  border:      'border border-[#e0dbd4] dark:border-[#242422]',
  inputBg:     'bg-[#f5f4f0] dark:bg-[#111110]',
  inputText:   'text-[#1a1814] dark:text-[#e8e4dc]',
  placeholder: 'placeholder-[#c4bfb8] dark:placeholder-[#3a3834]',
  focusBorder: 'focus:border-[#6b1212] dark:focus:border-[#6b1212] focus:ring-2 focus:ring-[#6b1212]/15',
  labelColor:  'text-[#8a857d] dark:text-[#6b6560]',
  separator:   'bg-[#e0dbd4] dark:bg-[#242422]',
} as const

const inputCls = cn(
  'w-full outline-none transition-all duration-150',
  T.inputText, T.inputBg, T.border, T.placeholder, T.focusBorder,
)

const inputStyle: React.CSSProperties = {
  height: '38px', borderRadius: '8px',
  fontSize: '13px', fontWeight: 500,
  paddingLeft: '12px', paddingRight: '12px',
}

function FLabel({ htmlFor, children, required }: {
  htmlFor: string; children: React.ReactNode; required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className={cn('block', T.labelColor)}
      style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
      {required && <span style={{ color: '#b83535', marginLeft: '2px' }}>*</span>}
    </label>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
      {children}
    </div>
  )
}

function SectionHead({ title, first }: { title: string; first?: boolean }) {
  return (
    <div style={{ paddingTop: first ? '4px' : '20px', paddingBottom: '12px' }}>
      <p className={T.labelColor} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {title}
      </p>
      <div className={T.separator} style={{ height: '1px' }} />
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (deal: Deal) => void
}

const EMPTY = {
  contact_name: '',
  company_name: '',
  contact_email: '',
  contact_phone: '',
  contact_title: '',
  company_sector: '',
  company_size: '',
  lead_source: '',
  stage_id: 'leads',
  notes: '',
}

export function NewLeadModal({ open, onClose, onCreated }: Props) {
  const createDeal = useDealStore((s) => s.createDeal)
  const addToast   = useToastStore((s) => s.addToast)
  const profile    = useAuthStore((s) => s.profile)

  const [fields, setFields]       = useState(EMPTY)
  const [nameError, setNameError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // reset quando abre
  useEffect(() => {
    if (open) { setFields(EMPTY); setNameError('') }
  }, [open])

  function set(key: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }))
      if (key === 'contact_name' && nameError) setNameError('')
    }
  }

  async function handleSubmit(e: React.FormEvent | React.MouseEvent) {
    e.preventDefault()
    if (submitting) return

    const name = fields.contact_name.trim()
    if (!name) {
      setNameError('Nome completo obrigatório')
      return
    }

    setSubmitting(true)
    try {
      const deal = await createDeal({
        contact_name:  name,
        company_name:  fields.company_name.trim() || undefined,
        contact_email: fields.contact_email.trim() || undefined,
        contact_phone: fields.contact_phone.trim() || undefined,
        contact_title: fields.contact_title.trim() || undefined,
        company_sector: fields.company_sector.trim() || undefined,
        company_size:  (fields.company_size as '1-50' | '51-200' | '201-1000' | '1000+') || undefined,
        lead_source:   (fields.lead_source as 'Indicação' | 'Inbound' | 'Outbound' | 'Evento') || undefined,
        stage_id:      fields.stage_id as Deal['stage_id'],
        notes:         fields.notes.trim() || undefined,
        value:         0,
        owner_id:      profile?.id ?? '',
      })
      onCreated(deal)
      onClose()
      addToast(`Lead "${name}" criado com sucesso!`, 'success')
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Erro desconhecido'
      addToast(`Erro ao criar lead: ${msg}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70" />
        <Dialog.Content
          className={cn(
            'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'max-w-[calc(100vw-32px)] max-h-[90vh]',
            'bg-[#ffffff] dark:bg-[#161614]',
            T.border, 'flex flex-col',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-150',
          )}
          style={{ width: '580px', borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between shrink-0" style={{ padding: '24px 28px 18px' }}>
            <div>
              <Dialog.Title className="text-[#1a1814] dark:text-[#e8e4dc]"
                style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>
                Novo Lead
              </Dialog.Title>
              <Dialog.Description className="text-[#8a857d] dark:text-[#6b6560]"
                style={{ fontSize: '12px', marginTop: '3px' }}>
                Só o nome é obrigatório — complete o resto depois
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Fechar"
                className="flex items-center justify-center rounded-[6px] transition-colors duration-150 text-[#8a857d] dark:text-[#6b6560] hover:text-[#1a1814] dark:hover:text-[#e8e4dc] hover:bg-[#f5f4f0] dark:hover:bg-[#1a1a18]"
                style={{ width: '28px', height: '28px', flexShrink: 0, marginTop: '-2px', marginRight: '-4px' }}>
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            </Dialog.Close>
          </div>

          <div className={cn(T.separator, 'shrink-0')} style={{ height: '1px' }} />

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto" style={{ padding: '0 28px 4px' }}>

            <SectionHead title="Contato" first />

            <Row>
              <div>
                <FLabel htmlFor="nl_contact_name" required>Nome completo</FLabel>
                <input
                  id="nl_contact_name"
                  type="text"
                  placeholder="João Silva"
                  value={fields.contact_name}
                  onChange={set('contact_name')}
                  autoFocus
                  className={cn(inputCls, nameError ? 'border-[#b83535] focus:border-[#b83535] focus:ring-[#b83535]/15' : '')}
                  style={inputStyle}
                />
                {nameError && <p style={{ fontSize: '11px', color: '#b83535', marginTop: '4px' }}>{nameError}</p>}
              </div>
              <div>
                <FLabel htmlFor="nl_company_name">Empresa</FLabel>
                <input id="nl_company_name" type="text" placeholder="Acme Corp (opcional)"
                  value={fields.company_name} onChange={set('company_name')}
                  className={inputCls} style={inputStyle} />
              </div>
            </Row>

            <Row>
              <div>
                <FLabel htmlFor="nl_contact_email">Email</FLabel>
                <input id="nl_contact_email" type="text" placeholder="joao@empresa.com"
                  value={fields.contact_email} onChange={set('contact_email')}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <FLabel htmlFor="nl_contact_phone">Telefone</FLabel>
                <input id="nl_contact_phone" type="text" placeholder="+55 11 99999-9999"
                  value={fields.contact_phone} onChange={set('contact_phone')}
                  className={inputCls} style={inputStyle} />
              </div>
            </Row>

            <Row>
              <div>
                <FLabel htmlFor="nl_contact_title">Cargo</FLabel>
                <input id="nl_contact_title" type="text" placeholder="CTO"
                  value={fields.contact_title} onChange={set('contact_title')}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <FLabel htmlFor="nl_company_sector">Setor</FLabel>
                <input id="nl_company_sector" type="text" placeholder="Fintech, SaaS…"
                  value={fields.company_sector} onChange={set('company_sector')}
                  className={inputCls} style={inputStyle} />
              </div>
            </Row>

            <SectionHead title="Negócio" />

            <Row>
              <div>
                <FLabel htmlFor="nl_lead_source">Origem</FLabel>
                <div className="relative">
                  <select id="nl_lead_source" value={fields.lead_source} onChange={set('lead_source')}
                    className={cn(inputCls, 'appearance-none cursor-pointer')}
                    style={{ ...inputStyle, paddingRight: '32px' }}>
                    <option value="">Selecione</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Inbound">Inbound</option>
                    <option value="Outbound">Outbound</option>
                    <option value="Evento">Evento</option>
                  </select>
                </div>
              </div>
              <div>
                <FLabel htmlFor="nl_company_size">Tamanho da empresa</FLabel>
                <div className="relative">
                  <select id="nl_company_size" value={fields.company_size} onChange={set('company_size')}
                    className={cn(inputCls, 'appearance-none cursor-pointer')}
                    style={{ ...inputStyle, paddingRight: '32px' }}>
                    <option value="">Selecione</option>
                    <option value="1-50">1–50</option>
                    <option value="51-200">51–200</option>
                    <option value="201-1000">201–1.000</option>
                    <option value="1000+">1.000+</option>
                  </select>
                </div>
              </div>
            </Row>

            <div style={{ marginBottom: '12px' }}>
              <FLabel htmlFor="nl_stage_id">Etapa inicial</FLabel>
              <div className="relative">
                <select id="nl_stage_id" value={fields.stage_id} onChange={set('stage_id')}
                  className={cn(inputCls, 'appearance-none cursor-pointer')}
                  style={{ ...inputStyle, paddingRight: '32px' }}>
                  {STAGES.filter((s) => !s.is_closed).map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <FLabel htmlFor="nl_notes">Observação inicial</FLabel>
              <textarea id="nl_notes" rows={3}
                placeholder="Contexto do lead, quem indicou, próximos passos…"
                value={fields.notes} onChange={set('notes')}
                className={cn(inputCls, 'resize-none')}
                style={{ borderRadius: '8px', fontSize: '13px', fontWeight: 500, padding: '10px 12px', lineHeight: 1.6, height: 'auto' }} />
            </div>
          </form>

          <div className={cn(T.separator, 'shrink-0')} style={{ height: '1px' }} />

          {/* Footer */}
          <div className="flex items-center justify-end shrink-0" style={{ padding: '14px 28px 20px', gap: '8px' }}>
            <button type="button" onClick={onClose}
              className={cn('transition-colors duration-150', T.border, 'text-[#8a857d] dark:text-[#6b6560]', 'hover:bg-[#f5f4f0] dark:hover:bg-[#1a1a18]')}
              style={{ height: '38px', borderRadius: '8px', padding: '0 20px', fontSize: '13px', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 transition-opacity duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ height: '38px', borderRadius: '8px', padding: '0 24px', fontSize: '13px', fontWeight: 700, backgroundColor: 'var(--ink-base)', color: 'var(--surface-base)', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting && <Loader2 style={{ width: '13px', height: '13px' }} className="animate-spin" />}
              {submitting ? 'Criando...' : 'Criar Lead'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
