-- ═══════════════════════════════════════════════════════════════════
-- Fix crítico: fluxo de re-contrato após declínio
--
-- Problema: handle_deal_closed_won verificava se QUALQUER contrato
-- existia para o deal — mesmo paused/cancelled — e parava.
-- Resultado: deal que voltava a closed_won após declínio ficava
-- sem contrato activo e desaparecia da Cobrança.
--
-- Solução: verificar apenas contratos ACTIVE. Contratos paused são
-- histórico de declínio — o trigger cria um novo contrato a partir
-- da proposta mais recente (não-rejeitada).
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. handle_deal_left_won (AFTER trigger) ──────────────────────
-- Quando deal sai de closed_won: pausa contrato, cancela parcelas
-- e reseta a proposta ligada de 'accepted' → 'sent'.
-- Isto garante que a proposta velha não tem prioridade se o deal
-- criar uma nova proposta e voltar a closed_won.

create or replace function public.handle_deal_left_won()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_contract record;
begin
  -- só actua quando sai de closed_won para outro stage
  if old.stage_id <> 'closed_won' or new.stage_id = 'closed_won' then
    return new;
  end if;

  -- buscar o contrato activo para guardar o proposal_id
  select * into v_contract
  from public.contracts
  where deal_id = old.id
    and status  = 'active'
  limit 1;

  -- pausar contrato activo
  update public.contracts
  set status    = 'paused',
      paused_at = now()
  where deal_id = old.id
    and status  = 'active';

  -- cancelar parcelas pendentes/vencidas
  update public.payments
  set status = 'cancelled'
  where deal_id = old.id
    and status  in ('pending', 'overdue');

  -- resetar proposta ligada ao contrato de 'accepted' → 'sent'
  -- para que, numa nova negociação, a proposta mais recente tenha prioridade
  if found and v_contract.proposal_id is not null then
    update public.proposals
    set status = 'sent'
    where id     = v_contract.proposal_id
      and status = 'accepted';
  end if;

  return new;
end;
$$;

drop trigger if exists on_deal_left_won on public.deals;
create trigger on_deal_left_won
  after update on public.deals
  for each row execute function public.handle_deal_left_won();


-- ── 3. handle_deal_closed_won (AFTER trigger) ─────────────────────
-- Cria contrato + parcelas quando deal passa para closed_won.
-- Fix: só para se já existe contrato ACTIVE (não paused/cancelled).

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
  -- só actua quando deal passa para closed_won
  if new.stage_id <> 'closed_won' or old.stage_id = 'closed_won' then
    return new;
  end if;

  -- parar apenas se já existe contrato ACTIVE
  -- (paused = declinado → pode criar novo)
  if exists (
    select 1 from public.contracts
    where deal_id = new.id
      and status  = 'active'
  ) then
    return new;
  end if;

  -- buscar proposta mais recente não-rejeitada
  -- (accepted tem prioridade; depois a mais nova)
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
    and p.status  <> 'rejected'
  order by (p.status = 'accepted') desc, p.created_at desc
  limit 1;

  if found then
    v_value        := v_proposal.sub_total * (1 - coalesce(v_proposal.discount_pct, 0) / 100.0);
    v_installments := greatest(coalesce(v_proposal.installments, 1), 1);
    -- marcar proposta como aceite automaticamente
    update public.proposals
    set status = 'accepted'
    where id = v_proposal.id
      and status <> 'accepted';
  else
    v_value        := coalesce(new.value, 0);
    v_installments := 1;
  end if;

  v_freq        := case when v_installments > 1 then 'monthly' else 'one_time' end;
  v_amount_each := round(v_value / v_installments, 2);

  -- criar contrato
  insert into public.contracts
    (deal_id, proposal_id, owner_id, value, installments, frequency,
     start_date, status, delivery_status, signing_status)
  values
    (new.id,
     case when found then v_proposal.id else null end,
     new.owner_id::uuid,
     v_value,
     v_installments,
     v_freq,
     v_start,
     'active',
     'pending',
     'unsigned')
  returning id into v_contract_id;

  -- gerar parcelas: 1ª vence em 7 dias, restantes a cada 30 dias
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


-- ── 4. handle_deal_closed_won_reactivate (BEFORE trigger) ─────────
-- Quando deal volta a closed_won dentro de 3 dias: reactiva o
-- contrato pausado em vez de criar um novo (reversão rápida).
-- Se já existe contrato active (ou já passou os 3 dias), não faz nada
-- e deixa o AFTER trigger handle_deal_closed_won criar um novo.

create or replace function public.handle_deal_closed_won_reactivate()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_contract record;
begin
  -- só actua quando deal passa para closed_won
  if new.stage_id <> 'closed_won' or old.stage_id = 'closed_won' then
    return new;
  end if;

  -- se já existe contrato active, não fazer nada
  if exists (
    select 1 from public.contracts
    where deal_id = new.id
      and status  = 'active'
  ) then
    return new;
  end if;

  -- procurar contrato pausado há menos de 3 dias (saiu por engano)
  select * into v_contract
  from public.contracts
  where deal_id  = new.id
    and status   = 'paused'
    and paused_at > now() - interval '3 days'
  order by paused_at desc
  limit 1;

  if found then
    -- reactivar contrato
    update public.contracts
    set status    = 'active',
        paused_at = null
    where id = v_contract.id;

    -- reactivar parcelas canceladas
    update public.payments
    set status = 'pending'
    where contract_id = v_contract.id
      and status      = 'cancelled';

    -- o AFTER trigger vai encontrar status='active' e não criar novo
  end if;

  return new;
end;
$$;

drop trigger if exists on_deal_closed_won_reactivate on public.deals;
create trigger on_deal_closed_won_reactivate
  before update on public.deals
  for each row execute function public.handle_deal_closed_won_reactivate();
