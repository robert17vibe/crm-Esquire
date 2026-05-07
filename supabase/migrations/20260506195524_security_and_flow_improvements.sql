-- ═══════════════════════════════════════════════════════════════════
-- Segurança + Fluxo completo: Kanban → Proposta → Cobrança → Renovação
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. SEGURANÇA: set_updated_at com search_path explícito ────────
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 2. SEGURANÇA: sync_overdue_payments com search_path ───────────
create or replace function public.sync_overdue_payments()
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  update public.payments
  set status = 'overdue'
  where status = 'pending'
    and due_date < current_date;
end;
$$;

-- ── 3. TRIGGER MELHORADO: handle_deal_closed_won ──────────────────
-- Gera N parcelas reais a partir da proposta (installments do formulário)
create or replace function public.handle_deal_closed_won()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_proposal     record;
  v_contract_id  uuid;
  v_value        numeric(12,2);
  v_installments int;
  v_freq         text;
  v_start        date := current_date;
  v_amount_each  numeric(12,2);
  v_due          date;
  i              int;
begin
  if new.stage_id <> 'closed_won' or old.stage_id = 'closed_won' then
    return new;
  end if;

  if exists (select 1 from public.contracts where deal_id = new.id) then
    return new;
  end if;

  select
    p.id,
    p.discount_pct,
    p.installments,
    coalesce(
      (select sum((l->>'qty')::numeric * (l->>'unit_price')::numeric)
       from jsonb_array_elements(p.lines::jsonb) l),
      0
    ) as sub_total
  into v_proposal
  from public.proposals p
  where p.deal_id = new.id
  order by (p.status = 'accepted') desc, p.created_at desc
  limit 1;

  if found then
    v_value        := v_proposal.sub_total * (1 - coalesce(v_proposal.discount_pct, 0) / 100.0);
    v_installments := greatest(coalesce(v_proposal.installments, 1), 1);
  else
    v_value        := coalesce(new.value, 0);
    v_installments := 1;
  end if;

  v_freq        := case when v_installments > 1 then 'monthly' else 'one_time' end;
  v_amount_each := round(v_value / v_installments, 2);

  insert into public.contracts
    (deal_id, proposal_id, owner_id, value, installments, frequency, start_date, status)
  values
    (new.id,
     case when found then v_proposal.id else null end,
     new.owner_id::uuid,
     v_value,
     v_installments,
     v_freq,
     v_start,
     'active')
  returning id into v_contract_id;

  -- N parcelas: 1ª vence em 7 dias, restantes a cada 30 dias
  for i in 1..v_installments loop
    v_due := v_start + (7 + (i - 1) * 30) * interval '1 day';
    insert into public.payments
      (contract_id, deal_id, owner_id, installment_no, amount, due_date, status)
    values
      (v_contract_id, new.id, new.owner_id::uuid, i, v_amount_each, v_due, 'pending');
  end loop;

  return new;
end;
$$;

drop trigger if exists on_deal_closed_won on public.deals;
create trigger on_deal_closed_won
  after update on public.deals
  for each row execute function public.handle_deal_closed_won();

-- ── 4. TRIGGER: auto-completar contrato quando todas as parcelas pagas ──
create or replace function public.handle_payment_paid()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_total int;
  v_paid  int;
begin
  if new.status <> 'paid' or old.status = 'paid' then
    return new;
  end if;

  select
    count(*),
    count(*) filter (where status = 'paid')
  into v_total, v_paid
  from public.payments
  where contract_id = new.contract_id;

  if v_total > 0 and v_total = v_paid then
    update public.contracts
    set status = 'completed'
    where id = new.contract_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_payment_paid on public.payments;
create trigger on_payment_paid
  after update on public.payments
  for each row execute function public.handle_payment_paid();

-- ── 5. signed_at como timestamptz (conversão se necessário) ───────
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contracts'
      and column_name = 'signed_at' and data_type = 'date'
  ) then
    alter table public.contracts
      alter column signed_at type timestamptz using signed_at::timestamptz;
  end if;
end $$;

-- ── 6. delivery_status nos contratos (rastreio de entrega) ────────
alter table public.contracts
  add column if not exists delivery_status text
    not null default 'pending'
    check (delivery_status in ('pending','in_progress','delivered','cancelled'));

alter table public.contracts
  add column if not exists delivery_notes text;

-- ── 7. SEGURANÇA: views com security_invoker (Postgres 15+) ───────
create or replace view public.v_mrr with (security_invoker = true) as
select
  owner_id,
  sum(case frequency
    when 'monthly'   then value
    when 'quarterly' then value / 3.0
    when 'yearly'    then value / 12.0
    else 0
  end) as mrr
from public.contracts
where status = 'active'
group by owner_id;

create or replace view public.v_arr with (security_invoker = true) as
select owner_id, mrr * 12 as arr from public.v_mrr;

create or replace view public.v_receivable with (security_invoker = true) as
select
  p.owner_id,
  count(*) filter (where p.status = 'pending' and p.due_date >= current_date and p.due_date <= current_date + 30) as due_30d_count,
  coalesce(sum(p.amount) filter (where p.status = 'pending' and p.due_date >= current_date and p.due_date <= current_date + 30), 0) as due_30d_amount,
  count(*) filter (where p.status = 'overdue') as overdue_count,
  coalesce(sum(p.amount) filter (where p.status = 'overdue'), 0) as overdue_amount,
  coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as collected_total
from public.payments p
group by p.owner_id;

create or replace view public.v_collection_rate with (security_invoker = true) as
select
  owner_id,
  case when (paid_total + overdue_total) = 0 then null
    else round(paid_total * 100.0 / (paid_total + overdue_total), 1)
  end as collection_rate_pct
from (
  select owner_id,
    coalesce(sum(amount) filter (where status = 'paid'), 0) as paid_total,
    coalesce(sum(amount) filter (where status = 'overdue'), 0) as overdue_total
  from public.payments group by owner_id
) t;

-- ── 8. RLS contratos — visíveis para owner do deal ────────────────
drop policy if exists "contracts_select_deal_owner" on public.contracts;
create policy "contracts_select_deal_owner" on public.contracts
  for select using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id and d.owner_id::uuid = auth.uid()
    )
    or exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- ── 9. Índices para performance ───────────────────────────────────
create index if not exists idx_contracts_status          on public.contracts(status);
create index if not exists idx_contracts_delivery_status on public.contracts(delivery_status);
create index if not exists idx_payments_contract_status  on public.payments(contract_id, status);
