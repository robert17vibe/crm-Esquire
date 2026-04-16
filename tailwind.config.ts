import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        // ── Design tokens (CSS-variable backed) ──────────────────────────────
        surface: {
          base:     'var(--surface-base)',
          card:     'var(--surface-card)',
          col:      'var(--surface-col)',
          'col-over': 'var(--surface-col-over)',
          sidebar:  'var(--surface-sidebar)',
        },
        ink: {
          base:  'var(--ink-base)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          hover:   'var(--brand-hover)',
        },
        // Border color with opacity modifier support: border-line/50 works
        line: 'rgb(var(--line-rgb) / <alpha-value>)',

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
        border: 'rgb(var(--line-rgb))',
        input:  'rgb(var(--line-rgb))',
        ring:   'var(--brand)',
      },
    },
  },
  plugins: [animate],
}

export default config
