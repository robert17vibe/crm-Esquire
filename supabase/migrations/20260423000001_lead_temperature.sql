-- ── lead_temperature: quente / morno / frio ──────────────────────────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS lead_temperature text
    CHECK (lead_temperature IN ('hot', 'warm', 'cold'))
    DEFAULT NULL;
