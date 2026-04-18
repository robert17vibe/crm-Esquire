import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn)
  const isDark = useThemeStore((s) => s.isDark)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [msLoading, setMsLoading] = useState(false)

  const bg      = isDark ? '#0d0c0a' : '#f5f4f0'
  const cardBg  = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#242422' : '#e0dbd4'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f5f4f0'
  const btnBg   = isDark ? '#e8e4dc' : '#1a1814'
  const btnText = isDark ? '#0d0c0a' : '#f5f4f0'

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
    if (err) setError('Login com Microsoft não está configurado ainda.')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: bg,
      padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        backgroundColor: cardBg,
        border: `1px solid ${border}`,
        borderRadius: '16px',
        padding: '40px',
        boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(0,0,0,0.08)',
      }}>

        {/* Logo */}
        <div style={{ marginBottom: '36px', textAlign: 'center' }}>
          <p style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Esquire CRM
          </p>
          <p style={{ fontSize: '12px', color: muted, marginTop: '5px' }}>
            Aurea Tech · Enterprise Sales
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@aureatech.io"
              required
              autoComplete="email"
              style={{
                width: '100%', height: '40px', boxSizing: 'border-box',
                backgroundColor: inputBg, border: `1px solid ${border}`,
                borderRadius: '8px', padding: '0 12px',
                fontSize: '13px', fontWeight: 500, color: text,
                outline: 'none', transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = isDark ? '#4a9080' : '#2c5545')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = border)}
            />
          </div>

          {/* Senha + toggle */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%', height: '40px', boxSizing: 'border-box',
                  backgroundColor: inputBg, border: `1px solid ${border}`,
                  borderRadius: '8px', padding: '0 40px 0 12px',
                  fontSize: '13px', fontWeight: 500, color: text,
                  outline: 'none', transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = isDark ? '#4a9080' : '#2c5545')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = border)}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                  color: muted, display: 'flex', alignItems: 'center',
                }}
              >
                {showPass
                  ? <EyeOff style={{ width: '14px', height: '14px' }} />
                  : <Eye    style={{ width: '14px', height: '14px' }} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <p style={{
              fontSize: '12px', color: '#8b1a1a',
              backgroundColor: isDark ? '#2d1515' : '#fff5f5',
              border: `1px solid ${isDark ? '#4a1f1f' : '#fecaca'}`,
              borderRadius: '6px', padding: '8px 12px', lineHeight: 1.5,
            }}>
              {error}
            </p>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: '40px', borderRadius: '8px', marginTop: '2px',
              backgroundColor: loading ? (isDark ? '#2a2a28' : '#e0dbd4') : btnBg,
              color: loading ? muted : btnText,
              fontSize: '13px', fontWeight: 700,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            {loading && <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {/* Esqueci a senha */}
          <div style={{ textAlign: 'center', marginTop: '2px' }}>
            <Link
              to="/forgot-password"
              style={{ fontSize: '12px', color: muted, textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
            >
              Esqueci a senha
            </Link>
          </div>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: border }} />
            <span style={{ fontSize: '11px', color: muted, fontWeight: 500 }}>ou</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: border }} />
          </div>

          {/* Microsoft */}
          <button
            type="button"
            onClick={handleMicrosoft}
            disabled={msLoading}
            style={{
              width: '100%', height: '40px', borderRadius: '8px',
              backgroundColor: 'transparent',
              border: `1px solid ${border}`,
              color: text,
              fontSize: '13px', fontWeight: 600,
              cursor: msLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: msLoading ? 0.6 : 1,
              transition: 'border-color 0.15s ease, opacity 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!msLoading) e.currentTarget.style.borderColor = isDark ? '#4a9080' : '#2c5545' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = border }}
          >
            {msLoading ? (
              <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />
            ) : (
              <MicrosoftIcon />
            )}
            {msLoading ? 'Conectando...' : 'Entrar com Microsoft'}
          </button>

        </form>
      </div>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.'
  if (msg.includes('Email not confirmed'))        return 'Confirme seu email antes de entrar.'
  if (msg.includes('Too many requests'))          return 'Muitas tentativas. Aguarde alguns minutos.'
  if (msg.includes('User not found'))             return 'Usuário não encontrado.'
  return msg
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="0"  y="0"  width="7.5" height="7.5" fill="#F25022" />
      <rect x="8.5" y="0"  width="7.5" height="7.5" fill="#7FBA00" />
      <rect x="0"  y="8.5" width="7.5" height="7.5" fill="#00A4EF" />
      <rect x="8.5" y="8.5" width="7.5" height="7.5" fill="#FFB900" />
    </svg>
  )
}
