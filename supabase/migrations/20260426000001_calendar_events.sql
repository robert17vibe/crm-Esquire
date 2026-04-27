-- ─── Calendar Events ──────────────────────────────────────────────────────────
-- Tabela para eventos do calendário criados manualmente pelos utilizadores

create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  event_date  date not null,
  start_time  time,
  end_time    time,
  event_type  text not null default 'meeting'
              check (event_type in ('meeting','call','task','reminder')),
  deal_id     uuid references public.deals(id) on delete set null,
  owner_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index on public.calendar_events(event_date);
create index on public.calendar_events(owner_id);

alter table public.calendar_events enable row level security;

-- Utilizador vê apenas os seus próprios eventos
create policy "select own calendar events"
  on public.calendar_events for select
  using (owner_id = auth.uid() or owner_id is null);

create policy "insert own calendar events"
  on public.calendar_events for insert
  with check (true);

create policy "update own calendar events"
  on public.calendar_events for update
  using (owner_id = auth.uid() or owner_id is null);

create policy "delete own calendar events"
  on public.calendar_events for delete
  using (owner_id = auth.uid() or owner_id is null);
