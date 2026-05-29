# AgentHub backend technical introduction

Last updated: 2026-05-29

## Purpose

This document introduces the backend already built for AgentHub and the backend work planned next.

AgentHub is currently preparing a closed beta. The product is not a full autonomous-agent platform yet. It is a controlled marketplace where:

1. creators submit structured agents;
2. admins approve, reject, request changes, suspend, restore, or archive agents;
3. users rent approved agents through Stripe sandbox;
4. paid access opens a workspace;
5. text-only LLM actions run server-side;
6. outputs are stored and visible in the user's run history;
7. users can leave verified reviews.

## Current stack

- Application: Next.js App Router.
- Hosting: Vercel.
- Database: Supabase Postgres.
- Auth: Supabase Auth.
- Authorization: Supabase RLS plus server-side checks.
- Payments: Stripe Checkout sandbox.
- AI provider: OpenAI Responses API through a server-only LLM Runner v0.
- Ops: read-only SQL sanity scripts and beta runbooks.

## Current core flow

```text
Creator creates agent from template
-> Admin reviews Agent Contract
-> Admin approves
-> Agent appears in marketplace/search
-> User rents with Stripe sandbox
-> Stripe webhook confirms payment
-> Backend creates active access
-> User opens workspace
-> User launches LLM action
-> Backend stores agent_run
-> User leaves verified review
```

## Main backend domains

### Auth and roles

Tables:

- `auth.users` from Supabase Auth;
- `public.profiles`;
- `public.creator_profiles`.

Roles:

- `user`;
- `creator`;
- `admin`.

Backend responsibilities:

- map Supabase auth users to app profiles;
- protect routes and server actions;
- use role checks for creator/admin flows;
- avoid authorization based on user-editable metadata.

### Agent lifecycle

Tables:

- `agents`;
- `agent_versions`;
- `admin_reviews`;
- `agent_categories`.

Important statuses:

- `draft`;
- `submitted`;
- `in_review`;
- `approved`;
- `rejected`;
- `suspended`;
- `archived`.

Current behavior:

- creators submit agents;
- admins moderate lifecycle;
- approved and non-suspended agents are public;
- archived agents are removed from active admin/creator/user surfaces while history remains preserved.

### Agent Contract

Stored on `agent_versions`.

Key fields:

- `workspace_mode`;
- `setup_requirements`;
- `output_promise`;
- `execution_mode`;
- `data_policy`;
- `capabilities`;
- `required_inputs`;
- `deliverables`;
- `limitations`.

Current rule for LLM beta agents:

- `execution_mode = 'llm_prompt'`;
- no file requirement;
- no external tools;
- clear output promise;
- clear limitations;
- positive price;
- not `forbidden_beta`.

Support code:

- `src/lib/agent-contract.ts` normalizes Agent Contract fields.
- `src/lib/agent-contract-quality.ts` evaluates readiness for closed beta.
- `scripts/beta-sanity.sql` reports Agent Contract readiness in production.

### Payments and access

Tables:

- `payments`;
- `rental_requests`.

Important note:

- `rental_requests` is the legacy table name, but functionally it now represents user access to an agent.

Payment states:

- `pending`;
- `paid`;
- `cancelled`;
- `failed`;
- `paid_blocked`.

Access states:

- `active`;
- `stopped`;
- legacy states still readable.

Key backend rules:

- paid access is created only by the Stripe webhook;
- success page never creates access;
- price is snapshotted server-side;
- `agent_version_id` is frozen at checkout/access creation;
- duplicate open payments and duplicate active accesses are blocked by server/DB logic;
- stopped access can be rented again if product rules allow it.

### Stripe sandbox

Current model:

```text
User clicks rent
-> server validates agent and user state
-> server creates/reuses pending payment
-> Stripe Checkout opens
-> webhook receives checkout.session.completed
-> backend verifies payment and agent status
-> backend creates active access
-> success page polls status and redirects to workspace
```

Safety rules:

- webhook uses raw body signature verification;
- service role is server-only;
- checkout success/cancel pages are not payment authority;
- if an agent is suspended/rejected during checkout, payment becomes `paid_blocked` and access is not opened automatically.

### Workspace and LLM Runner v0

Tables:

