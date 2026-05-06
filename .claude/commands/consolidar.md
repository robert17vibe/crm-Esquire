---
description: Analisa páginas do CRM que podem ser consolidadas e propõe a fusão
allowed-tools: Read, Glob, Grep
---

Analisa o estado actual das páginas do CRM Esquire e propõe consolidações.

## O que fazer

1. Lê `src/App.tsx` para ver todas as rotas
2. Lê `src/components/layout/Sidebar.tsx` para ver a navegação
3. Para cada par de páginas candidatas, avalia:
   - Têm contexto de dados semelhante?
   - O utilizador navegaria entre elas frequentemente?
   - Cabem em tabs dentro de uma página?

## Páginas candidatas conhecidas
- `CalendarPage` + `MeetingsPage` → Agenda (tabs)
- `AtividadesPage` + `RelatoriosPage` → Análise (tabs)
- `TeamsPage` + `AdminUsersPage` → Equipa (tabs, só admin)
- `AdminDesempenhoPage` + `AdminCobrancaPage` → dentro de Settings

## Páginas a eliminar
- `IntegrationsPage` — já é redirect para /settings
- `LandingPage` — rota /landing não usada

## Output esperado
Para cada consolidação, indica:
- Ficheiros a fundir
- Ficheiros a eliminar
- Alterações em App.tsx e Sidebar.tsx
- Estimativa de esforço (pequeno / médio / grande)

$ARGUMENTS
