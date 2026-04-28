import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn)
  const isDark = useThemeStore((s) => s.isDark)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msLoading, setMsLoading] = useState(false)

  const shellBg = isDark ? '#12110f' : '#fbfaf7'
  const cardBg = isDark ? '#161614' : '#ffffff'
  const panelBg = isDark ? '#11110f' : '#f3efe8'
  const border = isDark ? '#242422' : '#e0dbd4'
  const text = isDark ? '#e8e4dc' : '#1a1814'
  const muted = isDark ? '#6b6560' : '#8a857d'
  const faint = isDark ? '#4f4a45' : '#b1aaa1'
  const inputBg = isDark ? '#111110' : '#f7f4ee'
  const shadow = isDark ? '0 24px 80px rgba(0,0,0,0.45)' : '0 24px 60px rgba(24,18,10,0.10)'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await signIn(email, password)
    setLoading(false)
    if (err) setError(translateError(err))
  }

  async function handleMicrosoft() {
    setError(null)
    setMsLoading(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { scopes: 'email profile openid' },
    })
    setMsLoading(false)
    if (err) setError('Login com Microsoft nao esta configurado ainda.')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'radial-gradient(circle at top, rgba(227,30,36,0.12), transparent 28%), #0d0c0a'
          : 'radial-gradient(circle at top, rgba(227,30,36,0.08), transparent 26%), #f5f4f0',
        padding: '24px',
      }}
    >
      <div
        className="login-shell"
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'stretch',
          backgroundColor: shellBg,
          border: `1px solid ${border}`,
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: shadow,
        }}
      >
        <div
          className="login-brand"
          style={{
            flex: '1 1 320px',
            minHeight: '100%',
            padding: '48px 40px',
            backgroundColor: panelBg,
            borderRight: `1px solid ${border}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '28px',
          }}
        >
          <div>
            <div style={{ height: '3px', backgroundColor: '#e31e24', width: '40px', marginBottom: '18px' }} />
            <p
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 700,
                fontSize: '42px',
                color: text,
                lineHeight: 1,
                margin: 0,
              }}
            >
              Esquire
            </p>
            <p
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: muted,
                marginTop: '8px',
                marginBottom: '22px',
              }}
            >
              CRM
            </p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: text, lineHeight: 1.15, margin: 0 }}>
              Operacao comercial com ritmo, contexto e dono claro.
            </p>
            <p style={{ fontSize: '13px', color: muted, lineHeight: 1.7, marginTop: '16px', maxWidth: '420px' }}>
              Entre para acompanhar pipeline, atividades e proximos passos sem perder o fio das conversas.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
            }}
          >
            {[
              { label: 'Pipeline', value: 'Leads e etapas em tempo real' },
              { label: 'Agenda', value: 'Reunioes e follow-ups visiveis' },
              { label: 'Equipe', value: 'Distribuicao com menos atrito' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  backgroundColor: isDark ? '#171613' : 'rgba(255,255,255,0.72)',
                  border: `1px solid ${border}`,
                  borderRadius: '14px',
                  padding: '14px 14px 12px',
                }}
              >
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: faint,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    margin: 0,
                  }}
                >
                  {item.label}
                </p>
                <p style={{ fontSize: '12px', fontWeight: 600, color: text, lineHeight: 1.45, margin: '8px 0 0' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="login-form"
          style={{
            flex: '0 1 400px',
            width: '100%',
            backgroundColor: cardBg,
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e31e24', margin: 0 }}>
              Acesso
            </p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: text, margin: '10px 0 0', lineHeight: 1.15 }}>
              Entrar na operacao
            </p>
            <p style={{ fontSize: '13px', color: muted, margin: '10px 0 0', lineHeight: 1.6 }}>
              Use o seu email corporativo para retomar o trabalho de onde parou.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  height: '44px',
                  boxSizing: 'border-box',
                  backgroundColor: inputBg,
                  border: `1px solid ${border}`,
                  borderRadius: '10px',
                  padding: '0 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: text,
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#e31e24'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(227,30,36,0.08)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = border
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Senha
                </label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '11px', color: muted, textDecoration: 'none', fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                >
                  Esqueci a senha
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a sua senha"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    height: '44px',
                    boxSizing: 'border-box',
                    backgroundColor: inputBg,
                    border: `1px solid ${border}`,
                    borderRadius: '10px',
                    padding: '0 42px 0 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: text,
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e31e24'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(227,30,36,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = border
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: muted,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPass ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
                </button>
              </div>
            </div>

            {error && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#8b1a1a',
                  backgroundColor: isDark ? '#2d1515' : '#fff5f5',
                  border: `1px solid ${isDark ? '#4a1f1f' : '#fecaca'}`,
                  borderRadius: '10px',
                  padding: '10px 12px',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || msLoading}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                marginTop: '2px',
                backgroundColor: loading ? (isDark ? '#2a2a28' : '#e0dbd4') : '#e31e24',
                color: loading ? muted : '#fff',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: loading || msLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading && !msLoading) {
                  e.currentTarget.style.opacity = '0.92'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {loading && <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: border }} />
              <span style={{ fontSize: '11px', color: muted, fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: border }} />
            </div>

            <button
              type="button"
              onClick={handleMicrosoft}
              disabled={msLoading || loading}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'transparent',
                border: `1px solid ${border}`,
                color: text,
                fontSize: '13px',
                fontWeight: 600,
                cursor: msLoading || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: msLoading ? 0.6 : 1,
                transition: 'border-color 0.15s ease, opacity 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!msLoading && !loading) {
                  e.currentTarget.style.borderColor = '#e31e24'
                  e.currentTarget.style.backgroundColor = isDark ? '#1b1a18' : '#faf7f2'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = border
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {msLoading ? (
                <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />
              ) : (
                <MicrosoftIcon />
              )}
              {msLoading ? 'Conectando...' : 'Entrar com Microsoft'}
            </button>

            <p style={{ fontSize: '11px', color: faint, lineHeight: 1.6, margin: '2px 0 0' }}>
              Acesso protegido pelas credenciais da sua organizacao.
            </p>
          </form>
        </div>
      </div>
      <style>{`
        @media (max-width: 860px) {
          .login-shell {
            border-radius: 20px !important;
          }
          .login-brand {
            order: 2;
            padding: 28px 24px !important;
            gap: 20px !important;
            border-right: none !important;
            border-top: 1px solid ${border};
          }
          .login-form {
            order: 1;
            padding: 28px 24px !important;
          }
        }
      `}</style>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.'
  if (msg.includes('Too many requests')) return 'Muitas tentativas. Aguarde alguns minutos.'
  if (msg.includes('User not found')) return 'Usuario nao encontrado.'
  return msg
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="0" y="0" width="7.5" height="7.5" fill="#F25022" />
      <rect x="8.5" y="0" width="7.5" height="7.5" fill="#7FBA00" />
      <rect x="0" y="8.5" width="7.5" height="7.5" fill="#00A4EF" />
      <rect x="8.5" y="8.5" width="7.5" height="7.5" fill="#FFB900" />
    </svg>
  )
}
