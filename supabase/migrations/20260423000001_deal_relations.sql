create table if not exists public.deal_relations (
  id              uuid primary key default gen_random_uuid(),
  deal_id         uuid not null references public.deals(id) on delete cascade,
  related_deal_id uuid not null references public.deals(id) on delete cascade,
  relation_type   text not null check (relation_type in ('upsell','renewal','subsidiary','duplicate','referral')),
  created_at      timestamptz not null default now(),
  constraint no_self_relation check (deal_id <> related_deal_id),
  constraint unique_pair unique (deal_id, related_deal_id)
);

alter table public.deal_relations enable row level security;

create policy "auth users can read deal_relations"
  on public.deal_relations for select
  using (auth.role() = 'authenticated');

create policy "auth users can insert deal_relations"
  on public.deal_relations for insert
  with check (auth.role() = 'authenticated');

create policy "auth users can delete deal_relations"
  on public.deal_relations for delete
  using (auth.role() = 'authenticated');

create index if not exists deal_relations_deal_id_idx         on public.deal_relations(deal_id);
create index if not exists deal_relations_related_deal_id_idx on public.deal_relations(related_deal_id);
