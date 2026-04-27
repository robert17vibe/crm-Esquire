-- Fix: admins can see all notifications regardless of team
-- Fix: ensure the first/only user is flagged as admin

DROP POLICY IF EXISTS "notifications_select" ON team_notifications;

CREATE POLICY "notifications_select" ON team_notifications
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND archived_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      is_admin()
      OR team_id IS NULL
      OR team_id = (SELECT team_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Ensure the account robert.sousa@aureatech.io is admin
UPDATE public.profiles
  SET is_admin = true
  WHERE email = 'robert.sousa@aureatech.io';
