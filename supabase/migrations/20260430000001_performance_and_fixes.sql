-- ═══════════════════════════════════════════════════════════════════
-- Performance indexes + schema fixes
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Indexes em deals para filtros frequentes ───────────────────
CREATE INDEX IF NOT EXISTS deals_stage_id_idx       ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS deals_owner_id_idx       ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS deals_company_name_idx   ON public.deals(company_name);
CREATE INDEX IF NOT EXISTS deals_created_at_idx     ON public.deals(created_at DESC);
CREATE INDEX IF NOT EXISTS deals_expected_close_idx ON public.deals(expected_close)
  WHERE expected_close IS NOT NULL AND deleted_at IS NULL;

-- ── 2. Indexes em tasks ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx    ON public.tasks(due_date)
  WHERE completed_at IS NULL;

-- ── 3. Indexes em deal_meetings ───────────────────────────────────
CREATE INDEX IF NOT EXISTS deal_meetings_scheduled_at_idx ON public.deal_meetings(scheduled_at DESC);

-- ── 4. Indexes em team_notifications ─────────────────────────────
CREATE INDEX IF NOT EXISTS team_notifs_team_id_idx    ON public.team_notifications(team_id);
CREATE INDEX IF NOT EXISTS team_notifs_created_at_idx ON public.team_notifications(created_at DESC);

-- ── 5. deal_meetings: status column (idempotent) ─────────────────
ALTER TABLE public.deal_meetings
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'agendada'
    CHECK (status IN ('agendada','confirmada','realizada','reagendada','cancelada'));

ALTER TABLE public.deal_meetings
  ADD COLUMN IF NOT EXISTS meeting_link text;

-- ── 6. profiles: garantir team_id existe (idempotent) ─────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- ── 7. deals: garantir team_id existe (idempotent) ────────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- ── 8. last_activity_at → timestamptz (se ainda for date) ─────────
-- Verifica se coluna existe como date, se sim faz o cast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals'
      AND column_name = 'last_activity_at'
      AND data_type = 'date'
  ) THEN
    ALTER TABLE public.deals
      ALTER COLUMN last_activity_at TYPE timestamptz
        USING last_activity_at::timestamptz;
  END IF;
END$$;
