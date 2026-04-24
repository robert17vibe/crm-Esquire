-- Rich stakeholder table (extends existing basic stakeholders array)
create table if not exists public.deal_stakeholders_v2 (
  id                   uuid primary key default gen_random_uuid(),
  deal_id              uuid not null references public.deals(id) on delete cascade,
  name                 text not null,
  title                text,
  company              text,
  email                text,
  role                 text not null check (role in ('economic_buyer','technical_buyer','champion','influencer','blocker','user')),
  influence_level      int  not null default 5 check (influence_level between 1 and 10),
  relationship         text not null default 'unknown' check (relationship in ('strong','moderate','weak','unknown')),
  sentiment            text not null default 'unknown' check (sentiment in ('positive','neutral','negative','unknown')),
  notes                text,
  last_interaction_at  timestamptz,
  avatar_color         text,
  initials             text,
  created_at           timestamptz not null default now()
);

alter table public.deal_stakeholders_v2 enable row level security;

create policy "auth users read deal_stakeholders_v2"
  on public.deal_stakeholders_v2 for select
  using (auth.role() = 'authenticated');

create policy "auth users insert deal_stakeholders_v2"
  on public.deal_stakeholders_v2 for insert
  with check (auth.role() = 'authenticated');

create policy "auth users update deal_stakeholders_v2"
  on public.deal_stakeholders_v2 for update
  using (auth.role() = 'authenticated');

create policy "auth users delete deal_stakeholders_v2"
  on public.deal_stakeholders_v2 for delete
  using (auth.role() = 'authenticated');

create index if not exists deal_stakeholders_v2_deal_id_idx on public.deal_stakeholders_v2(deal_id);
