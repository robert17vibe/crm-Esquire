-- Remove políticas demasiado permissivas criadas no schema inicial.
-- A policy "auth" FOR ALL USING (auth.role() = 'authenticated') sobrepõe-se
-- às políticas de ownership/team/soft-delete porque as policies são combinadas
-- com OR — a mais permissiva vence.

-- ── deals ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth" ON public.deals;

-- Garantir que as políticas correctas existem (idempotente)
DROP POLICY IF EXISTS "deals: select" ON public.deals;
CREATE POLICY "deals: select" ON public.deals
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      owner_id = auth.uid()::text
      OR is_admin()
      OR (
        team_id IS NOT NULL
        AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "deals: insert" ON public.deals;
CREATE POLICY "deals: insert" ON public.deals
  FOR INSERT WITH CHECK (owner_id = auth.uid()::text OR is_admin());

DROP POLICY IF EXISTS "deals: update" ON public.deals;
CREATE POLICY "deals: update" ON public.deals
  FOR UPDATE USING (
    deleted_at IS NULL
    AND (owner_id = auth.uid()::text OR is_admin())
  );

DROP POLICY IF EXISTS "deals: delete" ON public.deals;
CREATE POLICY "deals: delete" ON public.deals
  FOR DELETE USING (owner_id = auth.uid()::text OR is_admin());

-- ── deal_activities ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth" ON public.deal_activities;

DROP POLICY IF EXISTS "activities: select" ON public.deal_activities;
CREATE POLICY "activities: select" ON public.deal_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
        AND d.deleted_at IS NULL
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  );

DROP POLICY IF EXISTS "activities: write" ON public.deal_activities;
CREATE POLICY "activities: write" ON public.deal_activities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  );

-- ── deal_meetings ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth" ON public.deal_meetings;

DROP POLICY IF EXISTS "meetings: select" ON public.deal_meetings;
CREATE POLICY "meetings: select" ON public.deal_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
        AND d.deleted_at IS NULL
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  );

DROP POLICY IF EXISTS "meetings: write" ON public.deal_meetings;
CREATE POLICY "meetings: write" ON public.deal_meetings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  );

-- ── profiles — garantir coluna is_admin existe ────────────────────────────────
-- A migration 20260417000001 criou profiles com coluna "role text".
-- A migration 20260420000001 tentou recriar com "is_admin boolean" mas o
-- CREATE TABLE IF NOT EXISTS foi no-op. Garantir que a coluna existe.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Sincronizar is_admin com a coluna role (se existir) para quem tiver role = 'admin'
UPDATE public.profiles
  SET is_admin = true
  WHERE is_admin = false
    AND role = 'admin';
