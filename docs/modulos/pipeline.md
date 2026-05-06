# Módulo: Pipeline

## 📌 Responsabilidade
Gestão de negócios (deals) em formato kanban com etapas de venda, drag-and-drop, filtragem por dono e vistas alternativas (kanban / lista / mapa).

---

## 🧩 Funcionalidades
- Kanban com 7 etapas: Entrada → Prospecção → Qualificação → Em Proposta → Fechamento → Ganho → Perdido
- Drag-and-drop entre colunas (dnd-kit com MouseSensor, TouchSensor, KeyboardSensor)
- Modal de motivo de perda obrigatório ao mover para `closed_lost`
- Bloqueio de mover para `closed_won` sem proposta criada (verifica `localStorage`)
- Criação de lead via `NewLeadModal` (com round-robin de owner por equipa)
- Edição de lead via `EditDealModal`
- Filtro por owner (`OwnerFilter`) e por texto
- Sort manual ou por deal score (`evaluateDealScore`)
- Vista lista com agrupamento por etapa colapsável
- Vista mapa Brasil (SVG) com dots por estado do cliente
- Funil de conversão inline (barra horizontal com % entre etapas)
- Realtime via Supabase channel `deals-realtime` (INSERT/UPDATE/DELETE)
- Alertas de SLA: sem primeiro contato em 2h (leads sem atividade) e stale 21 dias

---

## 📂 Arquivos relevantes
- `src/pages/PipelinePage.tsx` — orquestração da página, toolbar, vistas
- `src/components/pipeline/KanbanBoard.tsx` — DnD, lógica de drag, agrupamento por stage
- `src/components/pipeline/StageColumn.tsx` — coluna de etapa com SortableContext
- `src/components/pipeline/DealCard.tsx` — card individual, score badge, probability bar
- `src/components/pipeline/NewLeadModal.tsx` — formulário de criação de lead
- `src/components/pipeline/EditDealModal.tsx` — formulário de edição de deal
- `src/components/pipeline/LossReasonModal.tsx` — modal de motivo de perda
- `src/components/pipeline/LostDealCard.tsx` — card visual para deals perdidos
- `src/components/pipeline/OwnerFilter.tsx` — filtro por comercial
- `src/store/useDealStore.ts` — estado global de deals, CRUD, realtime, stale alerts
- `src/hooks/useVisibleDeals.ts` — filtra deals pelo owner impersonado
- `src/constants/pipeline.ts` — STAGES, DEFAULT_PROBABILITIES, TAG_STYLES
- `src/types/deal.types.ts` — tipos Deal, Owner, NextActivity, GroupedDeals
- `src/services/deal.service.ts` — fetchDeals, insertDeal, patchDeal, removeDeal
- `src/lib/dealScore.ts` — lógica de pontuação de deals
- `supabase/migrations/20260417000000_initial_schema.sql` — tabela deals
- `supabase/migrations/20260427000002_deal_stage_history.sql` — histórico de mudanças de etapa

---

## 🔗 Dependências
- `useImpersonationStore` — controla qual owner está sendo simulado
- `useOwnerStore` — lista de owners disponíveis para filtro e atribuição
- `useNotificationStore` — alertas de SLA e notificações por novo lead
- `useTaskStore` — conta tarefas abertas por deal (exibido no card)
- `useWebhookStore` — dispara webhooks em deal.created, deal.deleted, deal.stage_changed
- `useAuthStore` — user atual para `owner_id` na criação
- `src/services/distribution.service.ts` — regista log de distribuição de leads
- `src/constants/pipeline.ts` — estágios e probabilidades padrão

---

## 🔄 Fluxos principais

### Criação de lead
1. Utilizador clica "Novo Lead" → `NewLeadModal` abre
2. Submit → `useDealStore.createDeal(values)`
3. Optimistic insert (ID temporário `opt-*`) atualiza store imediatamente
4. `insertDeal()` chama Supabase; retorno substitui o optimistic
5. Dispara toast, notificação e webhook `deal.created`
6. Log de distribuição registado via `logDistribution()`

