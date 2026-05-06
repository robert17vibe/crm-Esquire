---
description: Scaffolda um novo projecto a partir da base aurea-crm-dev
allowed-tools: Bash, Write, Read
---

Cria um novo projecto chamado: $ARGUMENTS

## O que fazer

### 1. Scaffold Next.js
```bash
pnpm create next-app@latest nome-do-projecto \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias="@/*"
cd nome-do-projecto
```

### 2. Instalar dependências da base aurea
```bash
pnpm add @radix-ui/react-avatar @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip \
  @tanstack/react-table @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  @untitled-ui/icons-react lucide-react \
  recharts date-fns geist \
  motion next-themes sonner \
  class-variance-authority clsx tailwind-merge \
  cmdk react-day-picker shadcn

pnpm add -D @tailwindcss/postcss
```

### 3. Inicializar shadcn
```bash
pnpm dlx shadcn@latest init
# style: base-nova | baseColor: neutral | CSS variables: yes
```

### 4. Estrutura de pastas obrigatória
```
app/
  (auth)/
    login/page.tsx
  (app)/
    dashboard/page.tsx
    layout.tsx
  layout.tsx
  globals.css
components/
  ui/          ← shadcn components
  crm/         ← componentes de domínio
  layout/
    sidebar.tsx
    header.tsx
lib/
  utils.ts     ← cn(), formatBRL()
  motion.ts    ← durations + easings
  format.ts
```

### 5. Criar lib/utils.ts
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
```

### 6. Criar lib/motion.ts
```ts
export const durations = {
  instant: 0.075, fast: 0.15, base: 0.2, slow: 0.3, slower: 0.5,
}
export const easings = {
  swift:  [0.4, 0, 0.2, 1],
  smooth: [0.25, 0.1, 0.25, 1],
  bounce: [0.34, 1.56, 0.64, 1],
}
```

### 7. Regras a seguir em todo o código
- Tailwind only — sem inline styles, sem hex directos
- Espaço base-4: 0,2,4,6,8,12,16,20,24,32,40,48,64,80
- ≤ 400 linhas por ficheiro, páginas ≤ 200
- Server Components por defeito
- 4 estados: loading (skeleton), empty, error, success
- Ícones: @untitled-ui primário, lucide fallback
- pnpm sempre

### 8. Se precisar de base de dados
Adicionar Supabase:
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```
Criar `lib/supabase/client.ts` e `lib/supabase/server.ts`

### 9. CLAUDE.md no projecto
Criar `CLAUDE.md` com as regras do projecto adaptadas.
