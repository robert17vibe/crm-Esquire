# Aurea CRM — Análise Técnica de Referência
> Documento gerado automaticamente. Aurea é APENAS referência — não modificar.

---

## 1. Stack Técnica

| Camada | Aurea | Esquire (atual) |
|--------|-------|-----------------|
| Framework | Next.js 16 (App Router) | React 18 + Vite |
| Estado | Zustand (implícito via hooks) | Zustand 5 |
| Styling | Tailwind CSS v4 | Tailwind CSS v3 |
| UI Base | shadcn/ui v4 + Radix UI | shadcn/ui + Radix UI |
| Ícones | @untitled-ui/icons-react (primário) + lucide | lucide-react |
| Animações | Motion (Framer Motion v12) | nenhuma |
| Charts | Recharts 3.8 (14 tipos) | SVG custom (manual) |
| Tabelas | @tanstack/react-table | nenhuma |
| Tipografia | Geist Sans + Geist Mono | Geist Sans + Geist Mono ✓ |
| Toasts | Sonner | nenhuma |
| Drag-drop | @dnd-kit | @dnd-kit ✓ |
| Fontes | geist npm package | import manual |
| Backend | (mock data) | Supabase ✓ |

---

## 2. Sistema de Design Aurea (Tokens Completos)

### 2.1 Paleta de Cores

```css
/* Superfícies */
--canvas:   #f9fafb   /* Fundo de página */
--surface:  #ffffff   /* Cards, modais */
--subtle:   #f2f4f7   /* Hover suave */
--inset:    #eaecf0   /* Inputs deprimidos */

/* Texto */
--text-primary:   #101828
--text-secondary: #475467
--text-tertiary:  #98a2b3
--text-disabled:  #d0d5dd

/* Bordas */
--border:       #eaecf0
--border-strong: #d0d5dd
--border-focus: #6366f1

/* Accent (Indigo — cor da marca Aurea) */
--accent:      #6366f1
--accent-hover: #4f46e5
--accent-soft: #f0f0ff
--accent-muted: rgba(99,102,241,0.15)

/* Semânticas */
--success: #16a34a  / --success-soft: #ecfdf3
--warning: #f59e0b  / --warning-soft: #fffbeb
--danger:  #ef4444  / --danger-soft:  #fef3f2
--info:    #3b82f6  / --info-soft:    #eff6ff

/* Charts */
--color-chart-1: #6366f1  (accent)
--color-chart-2: #22c55e  (success)
--color-chart-3: #f59e0b  (warning)
--color-chart-4: #8b5cf6  (violet)
--color-chart-5: #3b82f6  (info)
```

### 2.2 Tipografia

| Token | Tamanho | Line-height | Uso |
|-------|---------|-------------|-----|
| text-xs | 11px | 16px | badges, labels |
| text-sm | 12px | 18px | tabelas, corpo denso |
| text-base | 13px | 20px | corpo padrão |
| text-md | 14px | 22px | inputs, destaque |
| text-lg | 16px | 24px | subtítulos |
| text-xl | 18px | 26px | títulos de card |
| text-2xl | 22px | 30px | títulos de página |
| text-3xl | 28px | 36px | KPIs, valores grandes |

**Fontes**: Geist Sans (UI) + Geist Mono (números/código)

### 2.3 Espaçamento (Base-4, Inviolável)

`0 · 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48`

Tokens semânticos:
- `--card-padding: 20px` | `--card-gap: 16px`
- `--page-padding-x: 24px` (32px lg)
- `--section-gap: 32px` | `--stack: 12px`

### 2.4 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| --radius-sm | 6px | badges, chips |
| --radius-md | 8px | inputs, botões |
| --radius-lg | 10px | **padrão** — cards, dropdowns |
| --radius-xl | 14px | modais |
| --radius-2xl | 18px | hero cards |
| --radius-full | 9999px | avatares, pills |

### 2.5 Sombras

```
--shadow-xs: 0 1px 2px rgba(16,24,40,.04)
--shadow-sm: 0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)
--shadow-md: 0 4px 8px -2px rgba(16,24,40,.08)
--shadow-lg: 0 12px 16px -4px rgba(16,24,40,.08)
--shadow-xl: 0 20px 24px -4px rgba(16,24,40,.08)
```

### 2.6 Motion (Animações)

```ts
durations: { instant:75ms, fast:150ms, base:200ms, slow:300ms, slower:500ms }
easings:   { swift:[0.16,1,0.3,1], smooth:[0.4,0,0.2,1], bounce:[0.34,1.56,0.64,1] }

presets: fadeIn, slideUp, scaleIn, listItem(i) com stagger 30ms
```

---

## 3. Páginas Implementadas no Aurea

