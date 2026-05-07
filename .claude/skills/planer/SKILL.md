# Planer — Banco de Dados do Projecto CRM Esquire

> Chama este skill no início de cada sessão para ter contexto completo do projecto antes de actuar.
> Actualiza este ficheiro sempre que adicionares páginas, stores, serviços ou migrations.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estado | Zustand (stores singleton) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Routing | React Router v6 (lazy-loaded) |
| DnD | dnd-kit |
| Gráficos | Recharts |
| UI Primitivos | Radix UI |
| Validação | Zod + React Hook Form |
| Estilos | Inline styles (sem Tailwind no JSX) |
| Animações | motion (Framer Motion) |

**Cores do design system:**
- Dark bg: `#0d0c0a` / Light bg: `#f5f4f0`
- Brand green: `#2c5545` / Brand red: `#6b1212`
- Theme: `useThemeStore(s => s.isDark)`

**Variáveis de ambiente obrigatórias:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Routing (src/App.tsx)

| Rota | Página | Guard |
|------|--------|-------|
| `/login` | LoginPage | — |
| `/forgot-password` | ForgotPasswordPage | — |
| `/reset-password` | ResetPasswordPage | — |
| `/performance` | PerformancePage | — (TV display, fora do AppLayout) |
| `/` | DashboardPage | Auth |
| `/pipeline` | PipelinePage | Auth |
| `/clients` | ClientsPage | Auth |
| `/clients/:id` | ClientDetailPage | Auth |
| `/clients/:id/renovacao` | ClientRenovacaoPage | Auth |
| `/deals/:id` | DealDetailPage | Auth |
| `/calendar` | CalendarPage | Auth |
| `/tasks` | TasksPage | Auth |
| `/meetings` | MeetingsPage | Auth |
| `/activities` | AtividadesPage | Auth |
| `/propostas` | PropostasPage | Auth |
| `/email` | EmailPage | Auth |
| `/teams` | TeamsPage | Auth |
| `/settings` | SettingsPage | Auth |
| `/admin/users` | AdminUsersPage | AdminGuard |
| `/admin/desempenho` | AdminDesempenhoPage | AdminGuard |
| `/admin/distribuir-leads` | AdminDistribuirLeadsPage | AdminGuard |
| `/admin/notificacoes` | AdminNotificationsPage | AdminGuard |
| `/admin/cobranca` | AdminCobrancaPage | AdminGuard |

**Guards:** `AdminGuard` verifica `profile.is_admin`. `/performance` renderiza fora do `AppLayout`.

---

## Páginas (src/pages/)

| Ficheiro | Módulo | Descrição |
|---------|--------|-----------|
| DashboardPage.tsx | Dashboard | KPIs, gráficos, actividade recente |
| PipelinePage.tsx | Pipeline | Kanban 7 etapas, vistas kanban/lista/funil/mapa |
| ClientsPage.tsx | Clientes | Lista de clientes com filtros |
| ClientDetailPage.tsx | Clientes | Detalhe de cliente, deals associados |
| ClientRenovacaoPage.tsx | Renovação | Vista de renovação de contrato por cliente |
| DealDetailPage.tsx | Pipeline | Detalhe de deal, timeline, stakeholders |
| CalendarPage.tsx | Calendário | Eventos e reuniões em calendário |
| TasksPage.tsx | Tarefas | Gestão de tarefas por deal/owner |
| MeetingsPage.tsx | Reuniões | Registo e listagem de reuniões |
| AtividadesPage.tsx | Actividades | Feed de actividade global |
| PropostasPage.tsx | Propostas | Gestão de propostas comerciais |
| EmailPage.tsx | Email | Integração de email |
| TeamsPage.tsx | Equipas | Gestão de equipas e membros |
| SettingsPage.tsx | Configurações | Preferências do utilizador |
| PerformancePage.tsx | Desempenho | TV display de métricas em tempo real |
| AdminDesempenhoPage.tsx | Admin | Configuração dos targets de desempenho |
| AdminUsersPage.tsx | Admin | Gestão de utilizadores e permissões |
| AdminDistribuirLeadsPage.tsx | Admin | Regras de distribuição de leads |
| AdminNotificationsPage.tsx | Admin | Configuração de notificações |
| AdminCobrancaPage.tsx | Admin | Vista de cobrança |
| LoginPage.tsx | Auth | Login |
| ForgotPasswordPage.tsx | Auth | Recuperação de password |
| ResetPasswordPage.tsx | Auth | Reset de password |

---

## Componentes (src/components/)

