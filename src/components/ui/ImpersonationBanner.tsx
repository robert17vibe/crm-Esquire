import { Eye, X } from 'lucide-react'
import { useImpersonationStore } from '@/store/useImpersonationStore'

export function ImpersonationBanner() {
  const impersonatedId   = useImpersonationStore((s) => s.impersonatedId)
  const impersonatedName = useImpersonationStore((s) => s.impersonatedName)
  const stop             = useImpersonationStore((s) => s.stopImpersonation)

  if (!impersonatedId) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#b45309', gap: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <Eye style={{ width: '14px', height: '14px', color: '#fff' }} />
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
        A ver como: <span style={{ fontStyle: 'italic' }}>{impersonatedName}</span>
      </span>
      <button
        type="button"
        onClick={stop}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          height: '22px', padding: '0 10px', borderRadius: '4px',
          backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
          fontSize: '11px', fontWeight: 700, color: '#fff', cursor: 'pointer',
        }}
      >
        <X style={{ width: '10px', height: '10px' }} />
        Sair
      </button>
    </div>
  )
}
