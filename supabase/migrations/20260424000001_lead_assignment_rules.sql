create table if not exists public.lead_assignment_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  team_id uuid references public.teams(id) on delete cascade,
  owner_ids jsonb not null default '[]',
  round_robin_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.lead_assignment_rules enable row level security;
create policy "admin manage lead_assignment_rules" on public.lead_assignment_rules
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
