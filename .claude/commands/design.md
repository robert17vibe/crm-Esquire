---
description: Referência do design system — detecta o projecto e mostra as regras correctas
---

## Design System — detecta o stack actual

---

## Stack Aurea (Next.js + Tailwind) — novos projectos

### Cores (tokens CSS)
```
Superfícies:  canvas, surface, subtle, inset, elevated
Texto:        text-primary, text-secondary, text-tertiary, text-disabled
Bordas:       border, border-strong, border-focus
Accent:       accent (#6366f1 indigo), accent-hover, accent-soft, accent-muted
Success:      #16a34a  |  Warning: #f59e0b  |  Danger: #ef4444
```

### Espaçamento (INVIOLÁVEL — base-4)
```
Escala: 0 2 4 6 8 12 16 20 24 32 40 48 64 80
Página:          px-6 lg:px-8 py-6
Card:            p-5
Entre secções:   space-y-8
Grid:            gap-4
Lista:           space-y-3
Form fields:     space-y-4
Ícone + texto:   gap-2
PROIBIDO: p-[15px] gap-[13px] — sem valores arbitrários
```

### Tipografia (Geist Sans)
```
xs 11px | sm 12px | base 13px | md 14px | lg 16px | xl 18px | 2xl 22px
400 body | 500 UI | 600 labels/buttons | 700 KPIs
Tracking: -0.02em headings grandes | wider all-caps
Mono: Geist Mono — só números, código, IDs
```

### Radius
```
sm 6px | md 8px | lg 10px | xl 14px | 2xl 18px | full 9999px
```

### Componentes base
```tsx
// Botão primário
<Button>Confirmar</Button>

// Card
<div className="rounded-xl border bg-surface p-5 shadow-sm">

// Input
<Input placeholder="..." className="h-9" />

// Badge
<Badge variant="success">Activo</Badge>
```

### Ícones
- Primário: `@untitled-ui/icons-react` (size 16px/18px, stroke 1.5)
- Fallback: `lucide-react`
- NUNCA misturar as duas bibliotecas no mesmo ecrã

---

## Stack Esquire (Vite + React + inline styles) — CRM actual

### Cores
```ts
const border  = isDark ? '#242422' : '#e4e0da'
const text    = isDark ? '#e8e4dc' : '#1a1814'
const muted   = isDark ? '#6b6560' : '#8a857d'
const cardBg  = isDark ? '#111110' : '#ffffff'
const pageBg  = isDark ? '#0d0c0a' : '#f5f4f0'
const inputBg = isDark ? '#161614' : '#f8f7f4'

// Acção
verde:   #2c5545  (botões, sucesso)
vermelho:#6b1212  (sidebar active, danger)
azul:    #4d7aa8
ciano:   #0e7490
roxo:    #7c5cbf
âmbar:   #a88030
```

### Componentes base
```ts
// Card
{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '12px' }

// Input
{ backgroundColor: inputBg, border: `1px solid ${border}`, borderRadius: '8px', height: '34px', padding: '0 10px', fontSize: '13px' }

// Botão primário
{ backgroundColor: '#2c5545', color: '#fff', borderRadius: '8px', height: '34px', padding: '0 16px', fontSize: '12px', fontWeight: 700, border: 'none' }
```

### Espaçamentos
```
padding página: 20px  |  card: 16-18px  |  gap cards: 16px
header altura: 54px   |  linha tabela: 48px
```