- `agent_runs`.

Current runner:

- text-only;
- no upload;
- no streaming;
- no chat realtime;
- no external tools;
- no creator code execution;
- no n8n;
- no full execution gateway.

Eligibility:

- user must own an active access;
- agent version must be tied to the access;
- version must use `execution_mode = 'llm_prompt'`;
- data policy must not require files or external tools;
- agent must be approved or the access must be tied to an approved version and not suspended/archived.

Run behavior:

- prompt is constructed server-side from approved agent/version data;
- creator fields are treated as context, not privileged system instructions;
- OpenAI API key is server-only;
- output is stored in `agent_runs`;
- run history is visible only to the owning user.

### Verified reviews

Tables:

- `agent_reviews`;
- linked to `rental_requests`.

Rules:

- user can review only after valid access;
- one review per access;
- ratings roll up to marketplace/detail views.

## Security model

Primary safeguards:

- Supabase RLS on exposed tables;
- server-side ownership checks;
- service role isolated to trusted server code;
- webhook-only paid access creation;
- no client insert/update/delete on `payments` or `agent_runs`;
- creators see only their own agent analytics, not private user run content;
- marketplace reads only approved/non-suspended agents.

High-priority review areas for a senior dev:

1. RLS policies around `rental_requests`, `payments`, and `agent_runs`.
2. Service role imports are server-only.
3. Stripe webhook idempotency and failure handling.
4. Access duplication constraints.
5. Prompt construction and injection resistance.
6. Creator privacy around user inputs and LLM outputs.

## Ops and beta monitoring

Read-only scripts:

- `scripts/beta-sanity-summary.sql`
  - aggregate P0/P1 counters;
  - safe quick check before/after beta sessions.
- `scripts/beta-sanity.sql`
  - detailed checks for agents, payments, access, LLM runs, reviews, auth.
- `scripts/beta-daily-metrics.sql`
  - daily funnel proxy and beta usage metrics.

Current sanity result on 2026-05-29:

- expected beta agents total: 5;
- expected beta agents present: 5;
- expected beta agents approved: 5;
- expected beta agents ready for closed beta: 5;
- old pending payments: 0;
- paid payments without access: 0;
- duplicate open payment groups: 0;
- duplicate active access groups: 0;
- failed LLM runs in last 24h: 0;
- stale running LLM runs: 0;
- duplicate review groups: 0;
- reviews on invalid access: 0;
- auth users missing profiles: 0;
- unconfirmed auth users: 0.

## Known naming debt

- `rental_requests` should eventually be renamed or abstracted as `accesses`, but not during closed beta.
- Some legacy rental statuses remain for backwards compatibility.
- The current LLM Runner v0 should not be called the execution gateway.

## Backend work planned next

### Closed beta stabilization

- run sanity summary daily;
- track checkout/access/LLM/review counts;
- fix only P0/P1;
- keep P2/P3 in beta backlog.

### Agent quality and admin polish preparation

Backend already prepared:

- Agent Contract quality evaluator;
- SQL readiness checks.

Later front/admin wiring:

- public listing preview;
- workspace preview;
- clearer admin checklist.

### LLM Runner hardening

Possible backend improvements:

- run cost estimates by model/user/agent;
- structured OpenAI error taxonomy;
- rate-limit audit rows;
- stuck-run cleanup job;
- optional admin-only run diagnostics.

### Payments hardening

Possible backend improvements:

- better dashboard/reporting for `paid_blocked`;
- webhook event log table;
- Stripe session expiry handling report;
- refund/manual support workflow before real payments.

### Later, not now

- Stripe Connect and creator payouts;
- real paid production mode;
- uploads;
- emails;
- persistent notifications;
- external tools;
- n8n;
- full execution gateway.

## Suggested questions for the senior dev

1. Are the current RLS boundaries sufficient for closed beta?
2. Should `rental_requests` be abstracted behind backend naming before V1?
3. Is webhook idempotency strong enough before real payments?
4. Is `agent_version_id` frozen consistently across payment, access, and run?
5. Should `agent_runs` get a separate audit/error taxonomy before more testers?
6. What is the smallest safe path from LLM Runner v0 to a real execution gateway later?
7. What must be changed before Stripe real mode?
