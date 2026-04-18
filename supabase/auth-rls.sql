-- Substituir políticas públicas por políticas autenticadas

-- Deals
drop policy if exists "public read deals"  on deals;
drop policy if exists "public write deals" on deals;
create policy "auth" on deals for all using (auth.role() = 'authenticated');

-- Activities
drop policy if exists "public read activities"  on deal_activities;
drop policy if exists "public write activities" on deal_activities;
create policy "auth" on deal_activities for all using (auth.role() = 'authenticated');

-- Meetings
drop policy if exists "public read meetings"  on deal_meetings;
drop policy if exists "public write meetings" on deal_meetings;
create policy "auth" on deal_meetings for all using (auth.role() = 'authenticated');
