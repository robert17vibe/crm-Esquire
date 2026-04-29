# Migration Plan — Aurea → Esquire
> Matriz de comparação. Decisão final por página, componente e funcionalidade.

---

## Regras de Adaptação de Identidade

| Dimensão | Aurea | Esquire (Adaptado) |
|---------|-------|-------------------|
| Cor primária | Indigo `#6366f1` | Bordô `#8b1a1a` (substituir TODAS as refs accent) |
| Cor de sucesso | Verde `#16a34a` | Verde-musgo `#2d5a3d` |
| Cor de aviso | Amber `#f59e0b` | Âmbar queimado `#8b6914` |
| Cor de perigo | Red `#ef4444` | Carmesim `#b91c22` (já existente) |
| Tipografia | Geist Sans | Geist Sans ✓ (manter) |
| Density | Padrão | Mais respirado (+20% vertical) |
| Border radius | 10px padrão | 8px padrão (mais contido) |
| Sombras | Suaves | Iguais (já corretas) |
| Linguagem UI | Generalista | Executiva enterprise |
| Ícones | @untitled-ui primário | Manter lucide (budget — não instalar UUI) |
| Animações | Motion library | Motion library (instalar) |
| Charts | Recharts | Recharts (instalar) |

### Mapeamento Linguístico
| Aurea | Esquire |
|-------|---------|
| Negócios / Deals | Oportunidades |
| Vendedor | Account Executive |
| Previsão de vendas | Forecast |
| Contatos | Contactos |
| Pós-venda | Account Management |
| Time | Equipa |
| Estágio | Fase |

---

## Matriz de Páginas

### A — JÁ EXISTE, manter como está

| Página Esquire | Rota | Observação |
|---------------|------|-----------|
| LoginPage | /login | Funcional, não tocar |
| ForgotPasswordPage | /forgot-password | Funcional |
| ResetPasswordPage | /reset-password | Funcional |
| AdminUsersPage | /admin/users | Funcional |
| AdminNotificationsPage | /admin/notifications | Funcional |
| AdminDistribuirLeadsPage | /admin/distribuir-leads | Funcional (fix segment pendente) |
| TeamsPage | /teams | Funcional |

---

### B — EXISTE mas precisa refinamento para padrão Aurea

| Página | Rota | O que refinar |
|--------|------|--------------|
| **DashboardPage** | /dashboard | **Prioridade máxima.** Reescrever com: PageHeader, StatCard+Recharts, WelcomeHero, SecondaryMetrics, RevenueAnalysis (recharts), PipelineAnalysis, TeamPerformance leaderboard, RecentActivity timeline. Remover SVGs manuais frágeis. |
| **PipelinePage** | /pipeline | Kanban funciona, mas refinar: DealCard com stripe de prioridade, badges de fase Aurea-style, adicionar PageHeader. |
| **DealDetailPage** | /deal/:id | Adicionar Timeline de atividades no padrão Aurea. PageHeader com breadcrumb. Layout 2-colunas mais clean. |
| **ClientsPage** | /clients | Substituir tabela manual por DataTable pattern. PageHeader. Melhorar cards sumário com StatCard. |
| **TasksPage** | /tarefas | Aplicar TaskItem pattern do Aurea. PageHeader. EmptyState padronizado. |
| **CalendarPage** | /calendar | PageHeader. Paleta e bordas no padrão Aurea. |
| **EmailPage** | /email | PageHeader. Layout respirado. |
| **MeetingsPage** | /meetings | PageHeader. ActivityItem pattern para histórico. |
| **SettingsPage** | /settings | PageHeader. Formulários com pattern Aurea (label gap, input style). |
| **RelatoriosPage** | /relatorios | Substituir SVGs manuais por Recharts. Adicionar mais métricas Aurea-style. Recharts FunnelChart + AreaChart. |
| **AtividadesPage** | /atividades | Refinar com Timeline + ActivityItem do Aurea. |
| **PropostasPage** | /propostas | Adicionar DataTable pattern. StageBadge Aurea. |

---

### C — NÃO EXISTE no Esquire, precisa ser criado

| Funcionalidade | Rota Proposta | Prioridade | Origem Aurea |
|---------------|--------------|-----------|-------------|
| **Design System Tokens** | globals.css | 🔴 Blocker | DESIGN_SYSTEM.md |
| **Motion Library** | lib/motion.ts | 🔴 Blocker | lib/motion.ts |
| **Recharts + Chart Wrapper** | components/charts/ | 🔴 Blocker | components/crm/charts/ |
| **IconBadge** | components/ui/icon-badge.tsx | 🔴 Alta | components/crm/icon-badge.tsx |
| **StatCard (KPI)** | components/crm/stat-card.tsx | 🔴 Alta | components/crm/stat-card.tsx |
| **PageHeader** | components/crm/page-header.tsx | 🔴 Alta | components/crm/page-header.tsx |
| **EmptyState** | components/crm/empty-state.tsx | 🟡 Média | components/crm/empty-state.tsx |
| **ActivityItem + Timeline** | components/crm/timeline.tsx | 🟡 Média | components/crm/timeline.tsx |
| **Sonner Toasts** | components/ui/sonner.tsx | 🟡 Média | components/ui/sonner.tsx |
| **Confirm/Delete Dialogs** | components/crm/dialogs/ | 🟡 Média | components/crm/dialogs/ |
| **DataTable wrapper** | components/crm/data-table.tsx | 🟡 Média | components/crm/data-table.tsx |
| **WelcomeHero** | components/crm/welcome-hero.tsx | 🟢 Baixa | components/crm/dashboard/ |
| **CommandPalette ⌘K** | components/layout/command-palette.tsx | 🟢 Baixa | components/layout/command-palette.tsx |
| **Pós-venda / Account Management** | /pos-venda | 🟢 Baixa | /pos-venda |

---

### D — EXISTE no Aurea, NÃO faz sentido para Esquire

| Item Aurea | Motivo do Descarte |
|-----------|-------------------|
| `@untitled-ui/icons-react` | Custo + lucide já instalado e funcional |
| `@tanstack/react-table` | Overkill para volume de dados do Esquire (poucos clientes high-ticket) |
| next/image, next/link | Stack diferente (Vite/React Router) |
| Server Components | Next.js only — Esquire usa Vite |
| AIInsights com dados mock | Sem modelo de IA real no Esquire ainda |
| Módulo /contratos/[id]/editor | Complexo, fora do escopo atual |
| Módulo /cobranca | Fora do escopo atual |
| ProductSelectable (multi) | Proposta no Esquire é mais simples |
| Modelos de contrato | Fora do escopo |

---

## Impacto por Área

### Design System — TRANSFORMAÇÃO TOTAL
- `globals.css`: trocar todos os tokens de cor (indigo → bordô, paleta neutral nova)
- Adicionar tokens semânticos de espaçamento
- Adicionar CSS vars para motion

### Componentes Core — CRIAR 8 novos
`IconBadge · StatCard · PageHeader · EmptyState · ActivityItem · Timeline · ConfirmDialog · DeleteDialog`

### Charts — INSTALAR + CRIAR WRAPPERS
`recharts · motion` → criar `CrmAreaChart · CrmBarChart · CrmDonutChart · FunnelChart · Sparkline`

### Dashboard — REESCREVER COMPLETO
O mais impactante visualmente. Estrutura Aurea com dados reais Supabase.

### Sidebar — REFINAR
Sub-items (2 níveis), badges mais ricos, animação collapse com Motion.

### Todas as páginas — PADRONIZAR
Aplicar `PageHeader` em CADA página para consistência imediata.
