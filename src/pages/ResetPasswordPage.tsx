import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { supabase } from '@/lib/supabase'

export function ResetPasswordPage() {
  const isDark    = useThemeStore((s) => s.isDark)
  const navigate  = useNavigate()

  const [ready,    setReady]    = useState(false)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const bg      = isDark ? '#0d0c0a' : '#f5f4f0'
  const cardBg  = isDark ? '#161614' : '#ffffff'
  const border  = isDark ? '#242422' : '#e0dbd4'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const inputBg = isDark ? '#111110' : '#f5f4f0'
  const btnBg   = isDark ? '#e8e4dc' : '#1a1814'
  const btnText = isDark ? '#0d0c0a' : '#f5f4f0'

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6)  { setError('A senha deve ter ao menos 6 caracteres.'); return }
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => navigate('/login'), 3000)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', backgroundColor: bg, padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', backgroundColor: cardBg,
        border: `1px solid ${border}`, borderRadius: '16px', padding: '40px',
        boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(0,0,0,0.08)',
      }}>

        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.02em' }}>
            Esquire CRM
          </p>
          <p style={{ fontSize: '12px', color: muted, marginTop: '5px' }}>
            Redefinir senha
          </p>
        </div>

        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
            <CheckCircle style={{ width: '40px', height: '40px', color: '#2d9e6b' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: text }}>Senha atualizada</p>
            <p style={{ fontSize: '12px', color: muted, lineHeight: 1.6 }}>
              Redirecionando para o login...
            </p>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: muted, lineHeight: 1.6 }}>
              Aguardando validação do link de recuperação...
            </p>
            <p style={{ fontSize: '12px', color: isDark ? '#3a3834' : '#c4bfb8', marginTop: '8px' }}>
              Se este link expirou, solicite um novo em{' '}
              <a href="/forgot-password" style={{ color: '#2c5545', textDecoration: 'none' }}>
                Esqueci minha senha
              </a>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Nova senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  style={{
                    width: '100%', height: '40px', boxSizing: 'border-box',
                    backgroundColor: inputBg, border: `1px solid ${border}`,
                    borderRadius: '8px', padding: '0 40px 0 12px',
                    fontSize: '13px', color: text, outline: 'none',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = isDark ? '#4a9080' : '#2c5545')}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = border)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted }}
                >
                  {showPass ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Confirmar senha
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', height: '40px', boxSizing: 'border-box',
                  backgroundColor: inputBg, border: `1px solid ${border}`,
                  borderRadius: '8px', padding: '0 12px',
                  fontSize: '13px', color: text, outline: 'none',
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
                borderRadius: '6px', padding: '8px 12px',
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
              }}
            >
              {loading && <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>

          </form>
        )}
      </div>
    </div>
  )
}
