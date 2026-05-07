-- ─────────────────────────────────────────────────────────────
-- Fix + extensões pós-venda
-- 1. Corrige bug jsonb ->> numeric no trigger handle_deal_closed_won
-- 2. Adiciona delivery_status + signing_status à tabela contracts
-- 3. Tabela payment_events (outbox para API externa futura)
-- 4. Trigger que regista evento quando payment.status → 'paid'
-- ─────────────────────────────────────────────────────────────

-- ── 1. Colunas em falta na tabela contracts ────────────────────

alter table public.contracts
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending','in_progress','delivered','cancelled')),
  add column if not exists delivery_notes  text,
  add column if not exists signing_status  text not null default 'unsigned'
    check (signing_status in ('unsigned','pending_signature','signed'));

-- Sincronizar signing_status com signed_at existentes
update public.contracts set signing_status = 'signed' where signed_at is not null;

-- ── 2. Corrigir trigger handle_deal_closed_won (jsonb bug) ─────

create or replace function public.handle_deal_closed_won()
returns trigger language plpgsql security definer as $$
declare
  v_proposal      record;
  v_contract_id   uuid;
  v_value         numeric(12,2);
  v_installments  int := 1;
  v_start         date := current_date;
  v_proposal_id   uuid;
begin
  -- só actua quando deal passa para closed_won
  if new.stage_id <> 'closed_won' or old.stage_id = 'closed_won' then
    return new;
  end if;

  -- já tem contrato? não duplicar
  if exists (select 1 from public.contracts where deal_id = new.id) then
    return new;
  end if;

  -- buscar a proposta aceite (ou a mais recente)
  -- FIX: usar (l->>'campo')::numeric em vez de l->>'campo'::text::numeric
  select
    p.id as proposal_id,
    p.discount_pct,
    coalesce(
      (
        select sum((l->>'qty')::numeric * (l->>'unit_price')::numeric)
        from jsonb_array_elements(p.lines::jsonb) as l
        where (l->>'qty') is not null and (l->>'unit_price') is not null
      ),
      0
    ) as sub_total
  into v_proposal
  from public.proposals p
  where p.deal_id = new.id
  order by (p.status = 'accepted') desc, p.created_at desc
  limit 1;

  if found then
    v_value       := v_proposal.sub_total * (1 - coalesce(v_proposal.discount_pct, 0) / 100.0);
    v_proposal_id := v_proposal.proposal_id;
  else
    v_value       := coalesce(new.value, 0);
    v_proposal_id := null;
  end if;

  -- criar contrato com delivery_status e signing_status defaults
  insert into public.contracts (
    deal_id, proposal_id, owner_id,
    value, installments, frequency,
    signed_at, start_date, status,
    delivery_status, signing_status
  )
  values (
    new.id,
    v_proposal_id,
    new.owner_id,
    v_value,
    v_installments,
    'one_time',
    null,       -- não assinar automaticamente
    v_start,
    'active',
    'pending',
    'unsigned'
  )
  returning id into v_contract_id;

  -- criar parcela única por defeito (vencimento em 7 dias)
  insert into public.payments (contract_id, deal_id, owner_id, installment_no, amount, due_date, status)
  values (v_contract_id, new.id, new.owner_id, 1, v_value, v_start + interval '7 days', 'pending');

  return new;
end;
$$;

-- Recriar o trigger (sem drop/create para evitar race)
drop trigger if exists on_deal_closed_won on public.deals;
create trigger on_deal_closed_won
  after update on public.deals
  for each row execute function public.handle_deal_closed_won();

-- ── 3. Tabela payment_events (outbox para API futura) ──────────
-- Cada linha representa um evento que uma API externa pode consumir.
-- O frontend/store já faz useWebhookStore.fire() — esta tabela é a
-- camada de persistência para integração futura (Asaas, Omie, etc.).

