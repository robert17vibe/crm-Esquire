import { Bell, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'

export function Header() {
  const { isDark, toggle } = useThemeStore()

  return (
    <header className="flex h-13 items-center justify-between border-b border-line/60 bg-surface-base px-5 shrink-0">
      {/* Left: page breadcrumb slot (future) */}
      <div />

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Dark/light toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
          className="w-8 h-8 flex items-center justify-center rounded-[10px] text-ink-muted hover:bg-surface-col hover:text-ink-base transition-colors"
        >
          {isDark
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notificações"
          className="w-8 h-8 flex items-center justify-center rounded-[10px] text-ink-muted hover:bg-surface-col hover:text-ink-base transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-[10px] font-bold text-white ml-1">
          RF
        </div>
      </div>
    </header>
  )
}
