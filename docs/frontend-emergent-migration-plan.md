# AgentHub Frontend Emergent Migration Plan

## 1. Goal

Migrate AgentHub toward the Emergent visual direction without replacing the working product architecture. The existing Next.js App Router, TypeScript, Tailwind, shadcn/ui components, Supabase Auth, protected routes, SSR proxy, server actions, migrations, and creator submission workflow remain the source of truth.

Emergent is a visual reference only. Its screens should inform layout density, spacing, card composition, navigation treatment, and visual hierarchy. UI must be rebuilt inside the current AgentHub component structure in TypeScript.

Current limitation: the local `_emergent-import/` folder on this workstation only contains `memory/test_credentials.md`. The expected reference files were not present during this inspection:

- `_emergent-import/app/page.js`
- `_emergent-import/components/Navbar.jsx`
- `_emergent-import/components/AgentCard.jsx`
- `_emergent-import/app/agents/[slug]/page.js`
- `_emergent-import/app/dashboard/page.js`
- `_emergent-import/app/creator/dashboard/page.js`
- `_emergent-import/app/admin/page.js`
- `_emergent-import/app/globals.css`

Before visual implementation, restore or provide the actual Emergent UI files locally or inspect them from the dedicated reference branch/export.

## 2. Branch Strategy

- `staging` = working product and source of truth.
- `front/emergent-reference` = visual reference only; do not merge into `staging`.
- `front/ui-redesign` = real integration branch created from `staging`.

Rules:

- Do not copy the Emergent app into `src/app`.
- Do not merge `front/emergent-reference` directly.
- Rebuild selectively in existing AgentHub files.
- Keep `_emergent-import/` local and ignored on `front/ui-redesign`.
- Commit UI migration work only after lint, typecheck, build, and manual smoke tests pass.

## 3. Current Frontend Structure

### Existing Routes

- `/`
- `/marketplace`
- `/agents/[slug]`
- `/dashboard`
- `/creator`
- `/creator/agents/new`
- `/admin`
- `/auth/login`
- `/auth/signup`
- `/auth/callback`
- `/en`
- `/en/marketplace`
- `/en/agents/[slug]`
- `/en/dashboard`
- `/en/creator`
- `/en/creator/agents/new`
- `/en/admin`
- `/en/auth/login`
- `/en/auth/signup`
- `/en/auth/callback`

### Layout And Shared Components

- `src/components/app/app-shell.tsx`
- `src/components/app/app-nav.tsx`
- `src/components/app/page-header.tsx`
- `src/components/app/agent-card.tsx`
- `src/components/app/review-card.tsx`
- `src/components/app/status-badge.tsx`
- `src/components/app/empty-state.tsx`

### View Components

- `src/components/marketing/home-landing-page.tsx`
- `src/components/views/marketplace-view.tsx`
- `src/components/views/agent-detail-view.tsx`
- `src/components/views/dashboard-view.tsx`
- `src/components/views/creator-view.tsx`
- `src/components/views/creator-agent-form-view.tsx`
- `src/components/views/admin-view.tsx`
- `src/components/views/auth-views.tsx`

### Mock Data Usage

- Marketplace uses localized mock agents from `src/lib/i18n/mock-data.ts`.
- Agent detail uses localized mock agent and review data.
- User dashboard uses localized mock orders.
- Admin dashboard uses localized mock creator agents.
- Creator dashboard is partially real: it reads the current creator profile's agents from Supabase.

### Connected Supabase/Server Action Surfaces

- Auth views call `loginAction`, `signupAction`, and `logoutAction`.
- Protected pages call `requireAuth`, `requireCreatorAccess`, or `requireAdminAccess`.
- Creator dashboard reads agents through `getCreatorAgentsForUser`.
- Submit agent form calls `submitAgentForReviewAction`.
- `/creator/agents/new` and `/en/creator/agents/new` load categories and creator profile state from Supabase.

## 4. Migration Order

### 1. Global Layout / Navbar

Current status:

- `AppShell` and `AppNav` are functional and preserve auth, logout, route links, active state, and FR/EN switching.

Emergent reference to inspect:

- `_emergent-import/components/Navbar.jsx`
- `_emergent-import/app/globals.css`

AgentHub files to preserve:

- `src/components/app/app-shell.tsx`
- `src/components/app/app-nav.tsx`
- `src/lib/auth/actions.ts`
- `src/lib/auth/session.ts`
- `src/lib/i18n/config.ts`

Logic that must not break:

- Auth-aware login/signup/logout display.
- Active route highlighting.
- FR/EN path switching.
- Protected route links.

Acceptance checks:

- Logged-out nav shows login/signup.
- Logged-in nav shows logout and profile label.
- FR/EN switch keeps equivalent current route.
- Mobile layout remains usable.

### 2. Landing Page

Current status:

- Functional bilingual SaaS landing page using `HomeLandingPage`.

Emergent reference to inspect:

- `_emergent-import/app/page.js`
- `_emergent-import/app/globals.css`

AgentHub files to preserve:

- `src/app/page.tsx`
- `src/app/en/page.tsx`
- `src/components/marketing/home-landing-page.tsx`
- `src/lib/i18n/dictionaries.ts`

Logic that must not break:

- FR default route.
- EN route under `/en`.
- CTA links to marketplace, creator, auth.

Acceptance checks:

- `/` renders French.
- `/en` renders English.
- CTAs route correctly.
- No dependency on Emergent runtime files.

### 3. Marketplace

Current status:

- Static/mock listing with localized data and `AgentCard`.

Emergent reference to inspect:

- `_emergent-import/components/AgentCard.jsx`
- Any marketplace/listing section in `_emergent-import/app/page.js`

