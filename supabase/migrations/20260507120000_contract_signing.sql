-- ─────────────────────────────────────────────────────────────
-- Contract signing: token único por contrato + RPCs públicas
-- ─────────────────────────────────────────────────────────────

-- 1. Adicionar signing_token aos contratos existentes
alter table public.contracts
  add column if not exists signing_token uuid default gen_random_uuid() unique not null;

-- Garantir que contratos já existentes tenham token
update public.contracts
set signing_token = gen_random_uuid()
where signing_token is null;

-- ── 2. RPC pública: obter contrato por token ─────────────────
-- Sem auth — usada pela página pública /assinar/:token
create or replace function public.get_contract_by_token(p_token uuid)
returns json language plpgsql security definer
set search_path = ''
as $$
declare
  v_contract record;
  v_deal     record;
  v_proposal record;
begin
  select c.*
  into v_contract
  from public.contracts c
  where c.signing_token = p_token
  limit 1;

  if not found then
    return json_build_object('error', 'not_found');
  end if;

  select d.id, d.title, d.company_name, d.contact_name, d.contact_email, d.value
  into v_deal
  from public.deals d
  where d.id = v_contract.deal_id
  limit 1;

  if v_contract.proposal_id is not null then
    select p.id, p.lines, p.discount_pct, p.installments, p.notes
    into v_proposal
    from public.proposals p
    where p.id = v_contract.proposal_id
    limit 1;
  end if;

  return json_build_object(
    'contract', row_to_json(v_contract),
    'deal',     row_to_json(v_deal),
    'proposal', row_to_json(v_proposal)
  );
end;
$$;

-- ── 3. RPC pública: assinar contrato por token ───────────────
-- Sem auth — chamada pelo cliente na página pública
create or replace function public.sign_contract_by_token(
  p_token    uuid,
  p_name     text default null,
  p_ip       text default null
)
returns json language plpgsql security definer
set search_path = ''
as $$
declare
  v_contract_id uuid;
begin
  select id into v_contract_id
  from public.contracts
  where signing_token = p_token
    and signing_status <> 'signed'
  limit 1;

  if not found then
    return json_build_object('error', 'not_found_or_already_signed');
  end if;

  update public.contracts
  set signing_status = 'signed',
      signed_at      = now(),
      notes          = coalesce(notes, '') ||
                       case when p_name is not null
                            then E'\nAssinado por: ' || p_name ||
                                 ' em ' || to_char(now(), 'DD/MM/YYYY HH24:MI')
                            else '' end
  where id = v_contract_id;

  return json_build_object('ok', true, 'signed_at', now());
end;
$$;

-- Permissões: anon pode chamar as duas RPCs
grant execute on function public.get_contract_by_token(uuid)       to anon, authenticated;
grant execute on function public.sign_contract_by_token(uuid, text, text) to anon, authenticated;
