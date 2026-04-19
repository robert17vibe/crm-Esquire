import type { Deal } from '@/types/deal.types'

function esc(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportDealsToCSV(deals: Deal[], filename = 'pipeline.csv') {
  const headers = [
    'Empresa', 'Contato', 'Email', 'Telefone', 'Cargo',
    'Setor', 'Tamanho', 'Estágio', 'Valor (BRL)', 'Probabilidade (%)',
    'Origem', 'Responsável', 'Criado em', 'Atualizado em',
  ]

  const rows = deals.map((d) => [
    d.company_name,
    d.contact_name ?? '',
    d.contact_email ?? '',
    d.contact_phone ?? '',
    d.contact_title ?? '',
    d.company_sector ?? '',
    d.company_size ?? '',
    d.stage_id,
    d.value,
    d.probability,
    d.lead_source ?? '',
    d.owner?.name ?? '',
    d.created_at.slice(0, 10),
    d.updated_at.slice(0, 10),
  ])

  const csv = [headers, ...rows].map((row) => row.map(esc).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
