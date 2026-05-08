-- Fix: handle_proposal_inserted deve usar SEMPRE a proposta recém-inserida (new.*)
-- e não re-pesquisar no DB (que dava prioridade à proposta accepted antiga)

create or replace function public.handle_proposal_inserted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_deal         record;
  v_contract_id  uuid;
  v_value        numeric(12,2);
  v_installments int;
  v_freq         text;
  v_amount_each  numeric(12,2);
  v_amount_last  numeric(12,2);
  v_due          date;
  v_start        date := current_date;
  i              int;
begin
  -- Só actua em deals closed_won
  select * into v_deal from public.deals where id = new.deal_id limit 1;
  if not found or v_deal.stage_id <> 'closed_won' then
    return new;
  end if;

  -- Pausar contrato active existente + cancelar parcelas pendentes
  update public.contracts
  set status = 'paused', paused_at = now()
  where deal_id = new.deal_id and status = 'active';

  update public.payments
  set status = 'cancelled'
  where deal_id = new.deal_id and status in ('pending', 'overdue');

  -- Calcular valor directamente da proposta recém-inserida (new.*)
  v_value := coalesce((
    select sum((l->>'qty')::numeric * (l->>'unit_price')::numeric)
    from jsonb_array_elements(new.lines::jsonb) as l
    where (l->>'qty') is not null and (l->>'unit_price') is not null
  ), 0);
  v_value        := round(v_value * (1 - coalesce(new.discount_pct, 0) / 100.0), 2);
  v_installments := greatest(coalesce(new.installments, 1), 1);
  v_freq         := case when v_installments > 1 then 'monthly' else 'one_time' end;
  v_amount_each  := floor(v_value / v_installments * 100) / 100;
  v_amount_last  := round((v_value - v_amount_each * (v_installments - 1)) * 100) / 100;

  -- Inserir novo contrato ligado à proposta recém-inserida
  insert into public.contracts
    (deal_id, proposal_id, owner_id, value, installments, frequency,
     start_date, status, delivery_status, signing_status)
  values
    (new.deal_id, new.id, v_deal.owner_id::uuid,
     v_value, v_installments, v_freq,
     v_start, 'active', 'pending', 'unsigned')
  returning id into v_contract_id;

  -- Marcar proposta como aceite
  update public.proposals set status = 'accepted' where id = new.id;

  -- Inserir parcelas
  for i in 1..v_installments loop
    v_due := v_start + (7 + (i - 1) * 30) * interval '1 day';
    insert into public.payments
      (contract_id, deal_id, owner_id, installment_no, amount, due_date, status)
    values
      (v_contract_id, new.deal_id, v_deal.owner_id::uuid, i,
       case when i = v_installments then v_amount_last else v_amount_each end,
       v_due, 'pending');
  end loop;

  return new;
end;
$$;

-- Recriar trigger (sem alter, para garantir)
drop trigger if exists on_proposal_inserted on public.proposals;
create trigger on_proposal_inserted
  after insert on public.proposals
  for each row execute function public.handle_proposal_inserted();

select 'trigger ok' as status;
