-- Histórico de mudanças de etapa do pipeline
CREATE TABLE IF NOT EXISTS deal_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  days_in_previous_stage integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_deal_stage_history_deal ON deal_stage_history(deal_id, changed_at DESC);

ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_stage_history_read" ON deal_stage_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "deal_stage_history_insert" ON deal_stage_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger automático ao mudar stage
CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO deal_stage_history (deal_id, from_stage, to_stage, days_in_previous_stage)
    VALUES (NEW.id, OLD.stage_id, NEW.stage_id, COALESCE(OLD.days_in_stage, 0));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_stage_change ON deals;
CREATE TRIGGER trigger_log_stage_change
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION log_deal_stage_change();

-- Tabela de reuniões
CREATE TABLE IF NOT EXISTS meeting_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  items jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  meeting_date timestamptz NOT NULL DEFAULT now(),
  template_id uuid REFERENCES meeting_checklist_templates(id),
  completed_items jsonb NOT NULL DEFAULT '[]',
  score decimal(3,1) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_records_all" ON meeting_records FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "meeting_templates_read" ON meeting_checklist_templates FOR SELECT USING (auth.uid() IS NOT NULL);

INSERT INTO meeting_checklist_templates (name, description, items) VALUES (
  'Reunião Comercial',
  'Checklist para reuniões de descoberta e apresentação',
  '[
    {"id":"apresentacao","text":"Fez apresentação da empresa/produto","weight":1.5},
    {"id":"dor","text":"Identificou dor/necessidade principal","weight":2.0},
    {"id":"decisor","text":"Falou com decisor ou influenciador chave","weight":2.0},
    {"id":"orcamento","text":"Validou orçamento disponível","weight":1.5},
    {"id":"timeline","text":"Definiu timeline de decisão","weight":1.0},
    {"id":"concorrentes","text":"Identificou concorrentes avaliados","weight":1.0},
    {"id":"proximo_passo","text":"Agendou próximo passo concreto","weight":1.0}
  ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Dashboard layouts
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout_data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dashboard_layouts_own" ON dashboard_layouts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Health score nos deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'warning';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS health_calculated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_activities_count INTEGER DEFAULT 0;