### Layout
| Ficheiro | Função |
|---------|--------|
| layout/AppLayout.tsx | Shell principal (Sidebar + Header + outlet) |
| layout/Sidebar.tsx | Navegação lateral, links por módulo |
| layout/Header.tsx | Barra superior, user menu, notificações |

### CRM (genéricos reutilizáveis)
| Ficheiro | Função |
|---------|--------|
| crm/PageHeader.tsx | Cabeçalho de página com title + actions |
| crm/StatCard.tsx | Card de KPI/métrica |
| crm/EmptyState.tsx | Estado vazio com ilustração |
| crm/IconBadge.tsx | Badge com ícone |
| crm/Timeline.tsx | Timeline de actividade |
| crm/AnalyticsSection.tsx | Secção de analytics com gráficos |
| crm/charts/CrmAreaChart.tsx | Gráfico de área (Recharts) |
| crm/charts/CrmBarChart.tsx | Gráfico de barras (Recharts) |
| crm/charts/CrmDonutChart.tsx | Gráfico donut (Recharts) |
| crm/charts/Sparkline.tsx | Sparkline mini (Recharts) |

### Pipeline
| Ficheiro | Função |
|---------|--------|
| pipeline/KanbanBoard.tsx | DnD board, agrupamento por stage, modais de perda/bloqueio |
| pipeline/StageColumn.tsx | Coluna de etapa com SortableContext |
| pipeline/DealCard.tsx | Card com score badge, probability bar, meta icons |
| pipeline/NewLeadModal.tsx | Criar lead com round-robin |
| pipeline/EditDealModal.tsx | Editar deal |
| pipeline/LossReasonModal.tsx | Motivo de perda (obrigatório para closed_lost) |
| pipeline/LostDealCard.tsx | Card de deal perdido |
| pipeline/OwnerFilter.tsx | Filtro por comercial |

### Deal
| Ficheiro | Função |
|---------|--------|
| deal/MeetingRecordModal.tsx | Registar reunião num deal |
| deal/RelatedDeals.tsx | Deals relacionados |
| deal/StakeholderMap.tsx | Mapa de stakeholders |

### UI (primitivos)
| Ficheiro | Função |
|---------|--------|
| ui/CommandPalette.tsx | Paleta de comandos (cmd+k) |
| ui/ConfirmDialog.tsx | Dialog de confirmação |
| ui/Toast.tsx | Sistema de toasts |
| ui/ImpersonationBanner.tsx | Banner quando admin impersona outro user |
| ui/PageState.tsx | Loading/error/empty state |
| ui/Can.tsx | Guard de permissão inline |
| ui/UserAvatar.tsx | Avatar com iniciais/foto |
| ErrorBoundary.tsx | Boundary de erros globais |

---

## Stores Zustand (src/store/)

| Store | Responsabilidade |
|-------|-----------------|
| useAuthStore | Sessão, user, profile (`is_admin`), login/logout |
| useDealStore | CRUD de deals, realtime, optimistic updates, stale alerts |
| useOwnerStore | Lista de comerciais (owners), round-robin |
| useTaskStore | Tarefas por deal/owner |
| useMeetingStore | Reuniões |
| useActivityStore | Feed de actividade |
| useNotificationStore | Notificações in-app |
| useTeamStore | Equipas e membros |
| useTeamNotificationStore | Notificações de equipa |
| usePermissionStore | Feature flags por utilizador |
| useImpersonationStore | Simulação de owner por admin (sessionStorage `esq_impersonate_id`) |
| useWebhookStore | Webhooks outbound (`fire(event, payload)`) |
| useProposalStore | Cache de propostas por deal (`byDeal`), CRUD com optimistic updates |
| usePaymentStore | Contratos + parcelas: initialize, refresh, payInstallment, getContractByDeal, getPaymentsByDeal, overduePayments |
| useToastStore | Toasts (`addToast(msg, type)`) |
| useSettingsStore | Configurações da app |
| useThemeStore | Dark/light mode (`isDark`) |
| useAppStore | Estado global de app (misc) |

**Padrão de acesso imperativo:** `useStore.getState()` fora de React.

---

## Serviços (src/services/)

| Ficheiro | Wraps |
|---------|-------|
| deal.service.ts | fetchDeals, insertDeal, patchDeal, removeDeal |
| deal-events.service.ts | Eventos de deal (stage history, webhooks) |
| activity.service.ts | Actividades |
| meeting.service.ts | Reuniões |
| owner.service.ts | Owners/comerciais |
| distribution.service.ts | Distribuição de leads |
| teams.service.ts | Equipas |
| proposal.service.ts | CRUD de propostas comerciais (fetchProposalsByDeals, insertProposal, updateProposalStatus, deleteProposal) |
| payment.service.ts | CRUD de contratos e parcelas; fetchAllPaymentsWithDealInfo (join deals); fetchReceivableStats (view v_receivable) |

