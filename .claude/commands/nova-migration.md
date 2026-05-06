---
description: Cria uma nova migration Supabase para o CRM Esquire
allowed-tools: Read, Write, Glob, Bash
---

Cria uma migration Supabase para: $ARGUMENTS

## Padrão de ficheiros

Nome do ficheiro: `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql`
Data actual: !`date +%Y%m%d%H%M%S`

## Estrutura base

```sql
-- Descrição breve do que esta migration faz

-- 1. Criar tabela (se aplicável)
create table if not exists nome_tabela (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. RLS
alter table nome_tabela enable row level security;

-- Leitura: qualquer autenticado
create policy "nome_tabela_select"
  on nome_tabela for select
  using (auth.uid() is not null);

-- Escrita: próprio utilizador
create policy "nome_tabela_insert"
  on nome_tabela for insert
  with check (auth.uid() = user_id);

-- 3. Índices úteis
create index if not exists nome_tabela_user_id_idx on nome_tabela(user_id);

-- 4. Trigger updated_at (se necessário)
create trigger nome_tabela_updated_at
  before update on nome_tabela
  for each row execute procedure moddatetime(updated_at);
```

## Regras
- Sempre usar `if not exists` / `if exists` para ser idempotente
- RLS sempre activado
- Nunca apagar dados — usar `deleted_at timestamptz` para soft delete
- Foreign keys com `on delete cascade` quando o filho não faz sentido sem o pai
- Adicionar ao ficheiro `supabase/migrations/MEMORY.md` se existir

Depois de criar, indica o comando para aplicar:
```
supabase db push
```
