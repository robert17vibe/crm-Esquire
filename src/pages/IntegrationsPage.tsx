import { useState } from 'react'
import { useWebhookStore, type WebhookEvent } from '@/store/useWebhookStore'

const EVENT_LABELS: Record<WebhookEvent, string> = {
  'deal.created': 'Lead criado',
  'deal.stage_changed': 'Etapa alterada',
  'deal.deleted': 'Lead removido',
}

const accent = '#2c5545'

export function IntegrationsPage() {
  const [tab, setTab] = useState<'webhooks' | 'api'>('webhooks')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Integrações</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Webhooks de saída, formulários públicos e referência da API
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)' }}>
        {(['webhooks', 'api'] as const).map((t) => {
          const labels = { webhooks: 'Webhooks', api: 'API' }
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 14px', fontSize: '13px', fontWeight: tab === t ? 700 : 400,
                color: tab === t ? accent : 'var(--color-text-muted)',
                background: 'none', border: 'none',
                borderBottom: tab === t ? `2px solid ${accent}` : '2px solid transparent',
                cursor: 'pointer', marginBottom: '-1px',
              }}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'webhooks' && <WebhooksTab />}
        {tab === 'api' && <ApiTab />}
      </div>
    </div>
  )
}

/* ─── Webhooks ─────────────────────────────────────────────────────────────── */

function WebhooksTab() {
  const { configs, addWebhook, removeWebhook, toggleWebhook } = useWebhookStore()
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>(['deal.created'])
  const [saving, setSaving] = useState(false)

  const allEvents: WebhookEvent[] = ['deal.created', 'deal.stage_changed', 'deal.deleted']

  function toggleEvent(ev: WebhookEvent) {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    )
  }

  async function handleAdd() {
    if (!url.trim() || !selectedEvents.length) return
    setSaving(true)
    await addWebhook(url.trim(), selectedEvents, secret.trim() || undefined)
    setUrl('')
    setSecret('')
    setSelectedEvents(['deal.created'])
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      {/* Add form */}
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px' }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>
          Adicionar webhook
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>URL de destino</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seu-sistema.com/webhook"
              style={{
                width: '100%', height: '38px', padding: '0 12px', fontSize: '13px',
                border: '1px solid var(--color-border)', borderRadius: '7px',
                background: 'var(--color-bg)', color: 'var(--color-text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Eventos</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {allEvents.map((ev) => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    style={{ accentColor: accent }}
                  />
                  {EVENT_LABELS[ev]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
              Secret (opcional) <span style={{ fontWeight: 400 }}>— enviado no header X-Webhook-Secret</span>
            </label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="meu-secret-seguro"
              style={{
                width: '100%', height: '38px', padding: '0 12px', fontSize: '13px',
                border: '1px solid var(--color-border)', borderRadius: '7px',
                background: 'var(--color-bg)', color: 'var(--color-text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={saving || !url.trim() || !selectedEvents.length}
            style={{
              alignSelf: 'flex-start', padding: '8px 18px', borderRadius: '7px', border: 'none',
              backgroundColor: url.trim() && selectedEvents.length ? accent : 'var(--color-border)',
              color: url.trim() && selectedEvents.length ? '#fff' : 'var(--color-text-muted)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {saving ? 'A guardar...' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* List */}
      {configs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            {configs.length} webhook{configs.length !== 1 ? 's' : ''} configurado{configs.length !== 1 ? 's' : ''}
          </p>
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              style={{
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cfg.url}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                  {cfg.events.map((e) => EVENT_LABELS[e]).join(' · ')}
                  {cfg.secret && ' · secret configurado'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={cfg.active}
                    onChange={(e) => toggleWebhook(cfg.id, e.target.checked)}
                    style={{ accentColor: accent }}
                  />
                  Ativo
                </label>
                <button
                  onClick={() => removeWebhook(cfg.id)}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5',
                    backgroundColor: 'transparent', color: '#dc2626', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {configs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          Nenhum webhook configurado ainda.
        </div>
      )}
    </div>
  )
}

/* ─── API Docs ─────────────────────────────────────────────────────────────── */

function ApiTab() {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://<projeto>.supabase.co'
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '<anon-key>'

  const examples = [
    {
      key: 'list_deals',
      title: 'Listar leads activos',
      method: 'GET',
      endpoint: `${supabaseUrl}/rest/v1/deals?deleted_at=is.null&select=id,title,company_name,stage_id,value,owner_id`,
      curl: `curl "${supabaseUrl}/rest/v1/deals?deleted_at=is.null&select=id,title,company_name,stage_id,value,owner_id" \\
  -H "apikey: ${supabaseKey}" \\
  -H "Authorization: Bearer ${supabaseKey}"`,
    },
    {
      key: 'submit_lead',
      title: 'Submeter lead via formulário',
      method: 'POST',
      endpoint: `${supabaseUrl}/rest/v1/lead_submissions`,
      curl: `curl -X POST "${supabaseUrl}/rest/v1/lead_submissions" \\
  -H "apikey: ${supabaseKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"form_id":"<uuid>","company_name":"Acme Lda","contact_name":"João Silva","contact_email":"joao@acme.pt"}'`,
    },
    {
      key: 'webhook_payload',
      title: 'Payload de webhook (deal.created)',
      method: 'POST',
      endpoint: 'https://seu-servidor.com/webhook',
      curl: `{
  "event": "deal.created",
  "timestamp": "2026-04-23T10:00:00.000Z",
  "data": {
    "id": "uuid",
    "title": "Acme — João Silva",
    "company_name": "Acme Lda",
    "stage_id": "leads",
    "owner_id": "uuid",
    "value": 5000
  }
}`,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '760px' }}>
      <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px' }}>
        <p style={{ fontSize: '13px', color: '#92400e' }}>
          <strong>Autenticação:</strong> Use a chave anon do Supabase nos headers <code>apikey</code> e <code>Authorization: Bearer</code> para leitura pública. Para escrita segura, use a service role key no backend.
        </p>
      </div>

      {examples.map((ex) => (
        <div
          key={ex.key}
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
              backgroundColor: ex.method === 'GET' ? '#d1fae5' : '#dbeafe',
              color: ex.method === 'GET' ? '#065f46' : '#1d4ed8',
            }}>
              {ex.method}
            </span>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{ex.title}</p>
          </div>
          <div style={{ position: 'relative' }}>
            <pre style={{
              margin: 0, padding: '16px', fontSize: '12px', lineHeight: 1.6,
              color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg)',
              overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {ex.curl}
            </pre>
            <button
              onClick={() => copy(ex.curl, ex.key)}
              style={{
                position: 'absolute', top: '10px', right: '10px',
                padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)',
                fontSize: '11px', cursor: 'pointer',
              }}
            >
              {copied === ex.key ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