---

## Hooks (src/hooks/)

| Hook | Função |
|------|--------|
| useVisibleDeals | Filtra deals por `impersonatedId` quando admin impersona |
| useOperationalAlerts | Alertas operacionais (SLA, stale deals) |

---

## Lib (src/lib/)

| Ficheiro | Função |
|---------|--------|
| supabase.ts | Cliente Supabase singleton |
| dealScore.ts | Score 0–100 de deal (stage, meetings, tasks, proposals, recency) |
| utils.ts | Utilitários gerais |
| csv.ts | Export CSV |
| mock-data.ts | Dados mock para dev |
| motion.ts | Variantes de animação (motion/framer) |
| owner.ts | Utilitários de owner |
| schemas/deal.schema.ts | Schema Zod do deal |

---

## Tipos (src/types/)

| Ficheiro | Tipos exportados |
|---------|-----------------|
| deal.types.ts | `Deal`, `StageId`, `Owner`, `NextActivity`, `GroupedDeals` |
| task.types.ts | `Task` e variantes |
| index.ts | Re-exports e tipos globais |

---

## Constantes (src/constants/)

| Ficheiro | O que define |
|---------|-------------|
| pipeline.ts | `STAGES`, `DEFAULT_PROBABILITIES`, `TAG_STYLES` |

**Pipeline stages:** `leads → prospecting → qualification → proposal → negotiation → closed_won → closed_lost`

---

## Migrations Supabase (supabase/migrations/)

| Migration | Estado | Conteúdo |
|-----------|--------|----------|
| 20260417000000_initial_schema.sql | ✅ Aplicada | Schema inicial |
| 20260417000001_profiles.sql | ✅ Aplicada | Tabela profiles |
| 20260420000000_days_in_stage.sql | ✅ Aplicada | Dias por etapa |
| 20260420000001_phase2_profiles_rls_softdelete.sql | ✅ Aplicada | RLS + soft delete |
| 20260420000002_meetings_trigger_and_cron.sql | ✅ Aplicada | Trigger meetings + cron |
| 20260420000003_audit_log.sql | ✅ Aplicada | Log de auditoria |
| 20260420000004_teams.sql | ✅ Aplicada | Equipas |
| 20260423000001_lead_temperature.sql | ✅ Aplicada | Temperatura de lead |
| 20260423000002_integrations.sql | ✅ Aplicada | Integrações |
| 20260423000003_deals_stakeholders.sql | ✅ Aplicada | Stakeholders de deal |
| 20260423000004_tasks.sql | ✅ Aplicada | Tarefas |
| 20260423000001_deal_relations.sql | ✅ Aplicada | Relações entre deals |
| 20260423000002_deal_stakeholders_rich.sql | ✅ Aplicada | Stakeholders enriquecidos |
| 20260424000001_lead_assignment_rules.sql | ✅ Aplicada | Regras de atribuição de leads |
| 20260424000001_admin_users_and_notifications.sql | ✅ Aplicada | Admin + notificações |
| 20260426000001_calendar_events.sql | ✅ Aplicada | Eventos de calendário |
| 20260426000002_rename_tables.sql | ✅ Aplicada | Rename de tabelas |
| 20260426000003_add_missing_columns.sql | ✅ Aplicada | Colunas em falta |
| 20260426000004_fix_notifications_rls.sql | ✅ Aplicada | Fix RLS notificações |
| FIX_aplicar_manualmente_notificacoes.sql | ✅ Aplicada | Fix manual notificações |
| 20260427000001_emails_table.sql | ✅ Aplicada | Tabela emails |
| 20260427000002_deal_stage_history.sql | ✅ Aplicada | Histórico de etapas |
| 20260427000003_lead_distribution_log.sql | ✅ Aplicada | Log de distribuição de leads |
| 20260430000001_performance_and_fixes.sql | ✅ Aplicada | Performance + fixes |
| 20260501000001_renewal_and_delivery.sql | ✅ Aplicada | Renovação + entrega |
| 20260504000001_app_settings.sql | ✅ Aplicada | Configurações da app |
| 20260505155431_proposals.sql | ✅ Aplicada | Tabela proposals (migração do localStorage) |
| 20260505160000_fix_rls_permissive_policies.sql | ✅ Aplicada | Remove política "auth" permissiva de deals/activities/meetings + fix is_admin |
| 20260505170000_fix_rls_all_tables.sql | ✅ Aplicada | RLS ownership em deal_relations, stakeholders, stage_history, meeting_records, renewal_proposals, deal_materials, deal_deliverables, deal_delivery_notes, proposals |
| 20260507000001_contracts_and_payments.sql | ⚠️ Pendente aplicar no Supabase | Tabelas contracts + payments, trigger auto-cria contrato em closed_won, views v_mrr/v_arr/v_receivable/v_collection_rate |
| 20260506195524_security_and_flow_improvements.sql | ⚠️ Pendente aplicar no Supabase | Fix search_path em funções (segurança), trigger melhorado handle_deal_closed_won (parcelas reais), fluxo completo Kanban→Proposta→Cobrança→Renovação |
| 20260507000002_fix_trigger_delivery_events.sql | ⚠️ Pendente aplicar no Supabase | Fix jsonb bug `(l->>'qty')::numeric`; add delivery_status+signing_status a contracts; tabela payment_events (outbox para API externa futura); triggers handle_payment_paid, handle_contract_signed, handle_delivery_updated |
| 20260507000003_deal_left_won_and_declined.sql | ⚠️ Pendente aplicar no Supabase | Trigger handle_deal_left_won (pausa contrato ao sair de closed_won); trigger reactivate (reversão em 3 dias); view v_declined_contracts |
| 20260507100000_fix_contract_redecline_flow.sql | ⚠️ Pendente aplicar no Supabase | **Fix crítico**: trigger handle_deal_closed_won verifica só contratos ACTIVE (não paused); novo contrato criado após declínio com proposta mais recente; trigger reactivate corrigido |

