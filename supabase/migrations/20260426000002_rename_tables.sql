-- ─── Rename: deal_stakeholders_v2 → deal_stakeholders ────────────────────────
-- Remove o sufixo de versão que era confuso

alter table if exists public.deal_stakeholders_v2
  rename to deal_stakeholders;

-- Atualizar o índice (recriado automaticamente mas por boa prática)
-- Nota: o índice em deal_id é preservado, apenas o nome da tabela muda

-- ─── Rename: deal_events → deal_audit_log ─────────────────────────────────────
-- "deal_events" era confuso — parece igual a deal_activities mas é um registo de auditoria

alter table if exists public.deal_events
  rename to deal_audit_log;

-- Atualizar o nome do trigger que alimenta esta tabela
drop trigger if exists deal_update_audit on public.deals;

create or replace trigger deal_update_audit
  after update on public.deals
  for each row execute function log_deal_update();

-- ─── Adicionar coluna role a profiles (compatibilidade retroativa) ─────────────
-- A migration phase2 removeu o campo role mas o código ainda depende dele.
-- Adicionamos de volta como campo derivado de is_admin.

alter table public.profiles
  add column if not exists role text
    not null default 'user'
    check (role in ('admin', 'user'));

-- Sincronizar valores existentes
update public.profiles set role = case when is_admin then 'admin' else 'user' end;
