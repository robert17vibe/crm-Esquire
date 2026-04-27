-- ═══════════════════════════════════════════════════════════════
-- APLICAR NO SUPABASE STUDIO → SQL Editor
-- Cria a tabela team_notifications + RLS + fix admin + profiles update policy
-- ═══════════════════════════════════════════════════════════════

-- 1. Colunas extra nos profiles (necessário para criar utilizadores)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS disabled_at  timestamptz,
  ADD COLUMN IF NOT EXISTS invited_at   timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by   uuid REFERENCES profiles(id);

-- 2. Policy para admins poderem actualizar qualquer profile
DROP POLICY IF EXISTS "profiles: admin update all" ON public.profiles;
CREATE POLICY "profiles: admin update all" ON public.profiles
  FOR UPDATE USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

-- 3. Tabela de notificações de equipa
CREATE TABLE IF NOT EXISTS team_notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  title       text        NOT NULL,
  body        text,
  type        text        NOT NULL DEFAULT 'info'
                          CHECK (type IN ('info', 'warning', 'urgent', 'announcement')),
  team_id     uuid        REFERENCES teams(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  archived_at timestamptz
);

-- 4. Tabela de leituras por utilizador
CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id uuid REFERENCES team_notifications(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(id)            ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

-- 5. RLS para notificações
ALTER TABLE team_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select"       ON team_notifications;
DROP POLICY IF EXISTS "notifications_admin_write"  ON team_notifications;
DROP POLICY IF EXISTS "reads_insert"               ON notification_reads;
DROP POLICY IF EXISTS "reads_select"               ON notification_reads;

CREATE POLICY "notifications_select" ON team_notifications
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND archived_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      (SELECT is_admin FROM profiles WHERE id = auth.uid())
      OR team_id IS NULL
      OR team_id = (SELECT team_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "notifications_admin_write" ON team_notifications
  FOR ALL USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  ) WITH CHECK (
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "reads_insert" ON notification_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "reads_select" ON notification_reads
  FOR SELECT USING (user_id = auth.uid());

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE team_notifications;

-- 7. Garantir admin para o utilizador atual (quem está a correr este script)
UPDATE public.profiles
  SET is_admin = true
  WHERE id = auth.uid();