---

## Padrões de Código Obrigatórios

### Estilos
- **Sempre inline styles** — nunca Tailwind no JSX de componentes
- Dark/light: `const isDark = useThemeStore(s => s.isDark)`

### Optimistic Updates (padrão obrigatório)
```ts
const prev = get().deals;
set({ deals: /* novo estado */ });
try {
  await service.patch(id, data);
} catch {
  set({ deals: prev }); // revert
  useToastStore.getState().addToast('Erro ao actualizar', 'error');
}
```

### Webhooks
```ts
useWebhookStore.getState().fire('deal.created', payload);
```

### Toasts
```ts
useToastStore.getState().addToast('Mensagem', 'success' | 'error' | 'info');
```

### LocalStorage keys
| Key | Conteúdo |
|-----|---------|
| `esq_deals_v2` | Cache de deals |
| `esq_proposals_v4_{dealId}` | Propostas por deal (verifica closed_won) |

---

## Regras de Negócio Críticas

1. **closed_won** exige proposta em `localStorage esq_proposals_v4_{id}` — sem proposta, reverter + `NoProposalModal`
2. **closed_lost** exige motivo via `LossReasonModal` — cancelar reverte para etapa anterior
3. `DEFAULT_PROBABILITIES[stageId]` aplicado automaticamente em qualquer mudança de etapa
4. Soft delete: deals com `deleted_at` preenchido ignorados em todas as queries
5. `useVisibleDeals` filtra por `impersonatedId` — respeitar em todas as vistas
6. IDs com prefixo `opt-*` ou não-UUID saltam o Supabase (deals offline/demo)
7. `closed_won` → trigger Supabase cria `contract` automaticamente a partir da proposta aceite + gera parcelas. `usePaymentStore.initialize()` deve ser chamado em páginas que mostram dados financeiros.

---

## Docs e Skills disponíveis

| Path | Conteúdo |
|------|---------|
| docs/modulos.md | Visão geral de todos os módulos |
| docs/modulos/pipeline.md | Doc detalhada do pipeline |
| docs/execution-plan.md | Plano de execução do projecto |
| .claude/skills/pipeline-especialista/SKILL.md | Skill especialista do pipeline |
| .claude/skills/modulos-esquire/SKILL.md | Skill de módulos |
| .claude/skills/nova-pagina/SKILL.md | Criar nova página |
| .claude/skills/nova-migration/SKILL.md | Criar nova migration |
| .claude/skills/novo-store/SKILL.md | Criar novo store |
| .claude/skills/design/SKILL.md | Design system |
| .claude/skills/consolidar/SKILL.md | Consolidar páginas |

---

## Como actualizar este ficheiro

Sempre que fizeres uma das seguintes acções, actualiza a secção correspondente neste ficheiro:
- **Nova página** → adicionar em Routing e Páginas
- **Novo componente** → adicionar em Componentes
- **Novo store** → adicionar em Stores
- **Novo serviço** → adicionar em Serviços
- **Nova migration** → adicionar em Migrations (com estado ✅/⚠️)
- **Nova regra de negócio** → adicionar em Regras de Negócio Críticas
- **Nova constante importante** → adicionar em Constantes
