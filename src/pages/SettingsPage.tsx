import { useState } from 'react'
import {
  Moon, Sun, Target, Bell, BellOff, LayoutGrid, Eye, RefreshCw,
  DollarSign, Check, User, Palette, Mail, Shield, Keyboard,
  Zap, GitBranch, Clock, AlertCircle, Users, Info,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'

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
            <Toggle checked={true} onChange={() => {}} isDark={isDark} />
          </Row>
          <Row icon={Clock} label="Lembrete de follow-up" description="Leads sem atividade há mais de 7 dias" isDark={isDark} last>
            <Toggle checked={false} onChange={() => {}} isDark={isDark} />
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
        <Section title="Integrações" isDark={isDark}>
          <Row icon={Zap} label="Supabase" description="Banco de dados e autenticação" isDark={isDark}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#2d9e6b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2d9e6b', display: 'inline-block' }} />
              Conectado
            </span>
          </Row>
          <Row icon={Info} label="Plaud AI" description="Transcrição de reuniões (em breve)" isDark={isDark} last>
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: muted, backgroundColor: isDark ? '#1e1e1c' : '#f0eeea',
              border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
              borderRadius: '4px', padding: '2px 8px',
            }}>Em breve</span>
          </Row>
        </Section>

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
