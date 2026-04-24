import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // ── Design tokens (CSS-variable backed) ──────────────────────────────
        surface: {
          base:     'var(--surface-base)',
          card:     'var(--surface-card)',
          raised:   'var(--surface-raised)',
          overlay:  'var(--surface-overlay)',
          input:    'var(--surface-input)',
          col:      'var(--surface-col)',
          'col-over': 'var(--surface-col-over)',
          sidebar:  'var(--surface-sidebar)',
          hover:    'var(--surface-hover)',
        },
        ink: {
          base:  'var(--ink-base)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          light:   'var(--brand-light)',
          hover:   'var(--brand-hover)',
        },
        line: 'var(--line)',

        // ── shadcn/ui compat ──────────────────────────────────────────────────
        background: 'var(--surface-base)',
        foreground: 'var(--ink-base)',
        card: {
          DEFAULT:    'var(--surface-card)',
          foreground: 'var(--ink-base)',
        },
        popover: {
          DEFAULT:    'var(--surface-card)',
          foreground: 'var(--ink-base)',
        },
        primary: {
          DEFAULT:    'var(--brand)',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT:    'var(--surface-col)',
          foreground: 'var(--ink-base)',
        },
        muted: {
          DEFAULT:    'var(--surface-col)',
          foreground: 'var(--ink-muted)',
        },
        accent: {
          DEFAULT:    'var(--surface-col)',
          foreground: 'var(--ink-base)',
        },
        destructive: {
          DEFAULT:    '#ef4444',
          foreground: '#ffffff',
        },
        border: 'var(--line)',
        input:  'var(--line)',
        ring:   'var(--brand)',
      },
    },
  },
  plugins: [animate],
}

export default config
