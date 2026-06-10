# Creator Submission Guardrails Report

Date: 2026-06-10

## Scope

This pass audited creator submission guardrails for closed beta readiness without changing product behavior. It inspected creator submission entry points, server-side validation, admin review transitions, advanced runtime gates, and marketplace visibility.

No product code, database schema, migrations, RLS policies, Edge Functions, seed data, dependencies, creator forms, runtime config, validation rules, or admin approval logic were changed.

## Entry Points

- `src/app/creator/agents/new/page.js` redirects to `/code/agents/new`.
- `src/app/code/agents/new/page.js` gates the new-agent wizard with `requireCreatorAccess()`, loads the user's `creator_profile`, categories, and advanced runtime allowlist state.
- `src/app/code/_components/code-new-agent-content.jsx` posts to `submitAgentForReviewAction()` and only exposes advanced runtime templates/cards when the creator is allowlisted.
- `src/app/creator/agents/[id]/edit/page.js` redirects to `/code/agents/[id]/edit`.
- `src/app/code/_components/code-edit-agent-content.jsx` posts corrections to `resubmitAgentChangesAction()` and keeps the persisted runtime type hidden/read-only from the creator edit flow.

## Submission Validation

`src/server/agents/actions.ts` is the authoritative guardrail for initial submission:

- Requires creator access before reading form data.
- Requires a linked `creator_profile` through `getCreatorProfileForUser()`.
- Requires all core listing, delivery, pricing, risk, and execution-method fields.
- Validates pricing type, positive EUR price, known risk levels, and rejects `forbidden_beta`.
- Validates workspace mode, setup requirement type, execution mode, and runtime type.
- Forces creator submissions to `execution_mode = llm_prompt`.
- Allows only `llm_prompt`, `workflow_automation`, and `creator_endpoint` runtime types, with advanced runtimes additionally checked against server-side creator allowlists.
- Normalizes and validates advanced runtime endpoint URLs as public HTTPS URLs, rejecting localhost/private-IP style endpoints through the shared workflow URL safety check.
- Creates the agent as `draft`, creates the review version/assets, then transitions the agent to `submitted` only after required records are in place.
- Cleans up the draft agent on failed version or advanced-asset creation paths.

Resubmission stays controlled:

- `resubmitAgentChangesAction()` requires creator access and ownership.
- Only `submitted`, `in_review`, and `rejected` agents are editable.
- A correction summary of at least 10 characters is required.
- The submitted runtime/execution mode must match the persisted active version.
- The `resubmit_creator_agent_changes` RPC sets the agent back to `submitted`, so corrections re-enter admin review rather than bypassing it.

## Admin Control

Admin publication remains explicit in `src/server/admin/actions.ts`:

- `reviewAgentAction()` requires admin access.
- `start_review` only moves `submitted -> in_review`.
- Final decisions only run from `in_review`.
- `approve` rejects `forbidden_beta`, requires an active version, and verifies the runtime is enabled.
- `workflow_automation` approval requires the workflow row and every referenced webhook endpoint to be approved.
- `creator_endpoint` approval requires both the endpoint config and underlying creator API endpoint to be approved.
- Non-basic runtimes require a latest `security_reviews` row with `passed` or `waived` for the relevant asset.
- Every review decision writes `admin_reviews` and `audit_logs`.

Admin queue loading in `src/server/admin/review-queue.ts` only pulls `submitted` and `in_review` agents, while the broader admin agent-management list excludes archived agents.

## Marketplace Visibility

Marketplace reads in `src/server/marketplace/agents.ts` query only:

```text
agents.status = approved
```

The submission action never writes `approved`; only admin review or admin moderation restore can do that. This preserves the intended closed-beta sequence:

```text
creator submission -> submitted -> admin start review -> in_review -> admin approval -> approved marketplace listing
```

Suspended and archived agents are also kept out of normal public discovery by status filtering and management flows.

## Findings

No P0/P1 guardrail gap was found in the audited code paths. Creator submission and resubmission do not directly publish agents, and marketplace visibility is still admin-controlled.

Residual risks to keep visible:

- The UI contains preview cards for public listing and workspace views, but these are not publication controls. Keep future preview work separate from approval state transitions.
- Advanced runtime exposure is guarded in both UI and server action. Any future runtime added to creator forms should follow the same pattern: creator allowlist, runtime setting, asset approval, and security review before approval.
- The code has legacy fallbacks for missing contract columns/RPC signatures. They are compatibility paths, not publication bypasses, but they should remain documented when old environments are still supported.

## Validation

Because this pass changed documentation only, validate with the configured loop command and the repository validation sequence:

```bash
npm run agent:validate
npm run lint
npm run typecheck
npm run build
```
