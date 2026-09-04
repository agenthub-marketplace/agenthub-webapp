# AgentHub Emergent Functional Rebuild Plan

## Goal

Use the Emergent frontend as the new visual base, then reintroduce the working AgentHub beta features from `staging` without losing the product logic that already works.

This task is planning only. No staging files have been imported yet.

## Current Branch Structure

- Current branch: `front/emergent-functional`
- Base commit: `b028cee Add Emergent frontend reference import`
- Working tree at audit time: clean
- Root app: existing AgentHub functional app under `src/app`
- Emergent app: nested Next.js app under `_emergent-import`
- Source of working product logic: `staging`

The branch currently contains two app structures:

- `src/app`: the actual app used by the root Next.js project.
- `_emergent-import/app`: a nested Emergent Next.js app that is tracked but not executed by the root Next.js project.

## Current Reality

1. The actual running app uses root `src/app`.
2. `_emergent-import` is currently a nested reference app, not the running app.
3. The branch contains two app structures: AgentHub root app and Emergent nested app.
4. `npm run build` passes because Next builds the root `src/app` app. It does not build `_emergent-import` as the application root.
5. `npm run lint` fails because root ESLint scans tracked files under `_emergent-import`, and the imported Emergent code has inherited React/ESLint issues.
6. Emergent is JavaScript/JSX, not TypeScript/TSX.
7. Making Emergent the real app root requires promoting or rebuilding its `app`, `components`, `lib`, assets, styles, and selected dependencies into the root project while preserving AgentHub auth/server/Supabase logic.

## Branch Strategy

- `staging`: functional source of truth.
- `front/emergent-reference`: raw Emergent import reference.
- `front/emergent-functional`: real branch where Emergent UI becomes the app base and AgentHub features are reintroduced.

Do not merge `staging` blindly into `front/emergent-functional`; use targeted file imports and rebuild where route shapes differ.

## Option A: Keep Emergent Nested And Move Files Gradually

Keep `_emergent-import` as a tracked reference and gradually move/rebuild selected files into root `src`.

Pros:

- Lowest immediate risk.
- Root app keeps passing build/typecheck while migration is incremental.
- Easy to compare Emergent screens against existing AgentHub logic.
- Avoids a large one-shot filesystem move.

Cons:

- Root app is still not visually Emergent until files are moved.
- ESLint keeps failing unless `_emergent-import` is excluded or cleaned.
- Two app structures create confusion.
- More manual work route by route.

Risks:

- Developers may edit the wrong app.
- Duplicate components and mock data can drift.
- If `_emergent-import` stays tracked long-term, lint/typecheck strategy must be explicit.

## Option B: Promote `_emergent-import` To Root First

Move Emergent app folders to the root project, then reintroduce AgentHub functional features from `staging`.

Pros:

- The running app immediately becomes the Emergent visual base.
- Removes ambiguity about which UI is real.
- More aligned with the new strategy.

Cons:

- Higher risk and larger diff.
- Emergent uses Next 14, React 18, JavaScript/JSX, Tailwind 3, and extra dependencies, while root uses Next 16, React 19, TypeScript, Tailwind 4, npm.
- Requires dependency/config reconciliation before product work can continue.
- Could temporarily break auth, protected routes, and bilingual routing.

Risks:

- Large conflicts in `app`, `components`, `lib`, globals, Tailwind, and config.
- Extra Emergent routes can imply product features that are not real.
- Payment, workspace, chat, and leaderboard screens may look functional before backend exists.

## Recommended Option

Recommended: Option B, but as a controlled promotion, not a blind folder replacement.

The new strategy says Emergent should be the UI base. Keeping it nested for too long will slow the rebuild and keep the team testing the wrong app. The safe path is:

1. Create a small pre-promotion cleanup commit later that either excludes `_emergent-import` from root lint or fixes lint scope.
2. Promote only the Emergent UI files needed for the core AgentHub routes.
3. Keep AgentHub root `src/server`, Supabase clients, auth actions, proxy, domain types, and migrations from `staging`.
4. Convert or wrap Emergent JSX incrementally into the root TypeScript/Next 16 project.

## Routes To Keep

Core AgentHub routes:

- `/`
- `/en`
- `/marketplace`
- `/en/marketplace`
- `/agents/[slug]`
- `/en/agents/[slug]`
- `/dashboard`
- `/en/dashboard`
- `/creator`
- `/en/creator`
- `/creator/agents/new`
- `/en/creator/agents/new`
- `/admin`
- `/en/admin`
- `/auth/login`
- `/en/auth/login`
- `/auth/signup`
- `/en/auth/signup`
- `/auth/callback`
- `/en/auth/callback`
- `/api/health`
- `/api/auth/debug` while beta debugging is still useful

