import { useState } from 'react'
import {
  Moon, Sun, Bell, BellOff, Eye, Check, User, Palette, Mail,
  Zap, AlertCircle, Clock, Lock, LogOut, Key, Copy, RefreshCw,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { IntegrationsPage } from './IntegrationsPage'

function Toggle({ checked, onChange, isDark }: { checked: boolean; onChange: (v: boolean) => void; isDark: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: '40px', height: '22px', borderRadius: '11px', flexShrink: 0,
        backgroundColor: checked ? '#6b1212' : (isDark ? '#2a2a28' : '#d4d0ca'),
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
  '#6b1212', '#1e40af', '#7c3aed', '#b45309', '#be185d',
  '#0f766e', '#b83535', '#0369a1', '#4d7c0f', '#92400e',
]

type SettingsTab = 'perfil' | 'seguranca' | 'notificacoes' | 'preferencias' | 'api' | 'integracoes'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'perfil',       label: 'Perfil' },
  { id: 'seguranca',    label: 'Segurança' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'preferencias', label: 'Preferências' },
  { id: 'api',          label: 'API' },
  { id: 'integracoes',  label: 'Integrações' },
]

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return 'esq_' + Array.from(arr).map((b) => chars[b % chars.length]).join('')
}

const API_KEY_STORAGE = 'esq_api_key_v1'

