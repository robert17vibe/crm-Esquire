-- Propostas de renovação por deal
CREATE TABLE IF NOT EXISTS renewal_proposals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  intro          text    NOT NULL DEFAULT '',
  validity       text    NOT NULL DEFAULT '30 dias',
  payment        text    NOT NULL DEFAULT '',
  terms          text    NOT NULL DEFAULT '',
  lines          jsonb   NOT NULL DEFAULT '[]',
  discount_pct   numeric NOT NULL DEFAULT 0,
  installments   integer NOT NULL DEFAULT 1,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renewal_proposals_deal ON renewal_proposals(deal_id, created_at DESC);

ALTER TABLE renewal_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "renewal_proposals_all" ON renewal_proposals
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Materiais / links associados a um deal
CREATE TABLE IF NOT EXISTS deal_materials (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name       text NOT NULL,
  url        text NOT NULL,
  type       text NOT NULL DEFAULT 'link' CHECK (type IN ('link', 'doc', 'video')),
  added_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_materials_deal ON deal_materials(deal_id, added_at DESC);

ALTER TABLE deal_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_materials_all" ON deal_materials
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Checklist de entrega por deal
CREATE TABLE IF NOT EXISTS deal_deliverables (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  label      text    NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_deliverables_deal ON deal_deliverables(deal_id, created_at);

ALTER TABLE deal_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_deliverables_all" ON deal_deliverables
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Notas de entrega (uma por deal)
CREATE TABLE IF NOT EXISTS deal_delivery_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE UNIQUE,
  notes      text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE deal_delivery_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_delivery_notes_all" ON deal_delivery_notes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
