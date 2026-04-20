-- ═══════════════════════════════════════════════════════════════════
-- Fase 4.1: deal_events — audit log de alterações em deals
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Tabela ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id     uuid        NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text        NOT NULL DEFAULT 'field_update',  -- 'field_update' | 'stage_change'
  field_name  text,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deal_events_deal_id_idx ON public.deal_events (deal_id, created_at DESC);

-- ── 2. RLS ────────────────────────────────────────────────────────
ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_events: select" ON deal_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_id
        AND d.deleted_at IS NULL
        AND (d.owner_id = auth.uid()::text OR is_admin())
    )
  );

CREATE POLICY "deal_events: insert" ON deal_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── 3. Trigger function ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_deal_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  col         text;
  old_val     jsonb;
  new_val     jsonb;
  watched     text[] := ARRAY[
    'stage_id', 'value', 'probability', 'expected_close',
    'company_sector', 'company_size', 'company_arr_range',
    'owner_id', 'stakeholders', 'next_activity', 'team_id'
  ];
BEGIN
  FOREACH col IN ARRAY watched LOOP
    old_val := to_jsonb(OLD) -> col;
    new_val := to_jsonb(NEW) -> col;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO public.deal_events (deal_id, actor_id, event_type, field_name, old_value, new_value)
      VALUES (
        NEW.id,
        auth.uid(),
        CASE WHEN col = 'stage_id' THEN 'stage_change' ELSE 'field_update' END,
        col,
        old_val,
        new_val
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_audit ON deals;
CREATE TRIGGER trg_deal_audit
  AFTER UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION public.log_deal_update();
