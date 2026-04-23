-- ─── Tasks ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tasks (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text        NOT NULL,
  description  text,
  deal_id      uuid        REFERENCES public.deals(id) ON DELETE SET NULL,
  assigned_to  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date     date,
  completed_at timestamptz,
  priority     text        NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('low', 'medium', 'high')),
  task_type    text        NOT NULL DEFAULT 'other'
                           CHECK (task_type IN ('call', 'email', 'meeting', 'follow_up', 'other')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_deal_id_idx     ON public.tasks(deal_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx    ON public.tasks(due_date);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
  );

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
  );

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (created_by = auth.uid());

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
