# AgentHub Next Implementation Plan

## Purpose

This plan turns the strategic goal into an execution sequence:

```text
user rents an agent
-> workspace adapts to that agent
-> runtime runs safely
-> result/history/review stay consistent
-> creator can sell and later receive revenue
-> admin gets automated security triage before deep review
```

It builds on:

- `docs/agent-manifest-v1.md`
- `docs/security-precheck-agent.md`
- `docs/workspace-dynamic-blocks.md`
- `docs/agent-runtime-roadmap.md`

## Current Code Entry Points

Use these as the first integration points:

```text
src/lib/agent-contract.ts
src/lib/workspace-actions.ts
src/server/admin/review-queue.ts
src/server/agents/creator-agents.ts
src/server/workflows/runtime.ts
src/server/endpoints/runtime.ts
src/server/documents/runtime.ts
src/app/agenthub/workspace/[rentalId]/page.js
src/app/code/admin/review/page.js
```

Do not start with a broad UI rewrite. Start with server-side derivation and
read-only admin/workspace diagnostics.

## Current Progress Snapshot

The first foundation layer is now partially implemented:

- `src/server/agents/manifest.ts` derives a server-side `AgentManifestV1`
  from the current agent version, runtime assets, runtime settings, security
  reviews, and creator allowlist state.
- The manifest includes a deterministic `securityPrecheck` for admin triage.
- `/code/admin/review` surfaces precheck risk, blockers, recommended action,
  and prioritizes the queue by precheck severity.
- Admins can persist the deterministic precheck into
  `agent_security_prechecks`, making the triage report stable across review
  sessions.
- `src/server/agents/workspace-runtime-contract.ts` centralizes workspace
  runtime eligibility and disabled-state copy for assistant, document,
  workflow, and creator endpoint runners.
- `src/server/workspace/recipe.ts` derives a first workspace recipe from the
  runtime contract and manifest so future workspace UI can render by block
  instead of branching per runtime.

The goal of the next layer is not to add more runtime power immediately. The
goal is to make the existing advanced runtimes easier to publish, review,
launch, debug, and monetize without weakening the current gates.

## Phase 1: Agent Manifest Server Helper

Add a server-only helper:

```text
src/server/agents/manifest.ts
```

Initial API:

```ts
buildAgentManifest(agentVersionId: string): Promise<AgentManifestV1>
```

It should derive the manifest from existing tables:

- `agents`;
- `agent_versions`;
- `agent_categories`;
- `agent_version_workflows`;
- creator endpoint bindings;
- `agent_runtime_settings`;
- `security_reviews`.

Rules:

- no new DB schema in this phase;
- use service-role/server-only helpers only;
- fail closed on unknown runtime;
- keep `runtime_type` as product routing;
- keep `execution_mode` as compatibility detail.

First consumers:

1. Admin review read-only panel.
2. Workspace debug/logging helper.
3. Security precheck input.

## Phase 2: Security Precheck V0

Add an additive table only after the manifest helper is stable:

```text
agent_security_prechecks
```

Status values:

```text
pending
running
passed
warning
failed
error
stale
```

V0 should run deterministic checks first:

- runtime known and enabled;
- creator allowlisted for advanced runtime;
- workflow exists and has valid steps;
- endpoint exists and is approved;
- security review exists when required;
- public promise matches runtime capability;
- creator-hosted data disclosure is present.

LLM summary can be added after deterministic output is useful.

Important boundaries:

- precheck never approves or rejects automatically;
- precheck never calls creator endpoints;
- precheck never executes creator code;
- security review remains the official blocking admin decision.

## Phase 3: Admin Review Integration

Update AgentHub Code admin review so each submitted version shows:

- manifest summary;
- publication type: guided assistant or advanced agent;
- runtime type;
- infra mode;
- required approvals;
- latest precheck status;
- security review status;
- missing blockers.

Approval must continue to fail closed for:

- disabled runtime;
- advanced runtime without allowlist;
- workflow/API asset not approved;
- required security review not passed or waived.

## Phase 4: Dynamic Workspace Recipe

Add a server helper:

```text
src/server/workspace/recipe.ts
```

Initial API:

```ts
buildWorkspaceRecipe(agentManifest, accessState)
```

Return:

```json
{
  "blocks": [],
  "disabled_reason": null,
  "runtime_panel": "assistant | document | workflow | endpoint"
}
```

Use the block registry from `docs/workspace-dynamic-blocks.md`.

First UI target:

