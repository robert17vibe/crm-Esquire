-- ═══════════════════════════════════════════════════════════════════
-- Fase 2.4: trigger deal_meetings → last_activity_at + cron diário
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Trigger: reunião criada/atualizada atualiza last_activity_at ──
CREATE OR REPLACE FUNCTION public.update_deal_last_activity_from_meeting()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE deals
  SET last_activity_at = CURRENT_DATE,
      updated_at       = now()
  WHERE id = NEW.deal_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_last_activity ON deal_meetings;
CREATE TRIGGER trg_meeting_last_activity
  AFTER INSERT OR UPDATE ON deal_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_deal_last_activity_from_meeting();

-- ── 2. Cron diário: refresh_days_in_stage() toda meia-noite (UTC) ───
-- Requer extensão pg_cron (habilitada por padrão no Supabase)
SELECT cron.schedule(
  'refresh-days-in-stage',       -- nome do job (único)
  '0 0 * * *',                   -- todo dia às 00:00 UTC
  $$SELECT public.refresh_days_in_stage()$$
);
