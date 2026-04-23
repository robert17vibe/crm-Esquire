import { useState } from 'react'
import {
  Moon, Sun, Target, Bell, BellOff, LayoutGrid, Eye, RefreshCw,
  DollarSign, Check, User, Palette, Mail, Shield, Keyboard,
  Zap, GitBranch, Clock, AlertCircle, Users, Plus, Trash2,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useWebhookStore, type WebhookEvent } from '@/store/useWebhookStore'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

function Toggle({ checked, onChange, isDark }: { checked: boolean; onChange: (v: boolean) => void; isDark: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: '40px', height: '22px', borderRadius: '11px', flexShrink: 0,
        backgroundColor: checked ? '#2c5545' : (isDark ? '#2a2a28' : '#d4d0ca'),
        border: 'none', cursor: 'pointer', padding: '2px', position: 'relative',
        transition: 'background-color 0.2s ease',
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        backgroundColor: '#ffffff',
        position: 'absolute', top: '2px',
        left: checked ? '20px' : '2px',
        transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
  const border = isDark ? '#242422' : '#e4e0da'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
        {title}
      </p>
      <div style={{ border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden', backgroundColor: isDark ? '#161614' : '#ffffff' }}>
        {children}
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  description,
  children,
  isDark,
  last,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  label: string
  description?: string
  children?: React.ReactNode
  isDark: boolean
  last?: boolean
}) {
  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', gap: '16px',
      borderBottom: last ? 'none' : `1px solid ${border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
          backgroundColor: isDark ? '#1e1e1c' : '#f0eeea',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: '14px', height: '14px', color: isDark ? '#8a857d' : '#6b6560' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: text, lineHeight: 1.3 }}>{label}</p>
          {description && <p style={{ fontSize: '11px', color: muted, marginTop: '2px', lineHeight: 1.4 }}>{description}</p>}
        </div>
      </div>
      {children && <div style={{ flexShrink: 0 }}>{children}</div>}
    </div>
  )
}

const AVATAR_COLORS = [
  '#2c5545', '#1e40af', '#7c3aed', '#b45309', '#be185d',
  '#0f766e', '#dc2626', '#0369a1', '#4d7c0f', '#92400e',
]

export function SettingsPage() {
  const isDark        = useThemeStore((s) => s.isDark)
  const toggleTheme   = useThemeStore((s) => s.toggle)
  const settings      = useSettingsStore()
  const setSetting    = useSettingsStore((s) => s.setSetting)
  const resetSettings = useSettingsStore((s) => s.reset)
  const profile       = useAuthStore((s) => s.profile)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const [goalInput, setGoalInput]   = useState(String(settings.quarterlyGoal))
  const [goalSaved, setGoalSaved]   = useState(false)
  const [showReset, setShowReset]   = useState(false)
  const [nameInput, setNameInput]   = useState(profile?.full_name ?? '')
  const [nameSaved, setNameSaved]   = useState(false)
  const [nameError, setNameError]   = useState('')
  const [savingName, setSavingName] = useState(false)

  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'

  function saveGoal() {
    const n = Number(goalInput.replace(/\D/g, ''))
    if (!isNaN(n) && n > 0) {
      setSetting('quarterlyGoal', n)
      setGoalInput(String(n))
      setGoalSaved(true)
      setTimeout(() => setGoalSaved(false), 2000)
    }
  }

  async function saveName() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setSavingName(true)
    setNameError('')
    const err = await updateProfile({ full_name: trimmed })
    setSavingName(false)
    if (err) { setNameError(err); return }
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function pickColor(color: string) {
    await updateProfile({ avatar_color: color })
  }

  const displayInitials = (profile?.full_name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const displayColor    = profile?.avatar_color ?? '#2c5545'

  const inputStyle: React.CSSProperties = {
    height: '32px', borderRadius: '6px',
    border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
    backgroundColor: isDark ? '#111110' : '#f5f4f0',
    color: text, fontSize: '12px', fontWeight: 500,
    padding: '0 10px', outline: 'none',
  }

  const saveBtn = (saved: boolean, onClick: () => void, loading?: boolean): React.ReactNode => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        height: '32px', padding: '0 12px', borderRadius: '6px',
        backgroundColor: saved ? '#2d9e6b' : '#2c5545',
        color: '#ffffff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '12px', fontWeight: 600, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '4px',
        transition: 'background-color 0.2s ease',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {saved ? <Check style={{ width: '12px', height: '12px' }} /> : (loading ? '...' : 'Salvar')}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Configurações</p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>Preferências do CRM Esquire</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '640px' }}>

        {/* ── Perfil ── */}
        <Section title="Perfil" isDark={isDark}>
          {/* Avatar preview + color picker */}
          <div style={{ padding: '16px', borderBottom: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: displayColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '16px', fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                {displayInitials}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{profile?.full_name || '—'}</p>
                <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{profile?.email || '—'}</p>
                <span style={{
                  display: 'inline-block', marginTop: '4px',
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#2c5545', backgroundColor: isDark ? '#1a2e22' : '#e6f2ee',
                  border: `1px solid ${isDark ? '#2c5545' : '#b8d9ce'}`,
                  borderRadius: '4px', padding: '1px 6px',
                }}>
                  {profile?.role === 'admin' ? 'Admin' : 'Usuário'}
                </span>
              </div>
            </div>
          </div>

          {/* Name */}
          <Row icon={User} label="Nome" description="Exibido no sidebar e nos cards" isDark={isDark}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                placeholder="Seu nome"
                style={{ ...inputStyle, width: '160px' }}
              />
              {saveBtn(nameSaved, saveName, savingName)}
            </div>
            {nameError && <p style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px' }}>{nameError}</p>}
          </Row>

          {/* Email */}
          <Row icon={Mail} label="E-mail" description="Vinculado à conta Supabase Auth" isDark={isDark}>
            <span style={{ fontSize: '12px', color: muted, fontFamily: 'monospace' }}>
              {profile?.email ?? '—'}
            </span>
          </Row>

          {/* Avatar color */}
          <Row icon={Palette} label="Cor do avatar" description="Identifica você nos cards e listas" isDark={isDark} last>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', maxWidth: '180px', justifyContent: 'flex-end' }}>
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pickColor(c)}
                  title={c}
                  style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    backgroundColor: c, border: 'none', cursor: 'pointer',
                    outline: displayColor === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    transition: 'transform 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              ))}
            </div>
          </Row>
        </Section>

        {/* ── Aparência ── */}
        <Section title="Aparência" isDark={isDark}>
          <Row icon={isDark ? Moon : Sun} label="Tema" description={isDark ? 'Modo escuro ativo' : 'Modo claro ativo'} isDark={isDark}>
            <Toggle checked={isDark} onChange={toggleTheme} isDark={isDark} />
          </Row>
          <Row icon={LayoutGrid} label="Modo compacto" description="Reduz espaçamento dos cards no pipeline" isDark={isDark} last>
            <Toggle checked={settings.compactMode} onChange={(v) => setSetting('compactMode', v)} isDark={isDark} />
          </Row>
        </Section>

        {/* ── Pipeline & Metas ── */}
        <Section title="Pipeline e Metas" isDark={isDark}>
          <Row icon={Target} label="Meta trimestral" description={`Atual: ${fmt(settings.quarterlyGoal)}`} isDark={isDark}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                placeholder="15000000"
                style={{ ...inputStyle, width: '120px', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}
              />
              {saveBtn(goalSaved, saveGoal)}
            </div>
          </Row>
          <Row icon={Eye} label="Exibir deals fechados" description="Mostra colunas Ganho e Perdido no pipeline" isDark={isDark}>
            <Toggle checked={settings.showClosedDeals} onChange={(v) => setSetting('showClosedDeals', v)} isDark={isDark} />
          </Row>
          <Row icon={DollarSign} label="Moeda padrão" description="Utilizada em novos deals" isDark={isDark}>
            <select
              value={settings.defaultCurrency}
              onChange={(e) => setSetting('defaultCurrency', e.target.value as 'BRL' | 'USD' | 'EUR')}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="BRL">BRL — Real</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </Row>
          <Row icon={GitBranch} label="Estágios visíveis" description="Controla colunas exibidas no pipeline" isDark={isDark} last>
            <span style={{ fontSize: '11px', color: muted }}>Todos os estágios</span>
          </Row>
        </Section>

        {/* ── Notificações ── */}
        <Section title="Notificações" isDark={isDark}>
          <Row icon={settings.notifications ? Bell : BellOff} label="Notificações" description="Alertas ao criar novos leads" isDark={isDark}>
            <Toggle checked={settings.notifications} onChange={(v) => setSetting('notifications', v)} isDark={isDark} />
          </Row>
          <Row icon={AlertCircle} label="Alertas de vencimento" description="Avisa quando atividade estiver atrasada" isDark={isDark}>
            <Toggle checked={settings.overdueAlerts} onChange={(v) => setSetting('overdueAlerts', v)} isDark={isDark} />
          </Row>
          <Row icon={Clock} label="Lembrete de follow-up" description="Leads sem atividade há mais de 7 dias" isDark={isDark} last>
            <Toggle checked={settings.followUpReminders} onChange={(v) => setSetting('followUpReminders', v)} isDark={isDark} />
          </Row>
        </Section>

        {/* ── Equipe ── */}
        <Section title="Equipe" isDark={isDark}>
          <Row icon={Users} label="Membros" description="Gerenciamento de usuários e permissões" isDark={isDark}>
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: muted, backgroundColor: isDark ? '#1e1e1c' : '#f0eeea',
              border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
              borderRadius: '4px', padding: '2px 8px',
            }}>Em breve</span>
          </Row>
          <Row icon={Shield} label="Permissões" description="Controle de acesso por perfil" isDark={isDark} last>
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: muted, backgroundColor: isDark ? '#1e1e1c' : '#f0eeea',
              border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
              borderRadius: '4px', padding: '2px 8px',
            }}>Em breve</span>
          </Row>
        </Section>

        {/* ── Atalhos ── */}
        <Section title="Atalhos de teclado" isDark={isDark}>
          <div style={{ padding: '4px 0' }}>
            {[
              ['Cmd/Ctrl + K', 'Abrir paleta de comandos'],
              ['N',            'Novo lead (na página Pipeline)'],
              ['Esc',          'Fechar modal / painel'],
              ['↑ / ↓',        'Navegar por resultados'],
              ['Enter',        'Confirmar seleção'],
            ].map(([key, desc], i, arr) => (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                    backgroundColor: isDark ? '#1e1e1c' : '#f0eeea',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Keyboard style={{ width: '14px', height: '14px', color: isDark ? '#8a857d' : '#6b6560' }} />
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>{desc}</p>
                </div>
                <kbd style={{
                  fontSize: '11px', fontWeight: 600, fontFamily: 'monospace',
                  color: muted, backgroundColor: isDark ? '#1e1e1c' : '#f0eeea',
                  border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
                  borderRadius: '5px', padding: '3px 8px',
                  whiteSpace: 'nowrap',
                }}>{key}</kbd>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Integrações ── */}
        <IntegracaoSection isDark={isDark} />

        {/* ── Avançado ── */}
        <Section title="Avançado" isDark={isDark}>
          <Row icon={RefreshCw} label="Restaurar configurações" description="Volta tudo para os valores padrão" isDark={isDark} last>
            {showReset ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => { resetSettings(); setGoalInput(String(15_000_000)); setShowReset(false) }}
                  style={{
                    height: '28px', padding: '0 12px', borderRadius: '5px',
                    backgroundColor: '#dc2626', color: '#fff', border: 'none',
                    cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                  }}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  style={{
                    height: '28px', padding: '0 10px', borderRadius: '5px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
                    color: muted, cursor: 'pointer', fontSize: '11px', fontWeight: 500,
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowReset(true)}
                style={{
                  height: '28px', padding: '0 12px', borderRadius: '5px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
                  color: muted, cursor: 'pointer', fontSize: '11px', fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
              >
                Restaurar
              </button>
            )}
          </Row>
        </Section>

        <p style={{ fontSize: '10px', color: isDark ? '#2a2a28' : '#c4bfb8', textAlign: 'center', marginTop: '8px' }}>
          Esquire CRM · v1.0 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

// ─── Integrações inline ───────────────────────────────────────────────────────

const EVENT_LABELS: Record<WebhookEvent, string> = {
  'deal.created': 'Lead criado',
  'deal.stage_changed': 'Etapa alterada',
  'deal.deleted': 'Lead removido',
}
const ALL_EVENTS: WebhookEvent[] = ['deal.created', 'deal.stage_changed', 'deal.deleted']

function IntegracaoSection({ isDark }: { isDark: boolean }) {
  const { configs, addWebhook, removeWebhook, toggleWebhook } = useWebhookStore()
  const border   = isDark ? '#242422' : '#e4e0da'
  const text     = isDark ? '#e8e4dc' : '#1a1814'
  const muted    = isDark ? '#6b6560' : '#8a857d'
  const inputBg  = isDark ? '#0d0d0b' : '#ffffff'
  const codeBg   = isDark ? '#111110' : '#f5f4f0'

  const [showForm, setShowForm]           = useState(false)
  const [url, setUrl]                     = useState('')
  const [secret, setSecret]               = useState('')
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>(['deal.created'])
  const [saving, setSaving]               = useState(false)
  const [copiedKey, setCopiedKey]         = useState<string | null>(null)
  const [showApi, setShowApi]             = useState(false)

  function toggleEvent(ev: WebhookEvent) {
    setSelectedEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev])
  }

  async function handleAdd() {
    if (!url.trim() || !selectedEvents.length) return
    setSaving(true)
    await addWebhook(url.trim(), selectedEvents, secret.trim() || undefined)
    setUrl(''); setSecret(''); setSelectedEvents(['deal.created']); setShowForm(false)
    setSaving(false)
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const sectionBorder = isDark ? '#242422' : '#e4e0da'

  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
        Integrações
      </p>
      <div style={{ border: `1px solid ${sectionBorder}`, borderRadius: '10px', overflow: 'hidden', backgroundColor: isDark ? '#161614' : '#ffffff' }}>

        {/* Supabase status row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: `1px solid ${sectionBorder}`, gap: '12px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: isDark ? '#1a1a18' : '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap style={{ width: '14px', height: '14px', color: '#2d9e6b' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>Supabase</p>
            <p style={{ fontSize: '11px', color: muted }}>Base de dados e autenticação</p>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#2d9e6b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2d9e6b', display: 'inline-block' }} />
            Conectado
          </span>
        </div>

        {/* Webhooks header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: configs.length > 0 || showForm ? `1px solid ${sectionBorder}` : 'none', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: isDark ? '#1a1a18' : '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GitBranch style={{ width: '14px', height: '14px', color: muted }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: text }}>
                Webhooks de saída
                {configs.length > 0 && (
                  <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', backgroundColor: isDark ? '#1e2e28' : '#d1fae5', color: '#065f46' }}>
                    {configs.length} activo{configs.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
              <p style={{ fontSize: '11px', color: muted }}>Notifica sistemas externos quando deals mudam</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              height: '30px', padding: '0 12px',
              fontSize: '12px', fontWeight: 600,
              background: showForm ? 'transparent' : 'linear-gradient(135deg, #2c5545 0%, #3d7a62 100%)',
              color: showForm ? muted : '#ffffff',
              border: showForm ? `1px solid ${border}` : 'none',
              borderRadius: '7px', cursor: 'pointer',
              boxShadow: showForm ? 'none' : '0 1px 6px rgba(44,85,69,0.3)',
              transition: 'all 0.15s ease', flexShrink: 0,
            }}
          >
            <Plus style={{ width: '12px', height: '12px' }} />
            {showForm ? 'Cancelar' : 'Adicionar'}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ padding: '16px', backgroundColor: isDark ? '#0f0f0d' : '#fafaf8', borderBottom: `1px solid ${sectionBorder}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: muted, display: 'block', marginBottom: '5px' }}>URL de destino</label>
                <input
                  type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '12px', border: `1px solid ${border}`, borderRadius: '6px', background: inputBg, color: text, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: muted, display: 'block', marginBottom: '6px' }}>Eventos</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {ALL_EVENTS.map((ev) => (
                    <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: text }}>
                      <input type="checkbox" checked={selectedEvents.includes(ev)} onChange={() => toggleEvent(ev)} style={{ accentColor: '#2c5545' }} />
                      {EVENT_LABELS[ev]}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: muted, display: 'block', marginBottom: '5px' }}>Secret (opcional)</label>
                <input
                  type="text" value={secret} onChange={(e) => setSecret(e.target.value)}
                  placeholder="Token secreto para verificação"
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '12px', border: `1px solid ${border}`, borderRadius: '6px', background: inputBg, color: text, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button" onClick={handleAdd}
                  disabled={saving || !url.trim() || !selectedEvents.length}
                  style={{
                    height: '32px', padding: '0 16px', borderRadius: '6px', border: 'none',
                    background: url.trim() && selectedEvents.length ? 'linear-gradient(135deg, #2c5545 0%, #3d7a62 100%)' : (isDark ? '#1a1a18' : '#e8e4dc'),
                    color: url.trim() && selectedEvents.length ? '#fff' : muted,
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {saving ? 'A guardar...' : 'Guardar webhook'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Webhook list */}
        {configs.map((cfg, i) => (
          <div
            key={cfg.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderBottom: i < configs.length - 1 || showApi ? `1px solid ${sectionBorder}` : 'none',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.url}</p>
              <p style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>
                {cfg.events.map((e) => EVENT_LABELS[e]).join(' · ')}
                {cfg.secret && ' · secret'}
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '11px', color: muted, flexShrink: 0 }}>
              <input type="checkbox" checked={cfg.active} onChange={(e) => toggleWebhook(cfg.id, e.target.checked)} style={{ accentColor: '#2c5545' }} />
              Ativo
            </label>
            <button
              type="button" onClick={() => removeWebhook(cfg.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: muted, flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#dc2626' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted }}
            >
              <Trash2 style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        ))}

        {/* API reference toggle */}
        <div style={{ padding: '12px 16px', borderTop: configs.length > 0 || showForm ? `1px solid ${sectionBorder}` : 'none' }}>
          <button
            type="button" onClick={() => setShowApi((v) => !v)}
            style={{ fontSize: '12px', fontWeight: 600, color: showApi ? muted : '#3d7a62', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showApi ? '▲ Ocultar referência API' : '▼ Ver referência API & exemplos curl'}
          </button>
        </div>

        {showApi && (
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                key: 'list',
                label: 'Listar leads activos',
                code: `curl "${import.meta.env.VITE_SUPABASE_URL}/rest/v1/deals?deleted_at=is.null" \\\n  -H "apikey: ${import.meta.env.VITE_SUPABASE_ANON_KEY}"`,
              },
              {
                key: 'payload',
                label: 'Payload webhook (deal.created)',
                code: `{\n  "event": "deal.created",\n  "timestamp": "2026-04-23T10:00:00Z",\n  "data": { "id": "uuid", "company_name": "Acme", "stage_id": "leads", "value": 5000 }\n}`,
              },
            ].map((ex) => (
              <div key={ex.key} style={{ borderRadius: '8px', overflow: 'hidden', border: `1px solid ${border}` }}>
                <div style={{ padding: '8px 12px', backgroundColor: isDark ? '#1a1a18' : '#f0ede8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: text }}>{ex.label}</p>
                  <button type="button" onClick={() => copyText(ex.code, ex.key)}
                    style={{ fontSize: '10px', fontWeight: 600, color: copiedKey === ex.key ? '#2d9e6b' : muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {copiedKey === ex.key ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <pre style={{ margin: 0, padding: '10px 12px', fontSize: '11px', lineHeight: 1.6, color: muted, backgroundColor: codeBg, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {ex.code}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
