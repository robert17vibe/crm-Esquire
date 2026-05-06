# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server (Vite)
npm run build      # tsc -b && vite build
npm run lint       # eslint
npm run preview    # preview production build
```

No test suite exists. Type-check via `npm run build`.

## Environment variables

Two variables required in `.env.local`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Missing variables crash the app at startup with a visible error page (not a console warning).

## Architecture

**Stack:** React 18 + TypeScript + Vite, Supabase (PostgreSQL + Auth + Realtime), Zustand, React Router v6, dnd-kit, Recharts, Radix UI, Zod + React Hook Form.

**Styling:** Inline styles everywhere — no Tailwind utility classes in component JSX. Tailwind is present but used only for global resets. Dark/light mode via `useThemeStore(s => s.isDark)`. Color palette is warm neutrals (`#0d0c0a` dark bg, `#f5f4f0` light bg, `#2c5545` brand green, `#6b1212` brand red).

**State:** Zustand stores in `src/store/use*Store.ts`. Each store is a singleton; call `useStore.getState()` for imperative access outside React. Stores talk to each other via `getState()` — no context providers.

**Routing:** Defined entirely in `src/App.tsx` with lazy-loaded pages. Admin routes are behind `AdminGuard` (checks `profile.is_admin`). The route `/performance` renders outside `AppLayout` (used as a TV display).

**Data flow:**
1. Stores call services in `src/services/*.service.ts` which wrap Supabase queries
2. All mutations use **optimistic updates**: save `prev`, apply change, `try/catch` reverts to `prev` on error
3. Realtime subscriptions live in stores (e.g. `useDealStore.subscribeRealtime`)
4. `localStorage` caches critical data: `esq_deals_v2` (deals), `esq_proposals_v4_{dealId}` (proposals per deal)

**Auth & permissions:**
- `useAuthStore` — session, user, profile (`is_admin` flag)
- `useImpersonationStore` — admin can simulate another user's view; persisted in `sessionStorage` (`esq_impersonate_id`)
- `useVisibleDeals` hook filters deals by `impersonatedId` when active
- `usePermissionStore` — granular feature flags per user

**Key domain types:**
- `Deal` + `StageId` — `src/types/deal.types.ts` + `src/constants/pipeline.ts`
- Pipeline stages: `leads → prospecting → qualification → proposal → negotiation → closed_won → closed_lost`
- `DEFAULT_PROBABILITIES` in `src/constants/pipeline.ts` auto-applied on stage change

**Deal score:** `src/lib/dealScore.ts` — additive score 0–100 based on stage progress, meetings, tasks, proposals, activity recency, next activity, probability, contact completeness.

**Forms:** Zod schemas in `src/lib/schemas/`, validated with React Hook Form + `@hookform/resolvers/zod`.

**Notifications & webhooks:** `useNotificationStore` for in-app alerts; `useWebhookStore.getState().fire(event, payload)` for outbound webhooks on deal CRUD and stage changes.

**Migrations:** `supabase/migrations/` — apply manually via Supabase dashboard or CLI. Two migrations are pending production apply: `20260430000001_performance_and_fixes.sql` and `20260501000001_renewal_and_delivery.sql`.

## Module documentation

Detailed per-module docs are in `docs/modulos/`. Skills for individual modules are in `.claude/skills/`. Use `/pipeline-especialista` (or the relevant skill) at the start of a session when working on a specific module.
