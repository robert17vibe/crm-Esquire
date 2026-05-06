---
name: pipeline-especialista
description: Skill especialista no módulo Pipeline do CRM Esquire. Use ao trabalhar em qualquer funcionalidade relacionada a kanban de deals, etapas de venda, drag-and-drop, criação/edição de leads, filtros de owner, score de deals ou alertas de SLA.
metadata:
  author: robert17vibe
  version: "1.0.0"
---

# Especialista: Pipeline

## Contexto do módulo
Gestão de negócios em kanban com 7 etapas (leads → prospecting → qualification → proposal → negotiation → closed_won → closed_lost). Suporta DnD, realtime Supabase, vistas kanban/lista/mapa, score de deals e alertas de SLA.

## Arquivos principais
- `src/pages/PipelinePage.tsx` — orquestração da página, toolbar, vistas inline (funil, mapa)
- `src/components/pipeline/KanbanBoard.tsx` — DnD, agrupamento por stage, modais de perda/bloqueio
- `src/components/pipeline/StageColumn.tsx` — coluna de etapa com SortableContext
- `src/components/pipeline/DealCard.tsx` — card, score badge, probability bar, meta icons
- `src/components/pipeline/NewLeadModal.tsx` — criação de lead com round-robin
- `src/components/pipeline/EditDealModal.tsx` — edição de deal
- `src/components/pipeline/LossReasonModal.tsx` — modal de motivo de perda (obrigatório)
- `src/components/pipeline/OwnerFilter.tsx` — filtro por comercial
- `src/store/useDealStore.ts` — estado global, CRUD, realtime, stale alerts, optimistic updates
- `src/hooks/useVisibleDeals.ts` — filtra deals por owner impersonado
- `src/constants/pipeline.ts` — STAGES, DEFAULT_PROBABILITIES, TAG_STYLES
- `src/types/deal.types.ts` — tipos Deal, Owner, NextActivity, GroupedDeals
- `src/services/deal.service.ts` — fetchDeals, insertDeal, patchDeal, removeDeal
- `src/lib/dealScore.ts` — avaliação de pontuação de deal

## O que pode ser alterado com segurança
- Estilo visual dos cards (`DealCard.tsx`) — cores, layout, meta icons
- Labels e cores das etapas em `constants/pipeline.ts`
- Lógica de sort (score vs manual) em `PipelinePage`
- Tags palette (`TAG_STYLES`) em `constants/pipeline.ts`
- Threshold dos alertas de stale (atualmente 21 dias e 7 dias) em `useDealStore`

## O que requer atenção extra
- **KanbanBoard mantém estado local** (`grouped`) separado do store. Alterar a sincronização entre `initialDeals` e `grouped` pode causar flickering ou inconsistências durante DnD.
- **Verificação de proposta para `closed_won`** lê localStorage (`esq_proposals_v4_{id}`). Se propostas forem migradas para DB, esta verificação quebra.
- **Optimistic updates** têm pattern consistente em `createDeal`, `updateDeal`, `moveDeal`, `patchDealFields` — sempre guarda `prev`, reverte em erro. Não quebrar este pattern.
- **IDs mock** (prefixo `opt-*` ou não-UUID) saltam o `patchDeal()` no Supabase — comportamento intencional para deals offline/demo.
- **Realtime channel** `deals-realtime` está ativo enquanto o componente que chama `subscribeRealtime` estiver montado. Garantir cleanup via `return () => supabase.removeChannel(channel)`.

## Regras de negócio obrigatórias
1. Mover para `closed_won` **exige proposta** no localStorage — sem proposta, reverter e mostrar `NoProposalModal`.
2. Mover para `closed_lost` **exige motivo** via `LossReasonModal` — cancelar reverte para etapa anterior.
3. `DEFAULT_PROBABILITIES[stageId]` é aplicado automaticamente em qualquer mudança de etapa.
4. Deals com `deleted_at` preenchido são tratados como removidos (soft delete).
5. `useVisibleDeals` filtra por `impersonatedId` quando admin impersona — respeitar este filtro em todas as vistas.

## Padrões de código deste módulo
- Inline styles (sem Tailwind) para todo estilo de componentes
- `useThemeStore(s => s.isDark)` para adaptar cores dark/light
- `useCallback` em handlers de DnD no `KanbanBoard`
- Optimistic update: `const prev = get().deals` → atualiza → `try/catch` com revert em `catch`
- Webhooks disparados via `useWebhookStore.getState().fire(event, payload)` após operações críticas
- Toasts via `useToastStore.getState().addToast(msg, type)`

## Dependências críticas
| Dependência | Motivo |
|---|---|
| `useImpersonationStore` | Filtra deals por owner impersonado |
| `useOwnerStore` | Lista owners para filtro e round-robin |
| `useNotificationStore` | Alertas SLA e notificações de novo lead |
| `useTaskStore` | Contagem de tarefas abertas por deal no card |
| `useWebhookStore` | Webhooks em created/deleted/stage_changed |
| `useAuthStore` | User atual para `owner_id` na criação |
| `supabase/deals` (tabela) | Fonte de verdade persistente |
| `localStorage esq_deals_v2` | Cache local (fallback e velocidade inicial) |
| `localStorage esq_proposals_v4_{id}` | Verificação de proposta para closed_won |

## Checklist antes de alterar
- [ ] Verificar se a mudança afeta o estado local do `KanbanBoard` (`grouped`) e o store (`useDealStore`) em sincronia
- [ ] Confirmar que o fluxo `closed_won` (verificação de proposta) continua a funcionar
- [ ] Confirmar que o fluxo `closed_lost` (motivo obrigatório + revert em cancelar) continua intacto
- [ ] Testar DnD com mouse, touch e teclado (três sensores ativos)
- [ ] Verificar que optimistic updates revertam corretamente em caso de erro de rede
- [ ] Confirmar que realtime channel faz cleanup ao desmontar
- [ ] Testar com impersonation ativa (admin simulando outro owner)
