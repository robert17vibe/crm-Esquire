-- Adiciona coluna stakeholders à tabela deals (JSONB array de {name, initials, color})
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS stakeholders jsonb DEFAULT '[]'::jsonb;
