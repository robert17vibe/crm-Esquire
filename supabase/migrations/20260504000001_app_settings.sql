-- Tabela de configurações globais da app (leitura pública, escrita só admin)
create table if not exists app_settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Inserir configuração padrão do desempenho
insert into app_settings (key, value) values (
  'desempenho_config',
  '{
    "metas": {
      "faturamento": 5000000,
      "vendas": 20,
      "ligacoes_dia": 50,
      "reunioes": 10,
      "agendamentos": 10
    },
    "range": {
      "dias": [],
      "mes": 4,
      "ano": 2026
    }
  }'::jsonb
) on conflict (key) do nothing;

-- RLS
alter table app_settings enable row level security;

-- Qualquer pessoa autenticada (ou anon) pode ler
create policy "app_settings_read_all"
  on app_settings for select
  using (true);

-- Só admins podem escrever
create policy "app_settings_write_admin"
  on app_settings for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );
