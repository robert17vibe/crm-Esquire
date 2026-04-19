import { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useToastStore } from '@/store/useToastStore'
import { useThemeStore } from '@/store/useThemeStore'
import type { Toast } from '@/store/useToastStore'

const CONFIG = {
  success: { Icon: CheckCircle2, color: '#2d9e6b' },
  error:   { Icon: AlertCircle,  color: '#dc2626' },
  info:    { Icon: Info,         color: '#2c5545' },
}

function ToastItem({ toast, isDark }: { toast: Toast; isDark: boolean }) {
  const [mounted, setMounted] = useState(false)
  const removeToast = useToastStore((s) => s.removeToast)
  const { Icon, color } = CONFIG[toast.type]

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  function dismiss() {
    setMounted(false)
    setTimeout(() => removeToast(toast.id), 220)
  }

  const bg     = isDark ? '#1a1a18' : '#ffffff'
  const border = isDark ? '#2a2a28' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '8px',
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.12)',
        minWidth: '260px', maxWidth: '380px',
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
        opacity: mounted ? 1 : 0,
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease',
      }}
    >
      <Icon style={{ width: '15px', height: '15px', color, flexShrink: 0 }} />
      <p style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: text, lineHeight: 1.4 }}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={dismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px', flexShrink: 0,
          color: isDark ? '#4a4a48' : '#a09890',
          display: 'flex', alignItems: 'center',
        }}
      >
        <X style={{ width: '12px', height: '12px' }} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const isDark  = useThemeStore((s) => s.isDark)

  return (
    <div
      aria-label="Notificações"
      style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column-reverse', gap: '8px',
        zIndex: 9999, pointerEvents: toasts.length ? 'auto' : 'none',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} isDark={isDark} />
      ))}
    </div>
  )
}
