-- ─────────────────────────────────────────────────────────────
-- Sprint 1: Contratos + Pagamentos
-- ─────────────────────────────────────────────────────────────

-- ── 1. contracts ──────────────────────────────────────────────
create table if not exists public.contracts (
  id              uuid primary key default gen_random_uuid(),
  deal_id         uuid not null references public.deals(id) on delete cascade,
  proposal_id     uuid references public.proposals(id) on delete set null,
  owner_id        uuid references auth.users(id) on delete set null,

  value           numeric(12,2) not null default 0,
  installments    int not null default 1,        -- número de parcelas
  frequency       text not null default 'monthly' check (frequency in ('one_time','monthly','quarterly','yearly')),

  signed_at       date,
  start_date      date,
  end_date        date,
  status          text not null default 'active' check (status in ('draft','active','paused','cancelled','completed')),
  contract_url    text,

  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.contracts enable row level security;

create policy "contracts_select" on public.contracts
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

create policy "contracts_insert" on public.contracts
  for insert with check (auth.uid() = owner_id or exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "contracts_update" on public.contracts
  for update using (
    auth.uid() = owner_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "contracts_delete" on public.contracts
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── 2. payments ───────────────────────────────────────────────
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  contract_id     uuid not null references public.contracts(id) on delete cascade,
  deal_id         uuid not null references public.deals(id) on delete cascade,
  owner_id        uuid references auth.users(id) on delete set null,

  installment_no  int not null default 1,        -- número da parcela (1-based)
  amount          numeric(12,2) not null default 0,
  due_date        date not null,
  paid_at         timestamptz,
  status          text not null default 'pending' check (status in ('pending','paid','overdue','cancelled','refunded')),
  method          text,                           -- pix, transferência, boleto, cartão...
  reference       text,                           -- referência externa / nº comprovante
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments_select" on public.payments
  for select using (
    auth.uid() = owner_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "payments_insert" on public.payments
  for insert with check (
    auth.uid() = owner_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "payments_update" on public.payments
  for update using (
    auth.uid() = owner_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "payments_delete" on public.payments
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── 3. updated_at triggers ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ── 4. auto-mark overdue payments (called via cron or on select) ──
create or replace function public.sync_overdue_payments()
returns void language plpgsql security definer as $$
begin
  update public.payments
  set status = 'overdue'
  where status = 'pending'
    and due_date < current_date;
end;
$$;

-- ── 5. auto-create contract + installments on closed_won ──────
create or replace function public.handle_deal_closed_won()
returns trigger language plpgsql security definer as $$
declare
  v_proposal      record;
  v_contract_id   uuid;
  v_value         numeric(12,2);
  v_installments  int := 1;
  v_start         date := current_date;
  i               int;
  v_due           date;
begin
  -- só actua quando deal passa para closed_won
  if new.stage_id <> 'closed_won' or old.stage_id = 'closed_won' then
    return new;
  end if;

  -- já tem contrato? não duplicar
  if exists (select 1 from public.contracts where deal_id = new.id) then
    return new;
  end if;

  -- tentar buscar a proposta aceite (ou a mais recente)
  select p.id, p.discount_pct,
         coalesce(
           (select sum(l->>'qty'::text::numeric * (l->>'unit_price')::numeric)
            from jsonb_array_elements(p.lines::jsonb) l),
           0
         ) as sub_total
  into v_proposal
  from public.proposals p
  where p.deal_id = new.id
  order by (p.status = 'accepted') desc, p.created_at desc
  limit 1;

  if found then
    v_value := v_proposal.sub_total * (1 - coalesce(v_proposal.discount_pct, 0) / 100.0);
  else
    v_value := 0;
  end if;

  -- criar contrato
  insert into public.contracts (deal_id, proposal_id, owner_id, value, installments, frequency, signed_at, start_date, status)
  values (
    new.id,
    case when found then v_proposal.id else null end,
    new.owner_id,
    v_value,
    v_installments,
    'one_time',
    current_date,
    v_start,
    'active'
  )
  returning id into v_contract_id;

  -- criar parcela única por defeito
  insert into public.payments (contract_id, deal_id, owner_id, installment_no, amount, due_date, status)
  values (v_contract_id, new.id, new.owner_id, 1, v_value, v_start + interval '7 days', 'pending');

  return new;
end;
$$;

drop trigger if exists on_deal_closed_won on public.deals;
create trigger on_deal_closed_won
  after update on public.deals
  for each row execute function public.handle_deal_closed_won();

-- ── 6. SQL views para KPIs ────────────────────────────────────

-- MRR: soma de contratos activos mensais (normalizado)
create or replace view public.v_mrr as
select
  owner_id,
  sum(
    case frequency
      when 'monthly'   then value
      when 'quarterly' then value / 3.0
      when 'yearly'    then value / 12.0
      when 'one_time'  then 0
      else 0
    end
  ) as mrr
from public.contracts
where status = 'active'
group by owner_id;

-- ARR
create or replace view public.v_arr as
select owner_id, mrr * 12 as arr
from public.v_mrr;

-- Pagamentos a receber (próximos 30 dias)
create or replace view public.v_receivable as
select
  p.owner_id,
  count(*) filter (where p.status = 'pending' and p.due_date >= current_date and p.due_date <= current_date + 30) as due_30d_count,
  coalesce(sum(p.amount) filter (where p.status = 'pending' and p.due_date >= current_date and p.due_date <= current_date + 30), 0) as due_30d_amount,
  count(*) filter (where p.status = 'overdue') as overdue_count,
  coalesce(sum(p.amount) filter (where p.status = 'overdue'), 0) as overdue_amount,
  coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as collected_total
from public.payments p
group by p.owner_id;

-- Taxa de cobrança (paid / (paid + overdue))
create or replace view public.v_collection_rate as
select
  owner_id,
  case
    when (paid_total + overdue_total) = 0 then null
    else round(paid_total * 100.0 / (paid_total + overdue_total), 1)
  end as collection_rate_pct
from (
  select
    owner_id,
    coalesce(sum(amount) filter (where status = 'paid'), 0) as paid_total,
    coalesce(sum(amount) filter (where status = 'overdue'), 0) as overdue_total
  from public.payments
  group by owner_id
) t;

-- ── 7. índices ────────────────────────────────────────────────
create index if not exists idx_contracts_deal_id    on public.contracts(deal_id);
create index if not exists idx_contracts_owner_id   on public.contracts(owner_id);
create index if not exists idx_contracts_status     on public.contracts(status);
create index if not exists idx_payments_contract_id on public.payments(contract_id);
create index if not exists idx_payments_deal_id     on public.payments(deal_id);
create index if not exists idx_payments_owner_id    on public.payments(owner_id);
create index if not exists idx_payments_due_date    on public.payments(due_date);
create index if not exists idx_payments_status      on public.payments(status);
