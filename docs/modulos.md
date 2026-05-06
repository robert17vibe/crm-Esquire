# Lista de Módulos — CRM Esquire

_Atualizado em 2026-05-05_

---

## Pipeline
- **Responsabilidade:** Gestão de negócios em kanban por etapas de venda (leads → won/lost)
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/PipelinePage.tsx`
  - `src/components/pipeline/KanbanBoard.tsx`
  - `src/components/pipeline/StageColumn.tsx`
  - `src/components/pipeline/DealCard.tsx`
  - `src/components/pipeline/NewLeadModal.tsx`
  - `src/components/pipeline/EditDealModal.tsx`
  - `src/components/pipeline/LossReasonModal.tsx`
  - `src/components/pipeline/LostDealCard.tsx`
  - `src/components/pipeline/OwnerFilter.tsx`
  - `src/store/useDealStore.ts`
  - `src/hooks/useVisibleDeals.ts`
  - `supabase/migrations/20260417000000_initial_schema.sql`
  - `supabase/migrations/20260427000002_deal_stage_history.sql`

---

## Deal (Detalhe de Negócio)
- **Responsabilidade:** Visão completa de um negócio: atividades, stakeholders, deals relacionados, reuniões
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/DealDetailPage.tsx`
  - `src/components/deal/StakeholderMap.tsx`
  - `src/components/deal/RelatedDeals.tsx`
  - `src/components/deal/MeetingRecordModal.tsx`
  - `src/store/useDealStore.ts`
  - `src/store/useActivityStore.ts`
  - `src/store/useMeetingStore.ts`
  - `supabase/migrations/20260423000002_deal_stakeholders_rich.sql`
  - `supabase/migrations/20260423000001_deal_relations.sql`
  - `supabase/migrations/20260420000002_meetings_trigger_and_cron.sql`

---

## Clientes
- **Responsabilidade:** Lista e detalhe de clientes (empresas), histórico de negócios e contactos
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/ClientsPage.tsx`
  - `src/pages/ClientDetailPage.tsx`
  - `src/store/useOwnerStore.ts`

---

## Renovação
- **Responsabilidade:** Gestão de clientes em fase de renovação de contrato
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/ClientRenovacaoPage.tsx`
  - `supabase/migrations/20260501000001_renewal_and_delivery.sql`

---

## Propostas
- **Responsabilidade:** Gestão e envio de propostas comerciais
- **Estado:** pendente
- **Arquivos-chave:**
  - `src/pages/PropostasPage.tsx`

---

## Calendário / Reuniões
- **Responsabilidade:** Calendário de eventos, reuniões e atividades comerciais
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/CalendarPage.tsx`
  - `src/store/useMeetingStore.ts`
  - `src/store/useActivityStore.ts`
  - `supabase/migrations/20260426000001_calendar_events.sql`
  - `supabase/migrations/20260420000002_meetings_trigger_and_cron.sql`

---

## Tarefas
- **Responsabilidade:** Gestão de tarefas internas ligadas a negócios ou utilizadores
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/TasksPage.tsx`
  - `src/store/useTaskStore.ts`
  - `supabase/migrations/20260423000004_tasks.sql`

---

## Email
- **Responsabilidade:** Envio e gestão de emails associados a negócios/clientes
- **Estado:** pendente
- **Arquivos-chave:**
  - `src/pages/EmailPage.tsx`
  - `supabase/migrations/20260427000001_emails_table.sql`

---

## Dashboard
- **Responsabilidade:** Vista geral de métricas e KPIs do comercial ou da equipa
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/DashboardPage.tsx`
  - `src/components/crm/StatCard.tsx`
  - `src/components/crm/AnalyticsSection.tsx`
  - `src/components/crm/charts/CrmAreaChart.tsx`
  - `src/components/crm/charts/CrmBarChart.tsx`
  - `src/components/crm/charts/CrmDonutChart.tsx`
  - `src/lib/dealScore.ts`

---

## Desempenho
- **Responsabilidade:** Página TV de desempenho em tempo real + configuração admin de metas
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/PerformancePage.tsx`
  - `src/pages/AdminDesempenhoPage.tsx`
  - `supabase/migrations/20260430000001_performance_and_fixes.sql`

---

## Admin — Utilizadores e Equipas
- **Responsabilidade:** Gestão de utilizadores, perfis, equipas e impersonation
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/AdminUsersPage.tsx`
  - `src/pages/TeamsPage.tsx`
  - `src/store/useAuthStore.ts`
  - `src/store/useTeamStore.ts`
  - `src/store/useImpersonationStore.ts`
  - `src/store/usePermissionStore.ts`
  - `src/components/ui/ImpersonationBanner.tsx`
  - `supabase/migrations/20260420000001_phase2_profiles_rls_softdelete.sql`
  - `supabase/migrations/20260420000004_teams.sql`

---

## Admin — Distribuição de Leads
- **Responsabilidade:** Regras de atribuição automática e manual de leads a comerciais
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/AdminDistribuirLeadsPage.tsx`
  - `supabase/migrations/20260424000001_lead_assignment_rules.sql`
  - `supabase/migrations/20260427000003_lead_distribution_log.sql`
  - `src/store/useOwnerStore.ts`

---

## Admin — Cobrança
- **Responsabilidade:** Vista administrativa de cobranças e faturação
- **Estado:** pendente
- **Arquivos-chave:**
  - `src/pages/AdminCobrancaPage.tsx`

---

## Admin — Notificações
- **Responsabilidade:** Configuração de notificações automáticas e alertas do sistema
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/AdminNotificationsPage.tsx`
  - `src/store/useNotificationStore.ts`
  - `src/store/useTeamNotificationStore.ts`
  - `supabase/migrations/20260424000001_admin_users_and_notifications.sql`
  - `supabase/migrations/20260426000004_fix_notifications_rls.sql`

---

## Autenticação
- **Responsabilidade:** Login, recuperação e reset de password via Supabase Auth
- **Estado:** completo
- **Arquivos-chave:**
  - `src/pages/LoginPage.tsx`
  - `src/pages/ForgotPasswordPage.tsx`
  - `src/pages/ResetPasswordPage.tsx`
  - `src/store/useAuthStore.ts`
  - `supabase/migrations/20260417000001_profiles.sql`

---

## Definições / Settings
- **Responsabilidade:** Preferências do utilizador: tema, perfil, integrações, webhooks
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/pages/SettingsPage.tsx`
  - `src/store/useThemeStore.ts`
  - `src/store/useSettingsStore.ts`
  - `src/store/useWebhookStore.ts`
  - `supabase/migrations/20260504000001_app_settings.sql`

---

## Layout / Shell
- **Responsabilidade:** Layout global (sidebar, header, toast, command palette)
- **Estado:** em progresso
- **Arquivos-chave:**
  - `src/components/layout/AppLayout.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/Header.tsx`
  - `src/components/ui/CommandPalette.tsx`
  - `src/components/ui/Toast.tsx`
  - `src/store/useToastStore.ts`
  - `src/store/useAppStore.ts`
