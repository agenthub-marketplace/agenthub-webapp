# Activation Flow Audit

## Task

Name: Activation flow audit

Owner: Local Codex loop

Date: 2026-06-10

## Objective

Audit the path from marketplace/rent to checkout status, active access, and workspace entry. Produce documentation or a tightly scoped report of risks. Do not change product behavior unless a P0/P1 defect is obvious and fully localized.

## Allowed Scope

- Read `AGENTS.md`.
- Read `docs/AGENTHUB_CURRENT_STATE.md`, beta docs, and payment/access-related source files.
- Edit documentation under `docs/agent-loops/`.
- If a P0/P1 defect is found, stop and report it unless the fix is very small and clearly inside the requested flow.

## Forbidden Scope

- Do not modify Stripe webhook semantics, payment creation, access creation, Supabase schema, migrations, RLS, or production data.
- Do not alter marketplace listing rules.
- Do not add dependencies.
- Do not commit, push, deploy, or run package installation.

## Loop Or State Machine Fit

Use a loop for this audit because the task is local and bounded.

Model the product flow itself as a state machine:

```text
marketplace_viewed -> rent_started -> checkout_started -> paid -> access_active -> workspace_opened
```

Failure and cancellation states should remain explicit:

```text
checkout_cancelled
checkout_pending
checkout_failed
access_missing
```

## Acceptance Criteria

- [x] Identify the main files involved in activation/access.
- [x] Confirm the expected state transitions are documented.
- [x] Report any mismatch without broad refactoring.
- [ ] Run the configured validation command.
- [ ] Show `git status --short` at the end.

## Validation

```bash
npm run agent:validate
```

## Audit Report 2026-06-10

Scope: read-only audit of marketplace -> rent -> checkout -> active access -> workspace. No product code, database schema, migrations, RLS, Edge Functions, Stripe webhook behavior, payment/access creation behavior, marketplace listing rules, or workspace access behavior was changed.

### Main Files

- Marketplace discovery and detail data:
  - `src/server/marketplace/agents.ts`
  - `src/app/marketplace/page.js`
  - `src/app/en/marketplace/page.js`
  - `src/app/agenthub/agents/[slug]/page.js`
  - `src/app/agents/[slug]/page.js`
- Rent and checkout start:
  - `src/server/rentals/actions.ts`
  - `src/server/payments/stripe.ts`
  - `src/server/payments/state.ts`
- Stripe confirmation and access creation:
  - `src/app/api/stripe/webhook/route.ts`
  - `src/server/payments/fulfillment.ts`
- Checkout result/status UI:
  - `src/app/checkout/success/page.js`
  - `src/app/checkout/checkout-success-client.jsx`
  - `src/app/api/checkout/status/route.ts`
  - `src/app/checkout/cancel/page.js`
- Active access and workspace entry:
  - `src/server/rentals/user-rentals.ts`
  - `src/app/agenthub/workspace/page.js`
  - `src/app/agenthub/workspace/[rentalId]/page.js`
  - `src/app/workspace/page.js`
  - `src/app/workspace/[rentalId]/page.js`
- Workspace execution guardrails touched by the activation path:
  - `src/app/api/agent-runs/route.ts`
  - `src/server/llm/runs.ts`
  - `src/server/workflows/runtime.ts`
  - `src/server/endpoints/runtime.ts`

### Expected State Machine

```text
marketplace_viewed
  -> rent_started
  -> checkout_started
  -> paid
  -> access_active
  -> workspace_opened
```

Observed implementation mapping:

- `marketplace_viewed`: marketplace reads `agents` with `status = approved` through `getMarketplaceAgents()` and `getMarketplaceAgentBySlug()`.
- `rent_started`: agent detail posts to `createAgentAccessAction()` with the approved agent id and slug.
- `checkout_started`: paid mode creates a `payments` row with `status = pending`, then creates a Stripe Checkout Session.
- `paid`: webhook receives `checkout.session.completed`, verifies the Stripe signature from the raw body, and calls `fulfillCheckoutSession()`.
- `access_active`: fulfillment validates payment snapshot, currency, current agent approval, and frozen `agent_version_id`, then inserts `rental_requests.status = active` and links the payment.
- `workspace_opened`: success/status pages redirect only when `payments.status = paid` and `rental_request_id` exists; workspace pages then load the access by current user id and rental id.

Failure and cancellation states remain explicit:

```text
checkout_cancelled -> payments.status = cancelled after checkout.session.expired, or pending when the user exits before webhook expiry
checkout_pending -> payments.status = pending and no access yet
checkout_failed -> payments.status = failed when checkout creation fails
access_missing -> payments.status = paid without rental_request_id, shown as activation pending/blocked and covered by sanity SQL
access_blocked -> payments.status = paid_blocked with activation_error
```

### Guardrail Findings

- Marketplace filtering is server-side and scoped to approved listings. The public marketplace path does not expose suspended, archived, rejected, draft, submitted, or in-review agents through the audited query.
- The rent action revalidates the agent server-side by id and `status = approved`; it does not trust marketplace UI state alone.
- Self-rental is blocked when the current user has the creator profile for the agent creator.
- Existing open access, pending payment, and activation-pending states are checked before creating another payment.
- In paid/Stripe mode, access creation is webhook-only. The success page and status endpoint read payment/access status and redirect only after `rental_request_id` is present.
- Stripe webhook handling uses raw request text plus signature verification and a five-minute timestamp tolerance.
- Fulfillment freezes the checked-out `agent_version_id` from the payment row into the access row.
- Fulfillment blocks activation when the amount/currency snapshot mismatches, the agent is no longer approved, the payment lacks a version, or duplicate access is detected.
- Workspace detail loads by `profile.id` and `rentalId`, so another user's rental id is not enough to open the workspace.
- Workspace run endpoints re-check ownership, open access status, frozen version, agent status, runtime type, and run limits before inserting `agent_runs`.

### Mismatches Or Risks

- No P0/P1 defect was found in the audited code path.
- `paid_without_access` remains the most important operational risk because the UX can only show activation pending/blocked after the webhook path fails or races. Existing sanity SQL already tracks this.
- Checkout cancellation is split between a user returning through `/checkout/cancel` while the payment remains pending and Stripe later expiring the session to `cancelled`. This is acceptable, but support docs should keep explaining that cancel page is not payment authority.
- `payment.status = paid` without `rental_request_id` is represented as `activation_pending` in agent/workspace surfaces and as a blocked state on the success page. That is intentionally conservative, but operators should treat any persistent case as manual review.
- `rental_requests` remains the legacy table name for active access. The implementation is consistent with the current docs, but future work should continue avoiding broad renames during closed beta.

### Validation Notes

- Documentation-only change made in this file.
- Required local validation after this edit: `npm run lint`, `npm run typecheck`, `npm run build`.
- End-of-work command required: `git status --short`.
