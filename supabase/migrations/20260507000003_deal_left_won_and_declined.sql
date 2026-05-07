-- ─────────────────────────────────────────────────────────────
-- Quando deal sai de closed_won:
--   • Cancela parcelas pendentes
--   • Coloca contrato em 'paused' com paused_at = now()
--   • Após 3 dias sem retorno → mostramos como "Declinado"
-- ─────────────────────────────────────────────────────────────

-- Coluna que regista quando o contrato foi pausado
alter table public.contracts
  add column if not exists paused_at timestamptz;

-- Trigger function
create or replace function public.handle_deal_left_won()
returns trigger language plpgsql security definer as $$
begin
  -- só actua quando sai de closed_won para outro stage
  if old.stage_id <> 'closed_won' or new.stage_id = 'closed_won' then
    return new;
  end if;

  -- pausar contratos activos deste deal
  update public.contracts
  set status    = 'paused',
      paused_at = now()
  where deal_id = old.id
    and status  = 'active';

  -- cancelar parcelas pendentes/vencidas
  update public.payments
  set status = 'cancelled'
  where deal_id = old.id
    and status in ('pending', 'overdue');

  return new;
end;
$$;

drop trigger if exists on_deal_left_won on public.deals;
create trigger on_deal_left_won
  after update on public.deals
  for each row execute function public.handle_deal_left_won();

-- Se o deal VOLTAR para closed_won dentro de 3 dias → reactivar contrato
create or replace function public.handle_deal_closed_won_reactivate()
returns trigger language plpgsql security definer as $$
declare
  v_contract record;
begin
  -- só actua quando volta para closed_won
  if new.stage_id <> 'closed_won' or old.stage_id = 'closed_won' then
    return new;
  end if;

  -- verificar se já existe contrato pausado dentro dos 3 dias
  select * into v_contract
  from public.contracts
  where deal_id = new.id
    and status  = 'paused'
    and paused_at > now() - interval '3 days'
  limit 1;

  if found then
    -- reactivar contrato e parcelas
    update public.contracts
    set status    = 'active',
        paused_at = null
    where id = v_contract.id;

    update public.payments
    set status = 'pending'
    where contract_id = v_contract.id
      and status = 'cancelled';

    -- não cria novo contrato — já existe
    return new;
  end if;

  -- se não encontrou contrato válido → o trigger handle_deal_closed_won cria um novo
  return new;
end;
$$;

drop trigger if exists on_deal_closed_won_reactivate on public.deals;
create trigger on_deal_closed_won_reactivate
  before update on public.deals
  for each row execute function public.handle_deal_closed_won_reactivate();

-- View auxiliar: contratos declinados (pausados há mais de 3 dias)
create or replace view public.v_declined_contracts as
select c.*, d.company_name, d.contact_name, d.title as deal_title
from public.contracts c
join public.deals d on d.id = c.deal_id
where c.status = 'paused'
  and c.paused_at < now() - interval '3 days';

-- índice
create index if not exists idx_contracts_paused_at on public.contracts(paused_at);