- keep current workspace layout;
- add a derived recipe object;
- use it to improve ordering and disabled-state copy;
- avoid refactoring all runtime panels at once.

## Phase 5: Creator-Hosted Infrastructure Contract

Formalize creator-hosted agents as a first-class infra mode:

```text
infra_mode = creator_hosted
```

Required guardrails:

- HTTPS endpoint only;
- no localhost/private IP;
- HMAC signature;
- timeout;
- response schema limit;
- admin endpoint approval;
- security review passed/waived;
- user-facing disclosure that creator infrastructure receives input.

Do not expose endpoint URLs or raw payloads to users unless intentionally
public.

## Phase 6: Revenue Ledger Planning

Current revenue analytics are GMV sandbox. Before creator payouts, add a
separate planning spec for:

- payment event;
- access creation;
- platform fee;
- creator gross amount;
- payout hold;
- refund/chargeback state;
- payout readiness.

Do not connect Stripe Connect until:

- access state is stable;
- security precheck/review gates are reliable;
- creator-hosted data disclosure is clear;
- payout ledger can be audited.

## Phase 7: Agent Quality Automation

Once manifest and precheck exist, compute an internal quality score:

```text
manifest completeness
+ precheck result
+ security review result
+ smoke-run success
+ verified review quality
+ refund/support incidents
```

Use it for admin prioritization first, not public ranking.

## Recommended First Ticket

Implement `buildAgentManifest(agentVersionId)` read-only and display the result
in admin review.

Acceptance:

- no schema change;
- no marketplace behavior change;
- admin can see derived manifest;
- guided assistants and advanced agents are classified correctly;
- unknown runtime fails closed with visible admin error;
- lint/typecheck/build pass.

Status: implemented as a first deterministic read-only helper.

## Recommended Next Tickets

### Ticket 1: Persist Security Precheck Results

Move from computed-only precheck to stored precheck rows:

```text
agent_security_prechecks
```

Why:

- admins need a stable review artifact;
- resubmissions can mark old prechecks as stale;
- future LLM summarization can attach to deterministic findings;
- security review decisions can reference a concrete precheck id.

Scope:

- additive migration only;
- server action to generate/retry precheck for the latest version;
- admin review displays latest stored precheck, falling back to computed
  precheck if missing;
- no automatic approval/rejection.

Status: implemented for deterministic prechecks on submission, resubmission,
and admin manual regeneration. LLM summarization remains future work.

### Ticket 2: Workspace Recipe UI Adapter

Use `workspaceRecipe` in the workspace UI without a full rewrite.

Scope:

- show recipe-derived disabled reason and runtime panel state;
- ensure blocked/disabled states appear before empty history;
- keep current runner components;
- align FR/EN workspace detail behavior around the same contract.

### Ticket 3: Advanced Agent Smoke Console

Add an admin-only diagnostic page for advanced agent readiness:

```text
/code/admin/ops/advanced-agents
```

It should answer:

- is runtime setting enabled/run-enabled?
- is creator allowlisted?
- are workflow/API assets approved?
- is security review passed/waived?
- does the latest run succeed?
- what is the exact blocker before marketplace publication or workspace run?

This avoids debugging advanced agents across five different screens.

### Ticket 4: Creator Infra Fallback Readiness

Make creator-hosted execution visible and auditable:

- show infra mode in admin review and agent detail;
- show user-facing disclosure in workspace for `creator_endpoint`;
- include endpoint availability errors in admin ops;
- keep endpoint URL and raw payload server-only.

Do not add iframe or redirect handoff yet.

### Ticket 5: Revenue Ledger Design Before Payouts

Keep current "Revenus beta" as GMV sandbox. Before Stripe Connect, define a
ledger that separates:

- checkout payment;
- active access;
- refund/blocked state;
- creator gross;
- platform fee;
- payout hold;
- payout-ready event.

This is a design/spec ticket first, not Stripe Connect implementation.

### Ticket 6: Agent Quality Score Internal

Compute internal quality, not public ranking:

```text
manifest completeness
+ precheck state
+ security review state
+ smoke-run success
+ verified review health
+ payment/access incidents
```

Use it for admin prioritization and beta readiness, not for marketplace
ranking until enough data exists.

### Ticket 7: Creator Submission Guardrails V2

Prevent low-quality advanced agents earlier in the creator flow:

- inline warnings when output promise does not match runtime;
- require decision-like step for workflow agents;
- require creator-infra disclosure for endpoint agents;
- preview blockers before submission;
- no relaxation of server-side validation.
