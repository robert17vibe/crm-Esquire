-- ─────────────────────────────────────────────────────────────
-- Remove fluxo de declinados
-- Triggers e view já não são necessários — o fluxo simplificado
-- não tem estado "paused" de contratos.
-- ─────────────────────────────────────────────────────────────

drop trigger if exists on_deal_left_won              on public.deals;
drop trigger if exists on_deal_closed_won_reactivate on public.deals;

drop function if exists public.handle_deal_left_won();
drop function if exists public.handle_deal_closed_won_reactivate();

drop view if exists public.v_declined_contracts;
