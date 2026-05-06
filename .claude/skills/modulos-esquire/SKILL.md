---
name: modulos-esquire
description: Sistema de mapeamento, documentação e especialização de módulos do CRM Esquire. Use quando quiser mapear o projeto, documentar um módulo, criar uma skill especialista, ou simplesmente se reencontrar no projeto e entender o que precisa ser feito.
metadata:
  author: robert17vibe
  version: "1.0.0"
  argument-hint: "[mapear | documentar <modulo> | skill <modulo>]"
---

# Sistema de Módulos — CRM Esquire

Você atuará como engenheiro de software especializado neste projeto.
Leia o argumento passado e execute o comando correspondente abaixo.
Se nenhum argumento for passado, liste os 3 comandos disponíveis e pergunte qual executar.

---

## Comandos disponíveis

### 1. `mapear`

**Ativa quando:** argumento for "mapear" ou usuário pedir para "analisar o projeto", "ver os módulos", "me reencontrar no projeto".

**Execute:**

1. Leia a estrutura completa do projeto (pastas `src/pages`, `src/components`, `src/store`, `src/hooks`, `src/lib`, `supabase/migrations`)
2. Identifique módulos por domínio de negócio — não por tipo de arquivo
3. Para cada módulo identifique: responsabilidade principal, arquivos-chave, estado atual (completo / em progresso / pendente)
4. Crie ou atualize `/docs/modulos.md` com o formato:

```markdown
# Lista de Módulos

## {NomeDoModulo}
- **Responsabilidade:** descrição em uma linha
- **Estado:** completo | em progresso | pendente
- **Arquivos-chave:** lista de caminhos
```

5. Após gerar o arquivo, imprima um resumo: quantos módulos, quais estão incompletos, o que parece precisar de atenção.

**Regras:**
- Nunca inventar arquivos
- Módulos são por domínio (ex: Pipeline, Clientes, Desempenho), não por camada técnica
- Se `/docs/modulos.md` já existir, atualize em vez de recriar do zero

---

### 2. `documentar <modulo>`

**Ativa quando:** argumento começar com "documentar" ou "documente".

**Execute:**

1. Leia `/docs/modulos.md` e localize o módulo solicitado
2. Leia **todos** os arquivos listados como arquivos-chave desse módulo
3. Analise também stores, hooks e migrations relacionados
4. Crie `/docs/modulos/{nome-do-modulo}.md` com a estrutura:

```markdown
# Módulo: {Nome}

## 📌 Responsabilidade
Descrição clara e direta

## 🧩 Funcionalidades
- Lista objetiva

## 📂 Arquivos relevantes
- Caminhos reais do projeto

## 🔗 Dependências
- Outros módulos ou serviços

## 🔄 Fluxos principais
- Passo a passo do funcionamento

## 📊 Dados envolvidos
- Models, schemas, entidades, tabelas Supabase

## ⚠️ Regras de negócio
- Validações e restrições críticas

## 🧠 Observações para IA
- Contexto importante para quem for alterar esse módulo
```

**Regras:**
- Nunca inventar estrutura — apenas arquivos reais
- Se o módulo não existir em `/docs/modulos.md`, informe e sugira rodar `mapear` primeiro

---

### 3. `skill <modulo>`

**Ativa quando:** argumento começar com "skill".

**Execute:**

1. Leia `/docs/modulos/{nome-do-modulo}.md`
2. Se não existir, informe e sugira rodar `documentar {modulo}` primeiro
3. Crie `.claude/skills/{nome-do-modulo}-especialista/SKILL.md` com o formato:

```markdown
---
name: {nome-do-modulo}-especialista
description: Skill especialista no módulo {Nome} do CRM Esquire. Use ao trabalhar em qualquer funcionalidade relacionada a {domínio}.
metadata:
  author: robert17vibe
  version: "1.0.0"
---

# Especialista: {Nome}

## Contexto do módulo
{responsabilidade + visão geral}

## Arquivos principais
{lista de arquivos reais}

## O que pode ser alterado com segurança
{partes estáveis, bem definidas}

## O que requer atenção extra
{partes frágeis, dependências críticas, efeitos colaterais conhecidos}

## Regras de negócio obrigatórias
{validações e restrições que nunca devem ser quebradas}

## Padrões de código deste módulo
{convenções usadas: nomes, estrutura, estilo}

## Dependências críticas
{stores, hooks, tabelas Supabase que esse módulo consome}

## Checklist antes de alterar
- [ ] Verificar impacto nas dependências listadas
- [ ] Testar fluxo principal descrito na documentação
- [ ] Confirmar que regras de negócio continuam válidas
```

---

## Contexto do projeto

- **Stack:** React + TypeScript + Vite, Supabase (PostgreSQL + RLS), Zustand, React Router v6
- **Padrão de estado:** Zustand stores em `src/store/use*Store.ts`
- **Padrão de páginas:** `src/pages/*Page.tsx` exportadas como named exports
- **Estilo:** inline styles (sem Tailwind), paleta dark/light via `useThemeStore`
- **Autenticação:** `useAuthStore` + Supabase Auth, com `is_admin` no profile
- **Dados visíveis:** hook `useVisibleDeals` filtra deals por owner ou impersonation
- **Rotas:** definidas em `src/App.tsx` com lazy loading

---

## Regras globais

- Nunca inventar arquivos ou estruturas
- Sempre usar caminhos reais do projeto
- Pensar como engenheiro, não como tutorial
- Priorizar clareza sobre quantidade
- Após cada etapa, aguardar o próximo comando
