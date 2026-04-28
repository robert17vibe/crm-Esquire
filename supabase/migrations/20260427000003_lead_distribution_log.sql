-- Lead distribution log
CREATE TABLE IF NOT EXISTS lead_distribution_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_ids uuid[] NOT NULL,
    distributed_by uuid NOT NULL REFERENCES auth.users(id),
    distribution_type text NOT NULL CHECK (distribution_type IN ('manual', 'auto_equal')),
    assignments jsonb NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_log_date ON lead_distribution_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dist_log_user ON lead_distribution_log(distributed_by);

ALTER TABLE lead_distribution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select_dist_log" ON lead_distribution_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "admins_insert_dist_log" ON lead_distribution_log
  FOR INSERT WITH CHECK (
    distributed_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Make sure deals.owner_id is nullable (may already be)
ALTER TABLE deals ALTER COLUMN owner_id DROP NOT NULL;

-- Add segment column if not present
ALTER TABLE deals ADD COLUMN IF NOT EXISTS segment text CHECK (segment IN ('B2B','B2C','B2G'));
