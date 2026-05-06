-- Propostas comerciais por deal (migra dados do localStorage esq_proposals_v4_{id})

create table if not exists proposals (
  id            uuid        primary key default gen_random_uuid(),
  deal_id       uuid        not null references deals(id) on delete cascade,
  title         text        not null default '',
  intro         text        not null default '',
  scope         text        not null default '',
  validity      text        not null default '',
  payment       text        not null default '',
  terms         text        not null default '',
  lines         jsonb       not null default '[]',
  discount_pct  numeric     not null default 0,
  installments  integer     not null default 1,
  status        text        not null default 'sent'
                check (status in ('draft', 'sent', 'accepted', 'rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists proposals_deal_id_idx on proposals(deal_id, created_at desc);

alter table proposals enable row level security;

create policy "proposals_select"
  on proposals for select
  using (auth.uid() is not null);

create policy "proposals_insert"
  on proposals for insert
  with check (auth.uid() is not null);

create policy "proposals_update"
  on proposals for update
  using (auth.uid() is not null);

create policy "proposals_delete"
  on proposals for delete
  using (auth.uid() is not null);

create trigger proposals_updated_at
  before update on proposals
  for each row execute function public.set_updated_at();
