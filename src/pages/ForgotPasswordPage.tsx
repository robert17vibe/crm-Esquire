import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { supabase } from '@/lib/supabase'

export function ForgotPasswordPage() {
  const isDark = useThemeStore((s) => s.isDark)

  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState<string | null>(null)

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
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: bg, padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        backgroundColor: cardBg, border: `1px solid ${border}`,
        borderRadius: '16px', padding: '40px',
        boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(0,0,0,0.08)',
      }}>

        {/* Logo */}
        <div style={{ marginBottom: '36px', textAlign: 'center' }}>
          <p style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Esquire CRM
          </p>
          <p style={{ fontSize: '12px', color: muted, marginTop: '5px' }}>
            Recuperação de senha
          </p>
        </div>

        {sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <CheckCircle style={{ width: '40px', height: '40px', color: '#2d9e6b' }} />
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: text, marginBottom: '6px' }}>
                Verifique seu email
              </p>
              <p style={{ fontSize: '13px', color: muted, lineHeight: 1.6 }}>
                Enviamos um link de recuperação para <strong style={{ color: text }}>{email}</strong>.
                Verifique sua caixa de entrada.
              </p>
            </div>
            <Link
              to="/login"
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '13px', fontWeight: 600, color: muted, textDecoration: 'none',
                marginTop: '8px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
            >
              <ArrowLeft style={{ width: '13px', height: '13px' }} />
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <p style={{ fontSize: '13px', color: muted, lineHeight: 1.6, marginBottom: '2px' }}>
              Informe seu email e enviaremos um link para redefinir a senha.
            </p>

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
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '12px', color: muted, textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
              >
                <ArrowLeft style={{ width: '12px', height: '12px' }} />
                Voltar ao login
              </Link>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
