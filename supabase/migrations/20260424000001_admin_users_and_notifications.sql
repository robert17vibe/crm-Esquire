-- ── Admin: User management & Team Notifications ──────────────────────────────

-- 1. Extend profiles with invite/disable support
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS disabled_at  timestamptz,
  ADD COLUMN IF NOT EXISTS invited_at   timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by   uuid REFERENCES profiles(id);

-- 2. Team notifications (admin broadcasts)
CREATE TABLE IF NOT EXISTS team_notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  title       text        NOT NULL,
  body        text,
  type        text        NOT NULL DEFAULT 'info'
                          CHECK (type IN ('info', 'warning', 'urgent', 'announcement')),
  team_id     uuid        REFERENCES teams(id) ON DELETE CASCADE,  -- NULL = all teams
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  archived_at timestamptz
);

-- 3. Track per-user reads
CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id uuid REFERENCES team_notifications(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(id)            ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

-- 4. RLS
ALTER TABLE team_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads  ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read non-archived notifications for their team (or global)
CREATE POLICY "notifications_select" ON team_notifications
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND archived_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND (team_id IS NULL OR team_id = (SELECT team_id FROM profiles WHERE id = auth.uid()))
  );

-- Only admins can insert/update/delete notifications
CREATE POLICY "notifications_admin_write" ON team_notifications
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Users can insert their own reads
CREATE POLICY "reads_insert" ON notification_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only see their own reads
CREATE POLICY "reads_select" ON notification_reads
  FOR SELECT USING (user_id = auth.uid());

-- 5. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE team_notifications;