### Mover deal entre etapas (DnD)
1. `KanbanBoard.onDragEnd` detecta mudança de `from` → `to`
2. Se `to === closed_lost`: abre `LossReasonModal`; move só acontece após confirmar
3. Se `to === closed_won` sem proposta: abre `NoProposalModal` e reverte
4. Caso normal: chama `onStageChange` → `useDealStore.moveDeal(id, stageId)`
5. `moveDeal` faz optimistic update + `patchDeal()` no Supabase
6. Dispara webhook `deal.stage_changed`

### Realtime (Supabase)
1. `subscribeRealtime()` abre channel `deals-realtime`
2. INSERT: adiciona deal ao store se não existir
3. UPDATE: substitui deal existente; se `deleted_at` preenchido, remove
4. DELETE: remove pelo id

---

## 📊 Dados envolvidos

### Tabela `deals` (Supabase)
Campos principais: `id`, `title`, `stage_id`, `value`, `probability`, `days_in_stage`, `owner_id`, `company_name`, `contact_name`, `contact_email`, `contact_phone`, `lead_source`, `loss_reason`, `tags`, `next_activity`, `last_activity_at`, `deleted_at`, `created_at`, `updated_at`

### localStorage
- `esq_deals_v2` — cache local de deals (fallback offline + velocidade inicial)
- `esq_proposals_v4_{dealId}` — propostas do deal (usado para verificar bloqueio de `closed_won`)

### Tipos chave
- `Deal` — entidade principal (`src/types/deal.types.ts`)
- `StageId` — `'leads' | 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'`
- `GroupedDeals` — `Record<StageId, Deal[]>`

---

## ⚠️ Regras de negócio
1. **Fechar como Ganho exige proposta** — verifica `localStorage` key `esq_proposals_v4_{id}`. Sem proposta, o move é bloqueado e revertido automaticamente.
2. **Fechar como Perdido exige motivo** — `LossReasonModal` é modal; cancelar reverte o deal para a etapa anterior.
3. **Probabilidade automática** — ao mover etapa, `DEFAULT_PROBABILITIES[stageId]` é aplicado automaticamente.
4. **Stale alert 21 dias** — deals sem atividade há 21+ dias geram alerta no `useNotificationStore`.
5. **SLA 2h** — deals em `leads` sem atividade criados há mais de 2h geram alerta `sla_breach`.
6. **IDs mock não persistem no DB** — `moveDeal` detecta se o ID não é UUID e salta o `patchDeal()`.
7. **Soft delete** — deals com `deleted_at` preenchido são removidos do store (não excluídos localmente).
8. **Visibilidade por impersonation** — `useVisibleDeals` filtra pelo `impersonatedId` se admin estiver a impersonar.

---

## 🧠 Observações para IA
- `KanbanBoard` mantém o seu **próprio estado local** (`grouped`) sincronizado com `initialDeals` via `useEffect`. O store é a fonte de verdade mas o kanban tem estado de UI independente para suavizar DnD.
- O pattern de **optimistic update** está em `createDeal`, `updateDeal`, `moveDeal`, `patchDealFields` — sempre guarda `prev`, tenta async, reverte em erro.
- A verificação de proposta para `closed_won` lê **localStorage diretamente**, não o Supabase — cuidado se proposta for migrada para DB.
- `pendingNewDeal` / `pendingUpdatedDeal` são props do `KanbanBoard` usadas para sincronizar novos deals criados sem causar re-render completo do board.
- `useVisibleDeals` é um wrapper fino — se precisar de filtros mais complexos (por equipa, por etapa), estender aqui.
- Tags são armazenadas como `string[]` no deal; a palette de cores está em `TAG_STYLES` em `constants/pipeline.ts`.
- O funil (`StageFunnel`) e o mapa Brasil (`BrazilDotMap`) estão **inline** em `PipelinePage.tsx` (não extraídos como componentes separados).