create table if not exists public.payment_events (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid references public.payments(id) on delete cascade,
  contract_id  uuid references public.contracts(id) on delete cascade,
  deal_id      uuid references public.deals(id) on delete cascade,
  event_type   text not null,   -- 'payment.received' | 'contract.signed' | 'delivery.updated'
  payload      jsonb not null default '{}',
  status       text not null default 'pending'
    check (status in ('pending','processing','done','failed')),
  processed_at timestamptz,
  error_msg    text,
  created_at   timestamptz not null default now()
);

alter table public.payment_events enable row level security;

create policy "payment_events_select" on public.payment_events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
    or exists (
      select 1 from public.payments p
      where p.id = payment_events.payment_id and p.owner_id = auth.uid()
    )
  );

-- Apenas funções security definer inserem — não exposto directamente ao client
create policy "payment_events_insert" on public.payment_events
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── 4. Trigger: regista payment_events quando parcela é paga ───

create or replace function public.handle_payment_paid()
returns trigger language plpgsql security definer as $$
begin
  -- só actua quando status muda para 'paid'
  if new.status <> 'paid' or old.status = 'paid' then
    return new;
  end if;

  insert into public.payment_events (
    payment_id, contract_id, deal_id,
    event_type, payload, status
  )
  values (
    new.id,
    new.contract_id,
    new.deal_id,
    'payment.received',
    jsonb_build_object(
      'payment_id',     new.id,
      'contract_id',    new.contract_id,
      'deal_id',        new.deal_id,
      'installment_no', new.installment_no,
      'amount',         new.amount,
      'method',         new.method,
      'reference',      new.reference,
      'paid_at',        new.paid_at,
      'owner_id',       new.owner_id
    ),
    'pending'
  );

  return new;
end;
$$;

drop trigger if exists on_payment_paid on public.payments;
create trigger on_payment_paid
  after update on public.payments
  for each row execute function public.handle_payment_paid();

-- ── 5. Trigger: regista evento quando contrato é assinado ──────

create or replace function public.handle_contract_signed()
returns trigger language plpgsql security definer as $$
begin
  -- signed_at passou de null para preenchido
  if new.signed_at is null or old.signed_at is not null then
    return new;
  end if;

  -- sincronizar signing_status
  new.signing_status := 'signed';

  insert into public.payment_events (
    contract_id, deal_id,
    event_type, payload, status
  )
  values (
    new.id,
    new.deal_id,
    'contract.signed',
    jsonb_build_object(
      'contract_id', new.id,
      'deal_id',     new.deal_id,
      'signed_at',   new.signed_at,
      'value',       new.value,
      'owner_id',    new.owner_id
    ),
    'pending'
  );

  return new;
end;
$$;

drop trigger if exists on_contract_signed on public.contracts;
create trigger on_contract_signed
  before update on public.contracts
  for each row execute function public.handle_contract_signed();

-- ── 6. Trigger: regista evento quando entrega muda ─────────────

create or replace function public.handle_delivery_updated()
returns trigger language plpgsql security definer as $$
begin
  if new.delivery_status = old.delivery_status then
    return new;
  end if;

  insert into public.payment_events (
    contract_id, deal_id,
    event_type, payload, status
  )
  values (
    new.id,
    new.deal_id,
    'delivery.updated',
    jsonb_build_object(
      'contract_id',     new.id,
      'deal_id',         new.deal_id,
      'delivery_status', new.delivery_status,
      'delivery_notes',  new.delivery_notes,
      'owner_id',        new.owner_id
    ),
    'pending'
  );

  return new;
end;
$$;

drop trigger if exists on_delivery_updated on public.contracts;
create trigger on_delivery_updated
  after update on public.contracts
  for each row execute function public.handle_delivery_updated();

-- ── 7. Índices ────────────────────────────────────────────────

create index if not exists idx_payment_events_status      on public.payment_events(status);
create index if not exists idx_payment_events_event_type  on public.payment_events(event_type);
create index if not exists idx_payment_events_deal_id     on public.payment_events(deal_id);
create index if not exists idx_payment_events_payment_id  on public.payment_events(payment_id);
create index if not exists idx_contracts_delivery_status  on public.contracts(delivery_status);
create index if not exists idx_contracts_signing_status   on public.contracts(signing_status);
