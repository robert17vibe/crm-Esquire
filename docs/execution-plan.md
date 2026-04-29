# Plano de Execução — Migração Visual Aurea → Esquire
> Etapas ordenadas por dependência. Cada etapa é um PR independente.
> AGUARDAR APROVAÇÃO HUMANA antes de executar qualquer etapa.

---

## Visão Geral

```
ETAPA 1 — Fundação (tokens + motion + recharts)
    ↓
ETAPA 2 — Componentes Core (IconBadge, StatCard, PageHeader, EmptyState)
    ↓
ETAPA 3 — Dashboard completo reescrito
    ↓
ETAPA 4 — Sidebar refinada + AppLayout
    ↓
ETAPA 5 — Páginas secundárias padronizadas
    ↓
ETAPA 6 — Charts nas páginas (Relatórios, Pipeline)
    ↓
ETAPA 7 — Deal Detail + Timeline
    ↓
ETAPA 8 — Features avançadas (Command Palette, Toasts, Dialogs)
```

---

## ETAPA 1 — Sistema de Design + Dependências
**Complexidade**: Média | **Estimativa**: 2h | **Bloqueador para**: tudo

### Objetivo
Estabelecer a fundação visual do Esquire com tokens Aurea adaptados para identidade bordô/enterprise. Instalar motion e recharts.

### Arquivos a Modificar
- `src/styles/globals.css` — substituição completa de tokens
- `package.json` + instalar dependências

### Ações

**1.1 Instalar dependências**
```bash
npm install motion recharts sonner
```

**1.2 globals.css — Tokens Aurea adaptados para Esquire**

```css
:root {
  /* Superfícies */
  --canvas:   #f9fafb;
  --surface:  #ffffff;
  --subtle:   #f3f4f6;
  --inset:    #eaecf0;

  /* Texto */
  --text-primary:   #101828;
  --text-secondary: #475467;
  --text-tertiary:  #98a2b3;
  --text-disabled:  #d0d5dd;

  /* Bordas */
  --border:        #eaecf0;
  --border-strong: #d0d5dd;
  --border-focus:  #8b1a1a;

  /* Accent — BORDÔ (substitui indigo do Aurea) */
  --accent:       #8b1a1a;
  --accent-hover: #6b1212;
  --accent-soft:  #fdf2f2;
  --accent-muted: rgba(139,26,26,0.12);

  /* Semânticas */
  --success:      #2d5a3d;
  --success-soft: #f0fdf4;
  --warning:      #8b6914;
  --warning-soft: #fffbeb;
  --danger:       #b91c22;
  --danger-soft:  #fff1f2;
  --info:         #1e4db7;
  --info-soft:    #eff6ff;

  /* Radius */
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   10px;
  --radius-xl:   14px;
  --radius-2xl:  18px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(16,24,40,.04);
  --shadow-sm: 0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04);
  --shadow-md: 0 4px 8px -2px rgba(16,24,40,.08), 0 2px 4px -2px rgba(16,24,40,.04);
  --shadow-lg: 0 12px 16px -4px rgba(16,24,40,.08), 0 4px 6px -2px rgba(16,24,40,.04);
  --shadow-xl: 0 20px 24px -4px rgba(16,24,40,.08), 0 8px 8px -4px rgba(16,24,40,.04);

  /* Spacing semântico */
  --card-padding: 20px;
  --card-gap:     16px;
  --page-x:       24px;
  --section-gap:  32px;
}

.dark {
  --canvas:   #0d0c0a;
  --surface:  #161614;
  --subtle:   #1c1c1a;
  --inset:    #242422;
  --text-primary:   #f0ede8;
  --text-secondary: #a09890;
  --text-tertiary:  #6b6560;
  --border:        #2a2824;
  --border-strong: #3a3630;
  --accent:        #c44040;
  --accent-soft:   rgba(196,64,64,0.10);
}
```

**1.3 Criar lib/motion.ts**
```ts
export const durations = {
  instant: 0.075,
  fast:    0.15,
  base:    0.2,
  slow:    0.3,
  slower:  0.5,
}

export const easings = {
  swift:  [0.16, 1, 0.3, 1],
  smooth: [0.4, 0, 0.2, 1],
  bounce: [0.34, 1.56, 0.64, 1],
}

export const transitions = {
  default: { duration: durations.base, ease: easings.swift },
  fast:    { duration: durations.fast, ease: easings.smooth },
  smooth:  { duration: durations.slow, ease: easings.smooth },
  bounce:  { duration: durations.slow, ease: easings.bounce },
}

export const motionPresets = {
  fadeIn:  { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: transitions.default },
  slideUp: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: transitions.default },
  scaleIn: { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, transition: transitions.default },
  listItem: (i: number) => ({
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { ...transitions.default, delay: i * 0.04 },
  }),
}
```

---

## ETAPA 2 — Componentes Core Aurea
**Complexidade**: Alta | **Estimativa**: 3h | **Depende de**: Etapa 1