AgentHub files to preserve:

- `src/components/views/marketplace-view.tsx`
- `src/components/app/agent-card.tsx`
- `src/lib/i18n/mock-data.ts`

Logic that must not break:

- Mock data source until marketplace Supabase replacement is explicitly planned.
- Links to `/agents/[slug]` and `/en/agents/[slug]`.
- Verified/status badges.

Acceptance checks:

- Marketplace loads in FR/EN.
- Agent cards link to details.
- Filters/search UI remains non-persistent unless intentionally changed.

### 4. Agent Detail

Current status:

- Mock detail page based on slug.

Emergent reference to inspect:

- `_emergent-import/app/agents/[slug]/page.js`

AgentHub files to preserve:

- `src/app/agents/[slug]/page.tsx`
- `src/app/en/agents/[slug]/page.tsx`
- `src/components/views/agent-detail-view.tsx`

Logic that must not break:

- Existing static params.
- Not-found state.
- Localized mock content.

Acceptance checks:

- `/agents/linkedin-content-agent` works.
- `/en/agents/linkedin-content-agent` works.
- Unknown slugs show clean not-found state.

### 5. Creator Dashboard

Current status:

- Protected real/hybrid page.
- Reads current user's `creator_profile` and its agents from Supabase.
- Does not list all agents for admins.

Emergent reference to inspect:

- `_emergent-import/app/creator/dashboard/page.js`

AgentHub files to preserve:

- `src/app/creator/page.tsx`
- `src/app/en/creator/page.tsx`
- `src/components/views/creator-view.tsx`
- `src/server/agents/creator-agents.ts` must not be edited during visual-only passes.

Logic that must not break:

- `requireCreatorAccess`.
- Current user's own creator profile ownership.
- Admins without creator profiles see a clear message.

Acceptance checks:

- Creator sees own submitted agents.
- Admin does not see all creator agents here.
- User role is redirected away.

### 6. Submit Agent Form

Current status:

- Real Supabase workflow.
- Creates `agents` + `agent_versions`, then submits.
- Has best-effort cleanup for partial failures.

Emergent reference to inspect:

- Any creator submission form or creator dashboard patterns in Emergent.

AgentHub files to preserve:

- `src/app/creator/agents/new/page.tsx`
- `src/app/en/creator/agents/new/page.tsx`
- `src/components/views/creator-agent-form-view.tsx`
- `src/server/agents/actions.ts` must not be edited during visual-only passes.

Logic that must not break:

- Server-side validation.
- No `forbidden_beta` submission.
- No admin ownership bypass.
- No service role usage.
- Cleanup on failure.

Acceptance checks:

- Categories load.
- Submit works for creator with creator profile.
- Admin without creator profile sees clear message.
- Submitted agent appears in `/creator`.

### 7. User Dashboard

Current status:

- Protected, mostly mock data.

Emergent reference to inspect:

- `_emergent-import/app/dashboard/page.js`

AgentHub files to preserve:

- `src/app/dashboard/page.tsx`
- `src/app/en/dashboard/page.tsx`
- `src/components/views/dashboard-view.tsx`

Logic that must not break:

- `requireAuth`.
- Mock orders remain until real rental requests are implemented.

Acceptance checks:

- Logged-out redirects to login.
- Logged-in user sees dashboard in FR/EN.

### 8. Admin Dashboard

Current status:

- Protected, mock review queue.

Emergent reference to inspect:

- `_emergent-import/app/admin/page.js`

AgentHub files to preserve:

- `src/app/admin/page.tsx`
- `src/app/en/admin/page.tsx`
- `src/components/views/admin-view.tsx`

Logic that must not break:

- `requireAdminAccess`.
- No persistent approve/reject until admin workflow is explicitly implemented.

Acceptance checks:

- Admin can access.
- User/creator cannot access.
- Buttons remain non-persistent until backend workflow exists.

## 5. Explicit No-Go List

- Do not touch `src/server` during visual-only migration tasks.
- Do not touch Supabase migrations during visual-only migration tasks.
- Do not touch auth guards.
- Do not touch `src/proxy.ts`.
- Do not replace the App Router architecture.
- Do not copy the Emergent app wholesale.
- Do not add new dependencies unless a specific gap is documented and approved.
- Do not remove FR/EN routing.
- Do not break protected route behavior.
- Do not replace real creator submission logic with mock logic.

## 6. Testing Checklist

Automated:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Auth and route checks:

- Login works.
- Logout works.
- `/dashboard` redirects when logged out.
- `/creator` redirects for plain user.
- `/admin` redirects for non-admin.
- FR and EN auth routes still work.

Creator workflow:

- `/creator/agents/new` loads.
- `/en/creator/agents/new` loads.
- Categories load from Supabase.
- Creator with creator profile can submit an agent.
- `forbidden_beta` is rejected.
- Submitted agent appears in `/creator`.
- Admin without creator profile cannot submit from creator routes and sees the profile-required message.

Visual regression:

- Landing desktop/mobile.
- Marketplace desktop/mobile.
- Agent detail desktop/mobile.
- Dashboard/creator/admin desktop/mobile.
- Text does not overflow buttons/cards.
- Navigation remains usable on narrow screens.

## 7. Recommended Next Task

Do not start with a full-app redesign. Start with one safe visual slice:

1. Provide or restore the actual Emergent UI files locally under `_emergent-import/`.
2. Redesign `AppShell` and `AppNav` only.
3. Preserve all links, auth behavior, logout action, active states, and FR/EN switching.
4. Run lint, typecheck, build.
5. Review before touching page-level views.
