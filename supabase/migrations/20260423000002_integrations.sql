-- ═══════════════════════════════════════════════════════════════
-- Fase 8 — Integrações: lead_submissions + webhook_configs
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Formulários de intake públicos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.intake_forms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  name        text NOT NULL,
  owner_id    text NOT NULL,
  team_id     uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  stage_id    text NOT NULL DEFAULT 'leads',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Submissões (leads aguardando revisão) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id      uuid REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes        text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Webhooks de saída ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text NOT NULL,
  events      text[] NOT NULL DEFAULT '{}',
  secret      text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.intake_forms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs  ENABLE ROW LEVEL SECURITY;

-- intake_forms: só admins gerem
CREATE POLICY "admin_intake_forms" ON public.intake_forms
  FOR ALL USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

-- lead_submissions: INSERT público (anon pode submeter), leitura só autenticados
CREATE POLICY "public_submit" ON public.lead_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "auth_read_submissions" ON public.lead_submissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_update_submissions" ON public.lead_submissions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- webhook_configs: só admins
CREATE POLICY "admin_webhooks" ON public.webhook_configs
  FOR ALL USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );
