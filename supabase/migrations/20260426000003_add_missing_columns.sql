-- ─── deal_meetings: adicionar colunas que o TypeScript usa mas não existiam ────

alter table public.deal_meetings
  add column if not exists status text default 'agendada'
    check (status in ('agendada','confirmada','realizada','reagendada','cancelada')),
  add column if not exists meeting_link text;

-- ─── Adicionar CHECK constraint a deals.stage_id ─────────────────────────────
-- Garante que só valores válidos entram na BD, não apenas no frontend

alter table public.deals
  drop constraint if exists deals_stage_id_check;

alter table public.deals
  add constraint deals_stage_id_check
    check (stage_id in ('leads','prospecting','qualification','proposal','negotiation','closed_won','closed_lost'));