### Objetivo
Criar os 6 componentes base que definem a assinatura visual do Aurea adaptados para o Esquire.

### Arquivos a Criar
- `src/components/crm/icon-badge.tsx`
- `src/components/crm/stat-card.tsx`
- `src/components/crm/page-header.tsx`
- `src/components/crm/empty-state.tsx`
- `src/components/crm/activity-item.tsx`
- `src/components/crm/timeline.tsx`
- `src/components/ui/sonner.tsx`

### Especificações

**IconBadge** — Ícone em container soft colorido
```
colors: accent|success|warning|danger|info|neutral
sizes:  sm(32px) | md(36px) | lg(44px)
pattern: bg=color+18 (hex opacity) | icon=color sólido | radius=var(--radius-md)
```

**StatCard** — KPI premium
```
layout: IconBadge (topo-esq) | label (xs, muted) | value (28px, Geist Mono) | delta badge | sparkline (Recharts)
delta colors: success(↑) | danger(↓) | neutral(→)
```

**PageHeader** — Cabeçalho de cada página
```
layout: [breadcrumb?] + [title (text-2xl, font-semibold, -0.02em)] + [actions à direita]
height: 64px fixed, border-bottom: var(--border)
```

**EmptyState** — Estado vazio padrão
```
layout: center | IconBadge(lg, neutral) | title (text-md, semibold) | description (text-sm, muted) | CTA button?
```

**ActivityItem** — Item de timeline
```
layout: dot(8px, colorido) + [title (text-sm, semibold) + timestamp (xs, muted)] + description (text-sm)
colors: accent|success|warning|danger|info|neutral
```

**Timeline** — Container de ActivityItem
```
border-left: 1px var(--border) | padding-left: 20px | gap entre items: 16px
```

---

## ETAPA 3 — Dashboard Completo Reescrito
**Complexidade**: Alta | **Estimativa**: 5h | **Depende de**: Etapas 1+2

### Objetivo
Reescrever DashboardPage com estrutura Aurea completa + dados reais do Supabase. É o impacto visual mais grande do projeto.

### Arquivos a Modificar/Criar
- `src/pages/DashboardPage.tsx` — reescrita completa
- `src/components/crm/charts/area-chart.tsx` — Recharts
- `src/components/crm/charts/donut-chart.tsx` — Recharts
- `src/components/crm/charts/funnel-chart.tsx` — Recharts
- `src/components/crm/charts/bar-chart.tsx` — Recharts
- `src/components/crm/charts/sparkline.tsx` — mini inline
- `src/components/crm/welcome-hero.tsx`

### Estrutura do Dashboard

```
DashboardPage
├── PageHeader (título + period selector + export button)
├── WelcomeHero (greeting + nome + goal progress)
├── Tabs: Operação | Resultados
│
│ TAB OPERAÇÃO:
├── PrimaryKpis (6 StatCards em grid 3-col) ← dados Supabase reais
│     Pipeline Total | Leads Ativos | Reuniões | Tarefas | Win Rate | Ticket Médio
├── PipelineAnalysis
│     ├── FunnelChart (conversão entre fases)
│     └── StackedBarChart (pipeline por mês)
├── TeamPerformance (leaderboard owners)
└── RecentActivity (Timeline das últimas atividades)
│
│ TAB RESULTADOS:
├── SecondaryMetrics (receita, variação MoM, forecast)
├── RevenueAnalysis
│     ├── AreaChart (receita mensal vs meta)
│     └── DonutChart (por categoria)
└── TopDeals (top 5 deals por valor)
```

### Dados Reais (Supabase)
Cada KPI calculado de `useVisibleDeals()` + `useTaskStore()` + `useMeetingStore()`

---

## ETAPA 4 — Sidebar + AppLayout Refinados
**Complexidade**: Média | **Estimativa**: 2h | **Depende de**: Etapas 1+2

### Objetivo
Aplicar Motion na sidebar, adicionar seções expandíveis, sub-items, badges ricos.

### Arquivos a Modificar
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/Header.tsx`

### Mudanças Sidebar
- Animação de colapso com Motion (actualmente não tem animação suave)
- Adicionar seções com label collapsível (Principal / Admin / Sistema)
- Badges: cores semânticas (success para tarefas ok, warning para overdue, danger para crítico)
- Footer: avatar + nome + cargo + theme toggle + logout
- Nav items: hover com translate-x sutil (2px)

### Mudanças Header
- Adicionar trigger do CommandPalette (⌘K) no search
- Notificação bell com Motion badge animado
- Breadcrumb contextual

---

## ETAPA 5 — Páginas Secundárias Padronizadas
**Complexidade**: Média | **Estimativa**: 4h | **Depende de**: Etapas 1+2

### Objetivo
Aplicar PageHeader + EmptyState + paleta em TODAS as páginas. Impacto de consistência máximo.

### Páginas (em ordem)
1. **ClientsPage** — DataTable pattern, PageHeader, EmptyState
2. **TasksPage** — TaskItem Aurea-style, EmptyState, PageHeader
3. **MeetingsPage** — ActivityItem pattern, PageHeader
4. **CalendarPage** — PageHeader, paleta tokens
5. **EmailPage** — PageHeader, layout respirado
6. **SettingsPage** — PageHeader, form inputs estilo Aurea
7. **AtividadesPage** — Timeline Aurea completa
8. **PropostasPage** — StageBadge Aurea, PageHeader

### Padrão a aplicar em CADA página
```tsx
<div style={{ backgroundColor: 'var(--canvas)', minHeight: '100vh' }}>
  <PageHeader
    title="Nome da Página"
    subtitle="Descrição breve"
    actions={<Button>Ação Principal</Button>}
  />
  <div style={{ padding: 'var(--page-x)', paddingTop: '24px' }}>
    {/* Conteúdo */}
  </div>
