import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useDealStore } from '@/store/useDealStore'
import { useToastStore } from '@/store/useToastStore'
import type { StageId } from '@/constants/pipeline'

interface Submission {
  id: string
  form_id: string
  company_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  intake_forms?: { name: string } | null
}

export function SubmissionsPage() {
  const navigate = useNavigate()
  const createDeal = useDealStore((s) => s.createDeal)
  const addToast = useToastStore((s) => s.addToast)

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [converting, setConverting] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('lead_submissions')
      .select('*, intake_forms(name)')
      .order('created_at', { ascending: false })
    setSubmissions((data ?? []) as Submission[])
    setLoading(false)
  }

  async function approve(sub: Submission) {
    setConverting(sub.id)
    try {
      await createDeal({
        company_name: sub.company_name,
        contact_name: sub.contact_name ?? '',
        contact_email: sub.contact_email ?? '',
        contact_phone: sub.contact_phone ?? '',
        contact_title: '',
        contact_linkedin: '',
        company_sector: '',
        company_size: '',
        lead_source: 'formulário',
        stage_id: 'leads' as StageId,
        value: 0,
        probability: 10,
        notes: sub.notes ?? '',
        owner_id: '',
      })
      await supabase.from('lead_submissions').update({ status: 'approved' }).eq('id', sub.id)
      setSubmissions((prev) => prev.map((s) => s.id === sub.id ? { ...s, status: 'approved' } : s))
      addToast(`Lead criado — ${sub.company_name}`, 'success')
    } catch {
      addToast('Erro ao converter — tente novamente', 'error')
    } finally {
      setConverting(null)
    }
  }

  async function reject(id: string) {
    await supabase.from('lead_submissions').update({ status: 'rejected' }).eq('id', id)
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'rejected' } : s))
    addToast('Submissão rejeitada', 'info')
  }

  const visible = submissions.filter((s) => filter === 'all' || s.status === filter)
  const pendingCount = submissions.filter((s) => s.status === 'pending').length

  const accent = '#2c5545'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Submissões de Leads
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Leads recebidos via formulário público aguardando revisão
          </p>
        </div>
        {pendingCount > 0 && (
          <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309' }}>
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
        {(['pending', 'all', 'approved', 'rejected'] as const).map((f) => {
          const labels = { pending: 'Pendentes', all: 'Todos', approved: 'Aprovados', rejected: 'Rejeitados' }
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 14px', fontSize: '13px', fontWeight: filter === f ? 700 : 400,
                color: filter === f ? accent : 'var(--color-text-muted)',
                borderBottom: filter === f ? `2px solid ${accent}` : '2px solid transparent',
                background: 'none', border: 'none', borderBottom: filter === f ? `2px solid ${accent}` : '2px solid transparent',
                cursor: 'pointer', marginBottom: '-1px',
              }}
            >
              {labels[f]}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', padding: '24px 0' }}>A carregar...</p>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: '32px', marginBottom: '8px' }}>📭</p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
              {filter === 'pending' ? 'Nenhuma submissão pendente' : 'Nenhuma submissão encontrada'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visible.map((sub) => (
              <div
                key={sub.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderLeft: sub.status === 'pending' ? `3px solid #f59e0b` : sub.status === 'approved' ? `3px solid ${accent}` : '3px solid #e4e0da',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                {/* Company + contact */}
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '2px' }}>{sub.company_name}</p>
                  {sub.contact_name && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{sub.contact_name}</p>}
                  {sub.intake_forms?.name && (
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      via {sub.intake_forms.name}
                    </p>
                  )}
                </div>

                {/* Contact info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {sub.contact_email && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{sub.contact_email}</p>}
                  {sub.contact_phone && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{sub.contact_phone}</p>}
                  {!sub.contact_email && !sub.contact_phone && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>—</p>}
                </div>

                {/* Notes + date */}
                <div>
                  {sub.notes && (
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {sub.notes}
                    </p>
                  )}
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {new Date(sub.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  {sub.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => approve(sub)}
                        disabled={converting === sub.id}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: 'none',
                          backgroundColor: accent, color: '#fff', fontSize: '12px', fontWeight: 600,
                          cursor: 'pointer', opacity: converting === sub.id ? 0.6 : 1,
                        }}
                      >
                        {converting === sub.id ? '...' : 'Aprovar'}
                      </button>
                      <button
                        onClick={() => reject(sub.id)}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)',
                          backgroundColor: 'transparent', color: 'var(--color-text-muted)', fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Rejeitar
                      </button>
                    </>
                  ) : (
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                      backgroundColor: sub.status === 'approved' ? '#d1fae5' : '#f3f4f6',
                      color: sub.status === 'approved' ? '#065f46' : '#6b7280',
                    }}>
                      {sub.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