export function SettingsPage() {
  const isDark        = useThemeStore((s) => s.isDark)
  const toggleTheme   = useThemeStore((s) => s.toggle)
  const settings      = useSettingsStore()
  const setSetting    = useSettingsStore((s) => s.setSetting)
  const profile       = useAuthStore((s) => s.profile)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const signOut       = useAuthStore((s) => s.signOut)

  const [activeTab, setActiveTab]   = useState<SettingsTab>('perfil')

  // Perfil
  const [nameInput, setNameInput]   = useState(profile?.full_name ?? '')
  const [nameSaved, setNameSaved]   = useState(false)
  const [nameError, setNameError]   = useState('')
  const [savingName, setSavingName] = useState(false)

  // Segurança
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMsg, setPwdMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [savingPwd, setSavingPwd]   = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // API
  const [apiKey, setApiKey]         = useState<string>(() => localStorage.getItem(API_KEY_STORAGE) ?? '')
  const [apiCopied, setApiCopied]   = useState(false)
  const [showKey, setShowKey]       = useState(false)

  // Supabase credentials gate
  const [credPassword, setCredPassword] = useState('')
  const [credUnlocked, setCredUnlocked] = useState(false)
  const [credError, setCredError]       = useState(false)
  const [copiedCred, setCopiedCred]     = useState<string | null>(null)
  const [showCred, setShowCred]         = useState<Record<string, boolean>>({})

  const SUPABASE_CREDS = [
    { id: 'url',     label: 'Project URL',      value: 'https://leedfvtdjztseoykcnxs.supabase.co' },
    { id: 'anon',    label: 'Anon Key (public)', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZWRmdnRkanp0c2VveWtjbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTYxNTQsImV4cCI6MjA5MTk3MjE1NH0.B-jMQwoCKDiRZIZi9a064eBGJMBnI1fvHufGCnJA97o' },
    { id: 'service', label: 'Service Role Key',  value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZWRmdnRkanp0c2VveWtjbnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5NjE1NCwiZXhwIjoyMDkxOTcyMTU0fQ.Ztr5qgOsWmCrvKBJBH3uh8tVcGnqWBA1iq414OHwXrE' },
  ]

  function unlockCreds() {
    if (credPassword === '1234') { setCredUnlocked(true); setCredError(false) }
    else { setCredError(true); setTimeout(() => setCredError(false), 2000) }
  }

  function copyCred(id: string, value: string) {
    navigator.clipboard.writeText(value)
    setCopiedCred(id)
    setTimeout(() => setCopiedCred(null), 2000)
  }

  const border = isDark ? '#242422' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'

  const inputStyle: React.CSSProperties = {
    height: '32px', borderRadius: '4px',
    border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
    backgroundColor: isDark ? '#111110' : '#f5f4f0',
    color: text, fontSize: '12px', fontWeight: 500,
    padding: '0 10px', outline: 'none',
  }

  function saveBtn(saved: boolean, onClick: () => void, loading?: boolean): React.ReactNode {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        style={{
          height: '32px', padding: '0 12px', borderRadius: '4px',
          backgroundColor: saved ? '#2d9e6b' : '#6b1212',
          color: '#ffffff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '11px', fontWeight: 700, flexShrink: 0,
          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
          display: 'flex', alignItems: 'center', gap: '4px',
          transition: 'background-color 0.2s ease',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {saved ? <Check style={{ width: '12px', height: '12px' }} /> : (loading ? '...' : 'Salvar')}
      </button>
    )
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

  async function changePassword() {
    if (!newPwd || newPwd !== confirmPwd) {
      setPwdMsg({ type: 'err', text: 'As senhas não coincidem.' })
      return
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: 'err', text: 'A senha deve ter pelo menos 6 caracteres.' })
      return
    }
    setSavingPwd(true)
    setPwdMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setSavingPwd(false)
    if (error) {
      setPwdMsg({ type: 'err', text: error.message })
    } else {
      setPwdMsg({ type: 'ok', text: 'Senha alterada com sucesso.' })
      setNewPwd(''); setConfirmPwd('')
      setTimeout(() => setPwdMsg(null), 3000)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
  }

  function generateKey() {
    const key = generateApiKey()
    setApiKey(key)
    localStorage.setItem(API_KEY_STORAGE, key)
  }

  function copyKey() {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setApiCopied(true)
    setTimeout(() => setApiCopied(false), 2000)
  }

  const displayInitials = (profile?.full_name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const displayColor    = profile?.avatar_color ?? '#6b1212'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Configurações</p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>Preferências do CRM Esquire</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '2px', padding: '12px 20px 0',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              height: '32px', padding: '0 14px',
              borderRadius: '0', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6b1212' : '2px solid transparent',
              marginBottom: activeTab === tab.id ? '-1px' : '0',
              backgroundColor: 'transparent',
              fontSize: '11px', fontWeight: activeTab === tab.id ? 700 : 500,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: activeTab === tab.id ? '#6b1212' : muted,
              cursor: 'pointer',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: activeTab === 'integracoes' ? '900px' : '640px' }}>

        {/* ── Perfil ── */}
        {activeTab === 'perfil' && (
          <>
            <Section title="Perfil" isDark={isDark}>
              <div style={{ padding: '16px', borderBottom: `1px solid ${border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '4px', flexShrink: 0,
                    backgroundColor: displayColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '18px', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    {displayInitials}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: text }}>{profile?.full_name || '—'}</p>
                    <p style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{profile?.email || '—'}</p>
                    <span style={{
                      display: 'inline-block', marginTop: '5px',
                      fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: '#6b1212', backgroundColor: isDark ? '#1a2e22' : 'rgba(227,30,36,0.08)',
                      border: `1px solid ${isDark ? '#6b1212' : 'rgba(227,30,36,0.20)'}`,
                      borderRadius: '4px', padding: '1px 6px',
                    }}>
                      {profile?.is_admin ? 'Admin' : 'Usuário'}
                    </span>
                  </div>
                </div>
              </div>
              <Row icon={User} label="Nome" description="Exibido no sidebar e nos cards" isDark={isDark}>
                <div style={{ display: 'flex', gap: '6px', flexDirection: 'column', alignItems: 'flex-end' as const }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveName()}
                      placeholder="Seu nome"
                      style={{ ...inputStyle, width: '160px' }}
                    />
                    {saveBtn(nameSaved, saveName, savingName)}
                  </div>
                  {nameError && <p style={{ fontSize: '10px', color: '#b83535' }}>{nameError}</p>}
                </div>
              </Row>
              <Row icon={Mail} label="E-mail" description="Vinculado à conta Supabase Auth" isDark={isDark}>
                <span style={{ fontSize: '12px', color: muted, fontFamily: 'monospace' }}>
                  {profile?.email ?? '—'}
                </span>
              </Row>
              <Row icon={Palette} label="Cor do avatar" description="Identifica você nos cards e listas" isDark={isDark} last>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', maxWidth: '180px', justifyContent: 'flex-end' }}>
                  {AVATAR_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => pickColor(c)} title={c} style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      backgroundColor: c, border: 'none', cursor: 'pointer',
                      outline: displayColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px', transition: 'transform 0.1s ease',
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  ))}
                </div>
              </Row>
            </Section>
          </>
        )}

        {/* ── Segurança ── */}
        {activeTab === 'seguranca' && (
          <>
            <Section title="Alterar Senha" isDark={isDark}>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: muted, display: 'block', marginBottom: '5px' }}>Nova senha</label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const, height: '36px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: muted, display: 'block', marginBottom: '5px' }}>Confirmar senha</label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && changePassword()}
                    placeholder="Repetir nova senha"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const, height: '36px' }}
                  />
                </div>
                {pwdMsg && (
                  <p style={{ fontSize: '11px', color: pwdMsg.type === 'ok' ? '#2d9e6b' : '#b83535', fontWeight: 600 }}>
                    {pwdMsg.type === 'ok' ? '✓ ' : '✕ '}{pwdMsg.text}
                  </p>
                )}
                <button
                  type="button"
                  onClick={changePassword}
                  disabled={savingPwd}
                  style={{
                    alignSelf: 'flex-start',
                    height: '34px', padding: '0 16px', borderRadius: '4px',
                    backgroundColor: '#6b1212', color: '#fff',
                    border: 'none', cursor: savingPwd ? 'not-allowed' : 'pointer',
                    fontSize: '11px', fontWeight: 700,
                    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    opacity: savingPwd ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Lock style={{ width: '12px', height: '12px' }} />
                  {savingPwd ? 'A guardar...' : 'Alterar senha'}
                </button>
              </div>
            </Section>

            <Section title="Sessão" isDark={isDark}>
              <Row icon={LogOut} label="Terminar sessão" description="Sair da conta neste dispositivo" isDark={isDark} last>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  style={{
                    height: '32px', padding: '0 14px', borderRadius: '4px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${isDark ? '#3a2a2a' : '#fca5a5'}`,
                    color: '#b83535', cursor: loggingOut ? 'not-allowed' : 'pointer',
                    fontSize: '11px', fontWeight: 700,
                    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    opacity: loggingOut ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!loggingOut) { e.currentTarget.style.backgroundColor = isDark ? '#1a0a0a' : '#fef2f2' } }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <LogOut style={{ width: '12px', height: '12px' }} />
                  {loggingOut ? 'A sair...' : 'Sair'}
                </button>
              </Row>
            </Section>
          </>
        )}

        {/* ── Notificações ── */}
        {activeTab === 'notificacoes' && (
          <Section title="Notificações" isDark={isDark}>
            <Row icon={settings.notifications ? Bell : BellOff} label="Novo lead atribuído" description="Alertas ao criar novos leads no pipeline" isDark={isDark}>
              <Toggle checked={settings.notifications} onChange={(v) => setSetting('notifications', v)} isDark={isDark} />
            </Row>
            <Row icon={AlertCircle} label="Alertas de vencimento" description="Avisa quando atividade estiver atrasada" isDark={isDark}>
              <Toggle checked={settings.overdueAlerts} onChange={(v) => setSetting('overdueAlerts', v)} isDark={isDark} />
            </Row>
            <Row icon={Clock} label="Lembrete de follow-up" description="Leads sem atividade há mais de 7 dias" isDark={isDark} last>
              <Toggle checked={settings.followUpReminders} onChange={(v) => setSetting('followUpReminders', v)} isDark={isDark} />
            </Row>
          </Section>
        )}

        {/* ── Preferências ── */}
        {activeTab === 'preferencias' && (
          <Section title="Aparência" isDark={isDark}>
            <Row icon={isDark ? Moon : Sun} label="Tema" description={isDark ? 'Modo escuro ativo' : 'Modo claro ativo'} isDark={isDark}>
              <Toggle checked={isDark} onChange={toggleTheme} isDark={isDark} />
            </Row>
            <Row icon={Eye} label="Exibir deals fechados" description="Mostra colunas Ganho e Perdido no pipeline" isDark={isDark} last>
              <Toggle checked={settings.showClosedDeals} onChange={(v) => setSetting('showClosedDeals', v)} isDark={isDark} />
            </Row>
          </Section>
        )}

        {/* ── API ── */}
        {activeTab === 'api' && (
          <>
            <Section title="Chave de API" isDark={isDark}>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: muted, marginBottom: '14px', lineHeight: 1.6 }}>
                  Use esta chave para autenticar pedidos à API do CRM Esquire. Guarde-a num local seguro — não será mostrada novamente após fechar esta janela.
                </p>

                {apiKey ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      backgroundColor: isDark ? '#0d0d0b' : '#f5f4f0',
                      border: `1px solid ${border}`,
                      borderRadius: '6px', padding: '10px 12px',
                    }}>
                      <Key style={{ width: '13px', height: '13px', color: muted, flexShrink: 0 }} />
                      <code style={{
                        flex: 1, fontSize: '11px', color: text,
                        fontFamily: 'monospace', wordBreak: 'break-all',
                        letterSpacing: '0.03em',
                      }}>
                        {showKey ? apiKey : apiKey.slice(0, 12) + '•'.repeat(20)}
                      </code>
                      <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '10px', fontWeight: 600, flexShrink: 0 }}
                      >
                        {showKey ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={copyKey}
                        style={{
                          height: '32px', padding: '0 14px', borderRadius: '4px',
                          backgroundColor: apiCopied ? '#2d9e6b' : '#6b1212',
                          color: '#fff', border: 'none', cursor: 'pointer',
                          fontSize: '11px', fontWeight: 700,
                          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                          display: 'flex', alignItems: 'center', gap: '5px',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        {apiCopied
                          ? <><Check style={{ width: '12px', height: '12px' }} /> Copiado</>
                          : <><Copy style={{ width: '12px', height: '12px' }} /> Copiar</>
                        }
                      </button>
                      <button
                        type="button"
                        onClick={generateKey}
                        style={{
                          height: '32px', padding: '0 14px', borderRadius: '4px',
                          backgroundColor: 'transparent',
                          border: `1px solid ${border}`,
                          color: muted, cursor: 'pointer',
                          fontSize: '11px', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '5px',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = text }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = muted }}
                      >
                        <RefreshCw style={{ width: '12px', height: '12px' }} />
                        Regenerar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={generateKey}
                    style={{
                      height: '36px', padding: '0 18px', borderRadius: '4px',
                      backgroundColor: '#6b1212', color: '#fff',
                      border: 'none', cursor: 'pointer',
                      fontSize: '11px', fontWeight: 700,
                      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <Zap style={{ width: '12px', height: '12px' }} />
                    Gerar chave de API
                  </button>
                )}
              </div>
            </Section>

            <Section title="Conexão" isDark={isDark}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: isDark ? '#1e1e1c' : '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
            </Section>

            <Section title="Credenciais Supabase" isDark={isDark}>
              <div style={{ padding: '16px' }}>
                {!credUnlocked ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '12px', color: muted, lineHeight: 1.6 }}>
                      Esta secção contém chaves sensíveis. Introduza a senha para continuar.
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="password"
                        value={credPassword}
                        onChange={(e) => setCredPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && unlockCreds()}
                        placeholder="Senha de acesso"
                        style={{
                          ...inputStyle, width: '180px', height: '36px',
                          borderColor: credError ? '#b83535' : undefined,
                        }}
                      />
                      <button
                        type="button"
                        onClick={unlockCreds}
                        style={{
                          height: '36px', padding: '0 16px', borderRadius: '4px',
                          backgroundColor: '#6b1212', color: '#fff',
                          border: 'none', cursor: 'pointer',
                          fontSize: '11px', fontWeight: 700,
                          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        <Lock style={{ width: '12px', height: '12px' }} />
                        Desbloquear
                      </button>
                    </div>
                    {credError && (
                      <p style={{ fontSize: '11px', color: '#b83535', fontWeight: 600 }}>✕ Senha incorreta</p>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {SUPABASE_CREDS.map((cred) => (
                      <div key={cred.id}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                          {cred.label}
                        </p>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          backgroundColor: isDark ? '#0d0d0b' : '#f5f4f0',
                          border: `1px solid ${border}`,
                          borderRadius: '6px', padding: '9px 12px',
                        }}>
                          <code style={{
                            flex: 1, fontSize: '10.5px', color: text,
                            fontFamily: 'monospace', wordBreak: 'break-all',
                            letterSpacing: '0.02em', minWidth: 0,
                          }}>
                            {showCred[cred.id]
                              ? cred.value
                              : cred.value.slice(0, 18) + '•'.repeat(16)}
                          </code>
                          <button
                            type="button"
                            onClick={() => setShowCred((p) => ({ ...p, [cred.id]: !p[cred.id] }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '10px', fontWeight: 600, flexShrink: 0 }}
                          >
                            {showCred[cred.id] ? 'Ocultar' : 'Mostrar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyCred(cred.id, cred.value)}
                            style={{
                              height: '26px', padding: '0 10px', borderRadius: '4px', flexShrink: 0,
                              backgroundColor: copiedCred === cred.id ? '#2d9e6b' : 'transparent',
                              border: `1px solid ${copiedCred === cred.id ? '#2d9e6b' : border}`,
                              color: copiedCred === cred.id ? '#fff' : muted,
                              cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: '4px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {copiedCred === cred.id
                              ? <><Check style={{ width: '10px', height: '10px' }} /> Copiado</>
                              : <><Copy style={{ width: '10px', height: '10px' }} /> Copiar</>
                            }
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setCredUnlocked(false); setCredPassword('') }}
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '11px', fontWeight: 600, padding: '4px 0', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Lock style={{ width: '11px', height: '11px' }} />
                      Bloquear novamente
                    </button>
                  </div>
                )}
              </div>
            </Section>
          </>
        )}

        {/* ── Integrações ── */}
        {activeTab === 'integracoes' && (
          <IntegrationsPage />
        )}

        {activeTab !== 'integracoes' && (
          <p style={{ fontSize: '10px', color: isDark ? '#2a2a28' : '#c4bfb8', textAlign: 'center', marginTop: '8px' }}>
            Esquire CRM · v1.0 · {new Date().getFullYear()}
          </p>
        )}
      </div>
    </div>
  )
}
