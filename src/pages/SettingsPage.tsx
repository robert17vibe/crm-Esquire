import { useState } from 'react'
import { Moon, Sun, Target, Bell, BellOff, LayoutGrid, Eye, RefreshCw, DollarSign, Check } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useSettingsStore } from '@/store/useSettingsStore'

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
  children: React.ReactNode
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
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const isDark        = useThemeStore((s) => s.isDark)
  const toggleTheme   = useThemeStore((s) => s.toggle)
  const settings      = useSettingsStore()
  const setSetting    = useSettingsStore((s) => s.setSetting)
  const resetSettings = useSettingsStore((s) => s.reset)

  const [goalInput, setGoalInput]       = useState(String(settings.quarterlyGoal))
  const [goalSaved, setGoalSaved]       = useState(false)
  const [showReset, setShowReset]       = useState(false)

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
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>Preferências do CRM</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '600px' }}>

        {/* Aparência */}
        <Section title="Aparência" isDark={isDark}>
          <Row icon={isDark ? Moon : Sun} label="Tema" description={isDark ? 'Modo escuro ativo' : 'Modo claro ativo'} isDark={isDark}>
            <Toggle checked={isDark} onChange={toggleTheme} isDark={isDark} />
          </Row>
          <Row icon={LayoutGrid} label="Modo compacto" description="Reduz espaçamento dos cards" isDark={isDark} last>
            <Toggle checked={settings.compactMode} onChange={(v) => setSetting('compactMode', v)} isDark={isDark} />
          </Row>
        </Section>

        {/* Metas */}
        <Section title="Metas e Pipeline" isDark={isDark}>
          <Row icon={Target} label="Meta trimestral" description={`Atual: ${fmt(settings.quarterlyGoal)}`} isDark={isDark}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                placeholder="15000000"
                style={{
                  width: '120px', height: '32px', borderRadius: '6px',
                  border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
                  backgroundColor: isDark ? '#111110' : '#f5f4f0',
                  color: text, fontSize: '12px', fontWeight: 500,
                  padding: '0 10px', outline: 'none', fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={saveGoal}
                style={{
                  height: '32px', padding: '0 12px', borderRadius: '6px',
                  backgroundColor: goalSaved ? '#2d9e6b' : '#2c5545',
                  color: '#ffffff', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600, flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: '4px',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {goalSaved ? <Check style={{ width: '12px', height: '12px' }} /> : 'Salvar'}
              </button>
            </div>
          </Row>
          <Row icon={Eye} label="Exibir deals fechados" description="Mostrar Ganho e Perdido no pipeline" isDark={isDark}>
            <Toggle checked={settings.showClosedDeals} onChange={(v) => setSetting('showClosedDeals', v)} isDark={isDark} />
          </Row>
          <Row icon={DollarSign} label="Moeda padrão" description="Utilizada em novos deals" isDark={isDark} last>
            <select
              value={settings.defaultCurrency}
              onChange={(e) => setSetting('defaultCurrency', e.target.value as 'BRL' | 'USD' | 'EUR')}
              style={{
                height: '32px', padding: '0 10px', borderRadius: '6px',
                border: `1px solid ${isDark ? '#2a2a28' : '#d4d0ca'}`,
                backgroundColor: isDark ? '#111110' : '#f5f4f0',
                color: text, fontSize: '12px', fontWeight: 500, cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="BRL">BRL — Real</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </Row>
        </Section>

        {/* Notificações */}
        <Section title="Notificações" isDark={isDark}>
          <Row
            icon={settings.notifications ? Bell : BellOff}
            label="Notificações"
            description="Alertas de atividades e vencimentos"
            isDark={isDark}
            last
          >
            <Toggle checked={settings.notifications} onChange={(v) => setSetting('notifications', v)} isDark={isDark} />
          </Row>
        </Section>

        {/* Zona de perigo */}
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
