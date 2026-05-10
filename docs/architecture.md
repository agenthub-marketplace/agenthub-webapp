# AgentHub Architecture

AgentHub is a web-first marketplace for verified AI agent services. The MVP is a Next.js application backed by Supabase for auth, PostgreSQL, and storage. It does not run arbitrary creator code on AgentHub infrastructure.

## High-level architecture

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui.
- Server routes: Next.js Route Handlers for lightweight API endpoints such as health checks and future short server tasks.
- Data layer: Supabase PostgreSQL with row-level security planned around users, creators, admins, agents, orders, reviews, and audit logs.
- Auth: Supabase Auth planned for user sessions and role-based access.
- Storage: Supabase Storage planned for deliverables, creator assets, and validation documents where appropriate.
- Edge work: Supabase Edge Functions planned for webhooks and short-lived server tasks.
- Payments: Stripe Connect planned for marketplace payouts, onboarding, payment intents, webhooks, refunds, and disputes.
- Deployment: Vercel is the planned deployment target for the Next.js app.

## Users, creators, and admins

Users discover verified agents, rent them for concrete outcomes, track orders, review deliverables, and open disputes when needed.

Creators publish agent services, provide external endpoint details, define deliverables, receive validation feedback, and later connect payout accounts.

Admins validate agent quality, review safety posture, moderate marketplace content, manage disputes, and inspect audit logs.

## Frontend

The frontend is route-based and starts with placeholder pages for the main product surfaces:

- `/` home
- `/marketplace`
- `/agents/[slug]`
- `/creator`
- `/dashboard`
- `/admin`
- `/auth/login`
- `/auth/signup`

The UI foundation is intentionally light. shadcn/ui is installed with only basic primitives needed for MVP skeleton work.

## Backend and server routes

Next.js Route Handlers should cover small app-local endpoints. Long-running or security-sensitive workflows should move to Supabase Edge Functions or dedicated services when they exceed route-handler scope.

Current route:

- `/api/health` returns service health metadata.

## Supabase

Supabase is planned for:

- Authentication and session management.
- PostgreSQL marketplace data.
- Storage for controlled files and deliverables.
- Row-level security around ownership, creator access, and admin access.

The current Supabase clients are safe placeholders. They return `null` when public Supabase configuration is not present, so the placeholder app can compile before infrastructure is provisioned.

## Stripe Connect planned

Stripe Connect is planned but not implemented. Future work should cover:

- Creator onboarding.
- Payment collection.
- Marketplace fees.
- Transfers and payouts.
- Refunds and disputes.
- Webhook verification through server-only secrets.

## Execution gateway planned

The MVP execution model is external verified agent endpoints behind a future execution gateway. AgentHub will validate and call approved endpoints rather than executing creator code directly.

The gateway should eventually handle:

- Endpoint authentication.
- Request signing.
- Rate limiting.
- Run state callbacks.
- Timeout and retry policy.
- Audit logging.

## Why no arbitrary creator code in MVP

Running arbitrary creator code requires sandboxing, isolation, resource controls, abuse prevention, secrets isolation, network policy, and incident response. Those are not MVP requirements. The safer MVP path is to validate external endpoints and route execution through a controlled gateway later.

## Deployment target

The planned deployment target is Vercel for the Next.js app, with Supabase hosting auth, database, storage, and planned Edge Functions.