</div>
```

---

## ETAPA 6 — Charts nas Páginas Analíticas
**Complexidade**: Média | **Estimativa**: 3h | **Depende de**: Etapa 3

### Objetivo
Substituir SVGs manuais frágeis em RelatoriosPage e outras páginas por Recharts components.

### Arquivos a Modificar
- `src/pages/RelatoriosPage.tsx` — substituir AreaChart/MonthlyBars custom por Recharts
- `src/pages/AtividadesPage.tsx` — adicionar mini charts
- `src/pages/PropostasPage.tsx` — adicionar FunnelChart de pipeline propostas

### Charts por Página
- **Relatórios**: AreaChart (pipeline mensal) + BarChart (receita) + FunnelChart (conversão) + HorizontalBarChart (ranking)
- **Atividades**: SparkLine (atividade por dia)
- **Propostas**: DonutChart (por estado) + BarChart (por mês)

---

## ETAPA 7 — Deal Detail Page Refinado
**Complexidade**: Média | **Estimativa**: 2h | **Depende de**: Etapa 2

### Objetivo
Aplicar layout 2-colunas Aurea + Timeline de atividades + breadcrumb.

### Arquivos a Modificar
- `src/pages/DealDetailPage.tsx`

### Mudanças
- PageHeader com breadcrumb: Oportunidades > [Nome do Deal]
- Layout: `[2fr main] [1fr sidebar]`
- Main: info do deal + Timeline de histórico (ActivityItem)
- Sidebar: StatCards de valor/fase/owner + ações (email, reunião, tarefa)
- MeetingRecordModal: estilo Aurea (Dialog pattern)

---

## ETAPA 8 — Features Premium
**Complexidade**: Alta | **Estimativa**: 4h | **Depende de**: Etapas 1-5

### Objetivo
Features que elevam o produto a nível SaaS premium.

### 8.1 CommandPalette (⌘K)
- `src/components/layout/CommandPalette.tsx`
- Overlay escuro + input search + lista deals/clientes/tarefas
- Keybinding global no AppLayout
- Navigate para /deal/:id ao selecionar

### 8.2 Sonner Toasts
- Instalar + configurar Toaster no AppLayout
- Aplicar em: criar lead, mover fase, completar tarefa, enviar email
- `toast.success("Lead criado com sucesso")` em vez de alerts

### 8.3 Dialogs Reutilizáveis
- `src/components/crm/dialogs/confirm-dialog.tsx`
- `src/components/crm/dialogs/delete-confirm-dialog.tsx`
- Usar em: excluir deal, remover tarefa, cancelar proposta

### 8.4 Pipeline Page Refinamento
- DealCard com priority stripe
- StageBadge Aurea
- Animação ao mover cards (Motion)

---

## Resumo Executivo

| Etapa | Impacto Visual | Tempo | Risco |
|-------|---------------|-------|-------|
| 1 — Tokens + Deps | 🔴 Crítico (base) | 2h | Baixo |
| 2 — Componentes Core | 🔴 Alto | 3h | Baixo |
| 3 — Dashboard | 🔴 Máximo | 5h | Médio |
| 4 — Sidebar | 🟡 Médio | 2h | Baixo |
| 5 — Páginas | 🟡 Médio-alto | 4h | Baixo |
| 6 — Charts | 🟡 Médio | 3h | Baixo |
| 7 — Deal Detail | 🟢 Médio | 2h | Baixo |
| 8 — Features premium | 🟢 Alto (UX) | 4h | Médio |

**Total estimado**: ~25h de desenvolvimento
**Resultado**: CRM enterprise com visual Aurea/Untitled UI adaptado para identidade bordô Esquire

---

## Decisões que Precisam de Aprovação

1. **Cor primária**: bordô `#8b1a1a` — confirmar o tom exato
2. **Recharts vs SVG custom**: confirmar que podemos instalar recharts (~50kb)
3. **Motion library**: confirmar instalação (~30kb)
4. **Ordem das etapas**: confirmar se Etapa 3 (dashboard) é realmente a prioridade após fundação
5. **@tanstack/react-table**: instalar ou continuar com tabelas manuais?
6. **Sonner**: confirmar para substituir comportamento de feedback atual