## Routes To Rename

Emergent routes that map to AgentHub route names:

- `_emergent-import/app/search/page.js` -> `/marketplace`
- `_emergent-import/app/creator/dashboard/page.js` -> `/creator`
- `_emergent-import/app/creator/agents/new/page.js` -> `/creator/agents/new`

## Routes To Remove Or Defer

Defer until backend/product scope exists:

- `/workspace`
- `/leaderboard`
- `/profile`
- `/settings`
- `/agents/[slug]/rent`
- `/rental/confirmation`
- `/creator/agents/[id]/edit`
- `/onboarding/user`
- `/onboarding/creator`
- `_emergent-import/app/api/[[...path]]/route.js`

These screens may be useful as visual references, but they should not ship as functional product routes until the corresponding AgentHub workflows exist.

## Staging Features To Reimport

From `staging`, reintroduce:

- Supabase SSR clients:
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
- Auth/session/actions:
  - `src/lib/auth/actions.ts`
  - `src/lib/auth/session.ts`
  - `src/lib/auth/callback.ts`
  - `src/lib/auth/roles.ts`
- Route protection:
  - `src/proxy.ts`
  - protected page guard usage
- i18n foundation:
  - `src/lib/i18n/config.ts`
  - `src/lib/i18n/dictionaries.ts`
- Domain constants/types:
  - `src/lib/domain/status.ts`
  - `src/types/**`
- Supabase migrations:
  - `supabase/migrations/0001_beta_schema.sql`
  - `supabase/migrations/0002_auth_profile_bootstrap.sql`
  - `supabase/migrations/0003_fix_profiles_select_permissions.sql`
  - `supabase/migrations/0004_persist_creator_submission_permissions.sql`
  - `supabase/seed.sql`
- Creator submission workflow:
  - `src/server/agents/actions.ts`
  - `src/server/agents/creator-agents.ts`
  - `src/app/creator/agents/new/page.tsx`
  - `src/app/en/creator/agents/new/page.tsx`
  - `src/components/views/creator-agent-form-view.tsx`
- Creator dashboard real listing behavior:
  - current user's own `creator_profile` only
  - admin may access creator route but cannot list all creator agents there

## Reimport Order

1. Stabilize root lint/build strategy for the tracked Emergent reference.
2. Decide and execute controlled UI promotion path.
3. Preserve/reapply Supabase clients, auth actions, session helpers, and `src/proxy.ts`.
4. Recreate route protection on Emergent-shaped routes.
5. Reintroduce bilingual routing for core routes.
6. Reintroduce creator submission workflow.
7. Rewire creator dashboard to list real current creator agents.
8. Keep marketplace, agent detail, user dashboard, and admin mocked until each backend workflow is explicitly planned.
9. Remove or hide deferred Emergent routes that imply unsupported features.
10. Run full checks and manual auth role smoke tests.

## No-Go Files And Behaviors

Do not casually rewrite:

- Supabase migrations once applied.
- `src/server/**` business logic from staging.
- Supabase auth/session helpers.
- `src/proxy.ts`.
- RLS-compatible ownership behavior.
- Creator submission cleanup behavior.

Do not ship:

- fake payments as real payment flow.
- arbitrary creator code execution.
- admin approve/reject persistence without a planned backend.
- rent/workspace/chat flows without backend scope.
- admin signup through public signup.

## Testing Checklist

Automated:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Database/local:

- `npx supabase db reset`
- categories exist
- profiles RLS read works
- creator profile ownership works

Auth:

- signup user
- signup creator
- email confirmation callback
- login/logout FR and EN
- `/dashboard` redirects when logged out
- `/creator` accepts creator/admin
- `/admin` accepts admin only

Creator workflow:

- `/creator/agents/new` loads categories
- creator can submit an allowed agent
- `forbidden_beta` cannot be submitted
- partial insert cleanup remains intact
- submitted agent appears in `/creator`
- admin without `creator_profile` sees profile-required message

Visual/product:

- `/` and `/en`
- `/marketplace` and `/en/marketplace`
- `/agents/[slug]` and `/en/agents/[slug]`
- `/dashboard` and `/en/dashboard`
- `/creator` and `/en/creator`
- `/admin` and `/en/admin`

## Immediate Next Task

Do a controlled promotion spike:

1. Exclude `_emergent-import/**` from root lint temporarily or decide to move it out of lint scope.
2. Promote/rebuild only the landing route from Emergent into root `src/app/page.tsx` and `src/app/en/page.tsx`.
3. Keep root auth/server/Supabase code untouched.
4. Run lint, typecheck, and build.
5. Review before promoting marketplace or creator routes.
