-- ═══════════════════════════════════════════════════════════════════
-- Fase 4.2: teams — agrupamento por equipe em profiles e deals
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Tabela teams ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams: read"   ON teams FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "teams: insert" ON teams FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "teams: update" ON teams FOR UPDATE USING (is_admin());
CREATE POLICY "teams: delete" ON teams FOR DELETE USING (is_admin());

-- ── 2. team_id em profiles ────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

-- ── 3. team_id em deals ───────────────────────────────────────────
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

-- ── 4. Atualizar RLS de deals — membros do mesmo time veem os deals do time
DROP POLICY IF EXISTS "deals: select" ON deals;
CREATE POLICY "deals: select" ON deals
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      owner_id = auth.uid()::text
      OR is_admin()
      OR (
        team_id IS NOT NULL
        AND team_id = (SELECT team_id FROM profiles WHERE id = auth.uid())
      )
    )
  );
