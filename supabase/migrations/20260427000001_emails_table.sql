-- emails table: stores all sent emails from the CRM
create table if not exists public.emails (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  resend_id     text,
  folder        text not null default 'sent',
  from_name     text not null default '',
  from_email    text not null default '',
  to_email      text not null default '',
  subject       text not null default '',
  body          text not null default '',
  labels        text[] not null default '{}',
  read          boolean not null default true,
  reply_to_id   uuid references public.emails(id) on delete set null,
  previous_folder text,
  created_at    timestamptz not null default now()
);

alter table public.emails enable row level security;

create policy "emails: user sees own"
  on public.emails for select
  using (auth.uid() = user_id);

create policy "emails: user inserts own"
  on public.emails for insert
  with check (auth.uid() = user_id);

create policy "emails: user updates own"
  on public.emails for update
  using (auth.uid() = user_id);

create policy "emails: user deletes own"
  on public.emails for delete
  using (auth.uid() = user_id);
