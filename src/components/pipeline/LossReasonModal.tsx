import { useState } from 'react'
import { X } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'

const LOSS_REASONS = [
  'Sem orçamento',
  'Escolheu concorrente',
  'Sem resposta / ghosting',
  'Timing inadequado',
  'Escopo não atendido',
  'Decisor não aprovou',
  'Outro',
]

interface LossReasonModalProps {
  dealTitle: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function LossReasonModal({ dealTitle, onConfirm, onCancel }: LossReasonModalProps) {
  const isDark = useThemeStore((s) => s.isDark)
  const [selected, setSelected] = useState<string | null>(null)
  const [other, setOther] = useState('')

  const modalBg   = isDark ? '#161614' : '#ffffff'
  const border    = isDark ? '#242422' : '#e4e0da'
  const text      = isDark ? '#e8e4dc' : '#1a1814'
  const muted     = isDark ? '#6b6560' : '#8a857d'
  const hoverBg   = isDark ? '#1e1e1c' : '#f5f4f0'
  const rowBg     = isDark ? '#111110' : '#faf9f6'
  const inputBg   = isDark ? '#111110' : '#f8f7f4'

  const effectiveReason = selected === 'Outro' ? other.trim() : selected

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        style={{
          width: '400px', borderRadius: '12px', padding: '24px',
          backgroundColor: modalBg, border: `1px solid ${border}`,
          boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.6)' : '0 12px 48px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: text, lineHeight: 1.3 }}>
              Motivo da perda
            </p>
            <p style={{ fontSize: '12px', color: muted, marginTop: '3px' }}>
              Selecione o motivo principal
            </p>
            {dealTitle && (
              <p style={{ fontSize: '11px', color: muted, marginTop: '2px', fontStyle: 'italic' }}>
                {dealTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px', flexShrink: 0 }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        {/* Reason list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {LOSS_REASONS.map((reason) => {
            const isActive = selected === reason
            return (
              <button
                key={reason}
                type="button"
                onClick={() => setSelected(reason)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '6px',
                  textAlign: 'left', width: '100%',
                  border: `1px solid ${isActive ? '#6b3a3a' : border}`,
                  backgroundColor: isActive ? (isDark ? '#2d1515' : '#fff5f5') : rowBg,
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: text,
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = hoverBg }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = rowBg }}
              >
                <span style={{
                  width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isActive ? '#6b3a3a' : muted}`,
                  backgroundColor: isActive ? '#6b3a3a' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isActive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                </span>
                {reason}
              </button>
            )
          })}

          {selected === 'Outro' && (
            <input
              autoFocus
              type="text"
              value={other}
              onChange={(e) => setOther(e.target.value.slice(0, 200))}
              placeholder="Descreva o motivo..."
              style={{
                height: '36px', padding: '0 12px', fontSize: '13px', fontWeight: 500,
                backgroundColor: inputBg, border: `1px solid ${border}`,
                borderRadius: '6px', color: text, outline: 'none', marginTop: '4px',
              }}
            />
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 500,
              borderRadius: '6px', border: `1px solid ${border}`,
              backgroundColor: 'transparent', color: muted, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => effectiveReason && onConfirm(effectiveReason)}
            disabled={!effectiveReason}
            style={{
              height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 600,
              borderRadius: '6px', border: 'none',
              backgroundColor: effectiveReason ? '#6b3a3a' : (isDark ? '#2a2a28' : '#e4e0da'),
              color: effectiveReason ? '#ffffff' : muted,
              cursor: effectiveReason ? 'pointer' : 'not-allowed',
              transition: 'all 0.12s ease',
            }}
          >
            Confirmar perda
          </button>
        </div>
      </div>
    </div>
  )
}
