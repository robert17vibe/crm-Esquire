-- ── P1.2: days_in_stage auto-tracking ────────────────────────────────────────
-- Adds stage_changed_at column and a trigger that resets days_in_stage = 0
-- whenever a deal moves to a new stage.
-- refresh_days_in_stage() should be called daily via pg_cron or Supabase Edge Function.

-- 1. Add stage_changed_at column (idempotent)
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz DEFAULT now();

-- 2. Backfill existing rows that have no value
UPDATE deals
SET stage_changed_at = updated_at
WHERE stage_changed_at IS NULL;

-- 3. Trigger function: reset days_in_stage on stage change
CREATE OR REPLACE FUNCTION reset_days_in_stage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    NEW.days_in_stage    := 0;
    NEW.stage_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Attach trigger to deals
DROP TRIGGER IF EXISTS trg_reset_days_in_stage ON deals;
CREATE TRIGGER trg_reset_days_in_stage
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION reset_days_in_stage();

-- 5. Function to increment days_in_stage for all active deals
--    Call daily: SELECT refresh_days_in_stage();
CREATE OR REPLACE FUNCTION refresh_days_in_stage()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE deals
  SET days_in_stage = GREATEST(
    0,
    EXTRACT(DAY FROM (now() - stage_changed_at))::integer
  )
  WHERE stage_id NOT IN ('closed_won', 'closed_lost')
    AND stage_changed_at IS NOT NULL;
END;
$$;
