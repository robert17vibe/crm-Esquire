---
description: Cria uma nova página seguindo o stack do projecto actual
allowed-tools: Read, Write, Edit, Glob
---

Cria uma nova página com o nome/descrição: $ARGUMENTS

## Detecta o projecto actual

Primeiro lê o `package.json` do projecto actual para determinar o stack:
- `next` nas dependências → **Stack Aurea** (Next.js + Tailwind + shadcn)
- `vite` nas dependências → **Stack Esquire** (Vite + React + inline styles)

---

## Stack Aurea (Next.js) — novo projecto

**Ficheiro:** `app/(app)/nome-da-pagina/page.tsx`

```tsx
// Server Component por defeito
import { PageHeader } from '@/components/crm/page-header'

export default function NomeDaPaginaPage() {
  return (
    <div className="px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title="Título"
        subtitle="Descrição breve"
        actions={/* botões */}
      />
      {/* conteúdo */}
    </div>
  )
}
```

**Regras obrigatórias:**
- Tailwind apenas — ZERO inline styles, ZERO hex
- Tokens de espaço: p-5, gap-4, space-y-8 (escala base-4)
- Ícones: @untitled-ui/icons-react primário, lucide fallback — nunca misturar
- 4 estados: loading (skeleton), empty, error, success
- `'use client'` só se precisar de estado/evento
- ≤ 200 linhas por ficheiro de página
- Componentes extraídos para `components/crm/`
- Cores via tokens: text-primary, text-secondary, border, accent

**Adicionar à navegação:** `components/layout/sidebar.tsx`

---

## Stack Esquire (Vite + React) — CRM actual

**Ficheiro:** `src/pages/NomeDaPagina.tsx`

```tsx
import { useThemeStore } from '@/store/useThemeStore'
import { PageHeader }    from '@/components/crm/PageHeader'

export function NomeDaPagina() {
  const isDark  = useThemeStore((s) => s.isDark)
  const border  = isDark ? '#242422' : '#e4e0da'
  const text    = isDark ? '#e8e4dc' : '#1a1814'
  const muted   = isDark ? '#6b6560' : '#8a857d'
  const cardBg  = isDark ? '#111110' : '#ffffff'
  const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'
  const inputBg = isDark ? '#161614' : '#f8f7f4'

  return (
    <div style={{ height: '100%', backgroundColor: pageBg, display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="..." subtitle="..." />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* conteúdo */}
      </div>
    </div>
  )
}
```

**Depois de criar:**
1. Lazy import em `src/App.tsx`
2. Rota em `src/App.tsx`
3. Item na sidebar `src/components/layout/Sidebar.tsx` se necessário