| Rota | Status | Componentes Principais |
|------|--------|----------------------|
| /dashboard | ✅ COMPLETO | WelcomeHero, PrimaryKpis(5), SecondaryMetrics(6), RevenueAnalysis, PipelineAnalysis, TeamPerformance, ActionItems, AIInsights, RecentActivity |
| /pipeline | 🔲 Placeholder | — |
| /contatos | 🔲 Placeholder | — |
| /contatos/[id] | 🔲 Placeholder | — |
| /deals/[id] | 🔲 Placeholder | — |
| /leads/[id] | 🔲 Placeholder | — |
| /propostas | 🔲 Placeholder | — |
| /propostas/[id]/editor | 🔲 Placeholder | — |
| /contratos | 🔲 Placeholder | — |
| /contratos/[id] | 🔲 Placeholder | — |
| /contratos/modelos | 🔲 Placeholder | — |
| /produtos | 🔲 Placeholder | — |
| /cobranca | 🔲 Placeholder | — |
| /pos-venda | 🔲 Placeholder | — |
| /relatorios | 🔲 Placeholder | — |
| /configuracoes | 🔲 Placeholder | — |
| /showcase | ✅ Design System demo | Todos os componentes |

---

## 4. Componentes Principais

### 4.1 Layout
| Componente | Propósito |
|-----------|-----------|
| AppShell | Wrapper raiz (sidebar + header + main + command palette) |
| AppSidebar | Sidebar colapsável 56px↔240px com Motion |
| AppHeader | Header sticky (título + search + notificações + avatar) |
| CommandPalette | Busca global ⌘K via cmdk |

### 4.2 CRM Core
| Componente | Propósito | Assinatura |
|-----------|-----------|-----------|
| **IconBadge** | Ícone em container soft colorido | ⭐ Padrão UUI — deve trazer |
| **StatCard** | KPI: label + valor grande + delta + sparkline | ⭐ Padrão dashboard |
| **PageHeader** | Título + breadcrumb + ações — em CADA página | ⭐ Trazer obrigatório |
| **DealCard** | Card kanban: stripe prioridade + metadata compacta | ⭐ Premium |
| **DataTable** | Wrapper @tanstack com search + paginação | ⭐ Trazer |
| EmptyState | Estado vazio: ícone + título + CTA | Trazer |
| ActivityItem | Dot colorido + título + timestamp | Trazer |
| Timeline | Container com border-left conectora | Trazer |
| PriceDisplay | R$ formatado com delta | Trazer |
| PriorityBadge | Soft badge de prioridade | Trazer |
| StageBadge | Soft badge de etapa | Trazer |

### 4.3 Charts (14 tipos — todos via Recharts)
`AreaChart · BarChart · ComboChart · DonutChart · FunnelChart · GaugeChart · HeatmapChart · HorizontalBarChart · Leaderboard · MetricCard · RadialProgress · Sparkline · StackedBarChart · TrendIndicator`

### 4.4 Dashboard Sections
`WelcomeHero · PrimaryKpis · SecondaryMetrics · RevenueAnalysis · PipelineAnalysis · TeamPerformance · ActionItems · AIInsights · RecentActivity`

---

## 5. Navegação Aurea (Sidebar)

```
[Logo Aurea]
─────────────────────
Dashboard
Pipeline
─────────────────────
VENDAS
  Contatos       [124]
  Leads
  Deals          [18 ⚠]
  Propostas
    Todas
    Rascunhos    [5]
    Enviadas
  Contratos
    Todos
    Ativos
    Modelos
─────────────────────
GESTÃO
  Produtos
  Cobrança       [2 🔴]
  Pós-venda
  Relatórios
    Vendas · Time · Receita
─────────────────────
SISTEMA
  Configurações
  Ajuda
─────────────────────
[Avatar] [ThemeToggle]
```

**Features**: colapsável com Motion, badges semânticos, seções expandíveis, sub-items (2-3 níveis), footer com perfil.

---

## 6. Funcionalidades Únicas para Trazer

| Funcionalidade | Prioridade | Justificativa |
|---------------|-----------|---------------|
| IconBadge (soft icon container) | 🔴 Alta | Assinatura visual diferenciadora |
| StatCard com sparkline | 🔴 Alta | KPI premium vs cards simples atuais |
| Recharts (14 tipos) | 🔴 Alta | Substitui SVGs manuais frágeis |
| Motion library | 🔴 Alta | Produto sem animação parece estático |
| PageHeader component | 🔴 Alta | Consistência em todas as páginas |
| DataTable (@tanstack) | 🟡 Média | Tabelas com sort/search/paginação |
| CommandPalette (⌘K) | 🟡 Média | UX premium de CRM |
| Sonner toasts | 🟡 Média | Feedback de ações |
| EmptyState padronizado | 🟡 Média | Consistência |
| Motion presets | 🟡 Média | Reutilizável |
| Dialogs reutilizáveis | 🟡 Média | Confirm/Delete/Form |
| Sidebar sub-items | 🟢 Baixa | Aurea tem 2-3 níveis, Esquire 1 |
| WelcomeHero animado | 🟢 Baixa | Nice-to-have premium |
| AIInsights cards | 🟢 Baixa | Futuro com dados reais |
