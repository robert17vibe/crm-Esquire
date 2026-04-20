-- ═══════════════════════════════════════════════════════════════════
-- Fase 2: profiles, RLS ownership, soft delete, last_activity trigger
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. profiles table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    text,
  avatar_color text    DEFAULT '#2c5545',
  is_admin     boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: read authenticated" ON public.profiles;
CREATE POLICY "profiles: read authenticated" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
CREATE POLICY "profiles: update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users
INSERT INTO public.profiles (id, full_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- All current users are internal team → mark as admin
UPDATE public.profiles SET is_admin = true;

-- ── 2. P2.2 — soft delete column ──────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ── 3. is_admin() helper ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

-- ── 4. P2.1 — RLS ownership ───────────────────────────────────────

-- deals
DROP POLICY IF EXISTS "public read deals" ON deals;
DROP POLICY IF EXISTS "public write deals" ON deals;

CREATE POLICY "deals: select" ON deals
  FOR SELECT USING (
    deleted_at IS NULL
    AND (owner_id = auth.uid()::text OR is_admin())
  );

CREATE POLICY "deals: insert" ON deals
  FOR INSERT WITH CHECK (owner_id = auth.uid()::text OR is_admin());

CREATE POLICY "deals: update" ON deals
  FOR UPDATE USING (owner_id = auth.uid()::text OR is_admin());

CREATE POLICY "deals: delete" ON deals
  FOR DELETE USING (owner_id = auth.uid()::text OR is_admin());

-- deal_activities
DROP POLICY IF EXISTS "public read activities" ON deal_activities;
DROP POLICY IF EXISTS "public write activities" ON deal_activities;

CREATE POLICY "activities: select" ON deal_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_id
        AND d.deleted_at IS NULL
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  );

CREATE POLICY "activities: write" ON deal_activities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_id
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_id
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  );

-- deal_meetings
DROP POLICY IF EXISTS "public read meetings" ON deal_meetings;
DROP POLICY IF EXISTS "public write meetings" ON deal_meetings;

CREATE POLICY "meetings: select" ON deal_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_id
        AND d.deleted_at IS NULL
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  );

CREATE POLICY "meetings: write" ON deal_meetings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_id
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_id
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  );

-- ── 5. P2.3 — last_activity_at trigger ────────────────────────────
CREATE OR REPLACE FUNCTION public.update_deal_last_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE deals
  SET last_activity_at = CURRENT_DATE,
      updated_at       = now()
  WHERE id = NEW.deal_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_last_activity ON deal_activities;
CREATE TRIGGER trg_update_last_activity
  AFTER INSERT ON deal_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_deal_last_activity();
