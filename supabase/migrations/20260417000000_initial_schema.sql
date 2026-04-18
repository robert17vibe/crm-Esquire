-- ─── Deals ───────────────────────────────────────────────────────────────────

create table if not exists deals (
  id                uuid primary key default gen_random_uuid(),
  company_id        text,

  title             text not null,
  stage_id          text not null,
  value             numeric(15,2) not null default 0,
  currency          text not null default 'BRL',
  probability       integer not null default 10,
  days_in_stage     integer not null default 0,
  expected_close    date,
  notes             text,
  tags              text[],
  loss_reason       text,

  owner_id          text not null,
  owner             jsonb not null,
  stakeholders      jsonb,

  next_activity     jsonb,
  last_activity_at  date,

  contact_name      text,
  contact_title     text,
  contact_email     text,
  contact_phone     text,
  contact_linkedin  text,

  company_name      text not null,
  company_website   text,
  company_sector    text,
  company_size      text,
  company_arr_range text,

  lead_source       text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger deals_updated_at
  before update on deals
  for each row execute function set_updated_at();

-- ─── Deal Activities ──────────────────────────────────────────────────────────

create table if not exists deal_activities (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references deals(id) on delete cascade,
  type       text not null check (type in ('call','email','meeting','task','note')),
  subject    text not null,
  body       text,
  owner      jsonb not null,
  meeting_id uuid,
  created_at timestamptz not null default now()
);

create index on deal_activities(deal_id);

-- ─── Deal Meetings ────────────────────────────────────────────────────────────

create table if not exists deal_meetings (
  id                 uuid primary key default gen_random_uuid(),
  deal_id            uuid not null references deals(id) on delete cascade,
  title              text not null,
  scheduled_at       timestamptz not null,
  duration_minutes   integer not null default 60,
  attendees          text[],
  plaud_note_id      text,
  transcript_excerpt text,
  ai_summary         text,
  key_points         text[],
  action_items       text[],
  owner              jsonb not null,
  created_at         timestamptz not null default now()
);

create index on deal_meetings(deal_id);

-- ─── RLS — acesso apenas para usuários autenticados ───────────────────────────

alter table deals           enable row level security;
alter table deal_activities enable row level security;
alter table deal_meetings   enable row level security;

create policy "auth" on deals           for all using (auth.role() = 'authenticated');
create policy "auth" on deal_activities for all using (auth.role() = 'authenticated');
create policy "auth" on deal_meetings   for all using (auth.role() = 'authenticated');
