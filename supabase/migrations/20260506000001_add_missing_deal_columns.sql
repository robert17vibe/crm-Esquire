-- Adiciona colunas em falta na tabela deals (idempotente via IF NOT EXISTS)
-- Corrige: "column deals.loss_reason does not exist" e variantes

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS loss_reason   text,
  ADD COLUMN IF NOT EXISTS health_score  integer DEFAULT 50
    CHECK (health_score >= 0 AND health_score <= 100),
  ADD COLUMN IF NOT EXISTS health_status text DEFAULT 'warning'
    CHECK (health_status IN ('healthy','warning','critical')),
  ADD COLUMN IF NOT EXISTS team_id       uuid
    REFERENCES public.teams(id) ON DELETE SET NULL;
