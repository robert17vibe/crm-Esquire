import { useThemeStore } from '@/store/useThemeStore'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  danger = true, onConfirm, onCancel,
}: Props) {
  const isDark = useThemeStore((s) => s.isDark)
  const bg     = isDark ? '#161614' : '#ffffff'
  const border = isDark ? '#2a2a28' : '#e4e0da'
  const text   = isDark ? '#e8e4dc' : '#1a1814'
  const muted  = isDark ? '#6b6560' : '#8a857d'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancel}
    >
      <div
        style={{ width: 'min(420px, 92vw)', backgroundColor: bg, borderRadius: '14px', border: `1px solid ${border}`, boxShadow: '0 24px 60px rgba(0,0,0,0.35)', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: danger ? (isDark ? '#2d1515' : '#fef2f2') : (isDark ? '#1a2e24' : '#f0fdf4'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={16} color={danger ? '#b83535' : '#2c5545'} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: text, margin: '0 0 4px' }}>{title}</p>
            <p style={{ fontSize: '13px', color: muted, margin: 0, lineHeight: 1.5 }}>{description}</p>
          </div>
          <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{ height: '34px', padding: '0 16px', borderRadius: '8px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} style={{ height: '34px', padding: '0 16px', borderRadius: '8px', border: 'none', backgroundColor: danger ? '#b83535' : '#2c5545', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
