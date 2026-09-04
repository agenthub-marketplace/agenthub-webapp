# Creator Submission Guardrails Report

Date: 2026-06-16

## Scope

This pass audited creator submission guardrails for closed beta readiness without changing product behavior. It inspected creator submission entry points, server-side validation, creator-facing prechecks, admin review transitions, advanced runtime gates, review routing, and marketplace visibility.

No product code, database schema, migrations, RLS policies, Edge Functions, seed data, dependencies, creator forms, runtime config, validation rules, or admin approval logic were changed.

## Entry Points

- `src/app/creator/agents/new/page.js` redirects to `/code/agents/new`.
- `src/app/code/agents/new/page.js` gates the new-agent wizard with `requireCreatorAccess()`, loads the user's `creator_profile`, categories, and advanced runtime allowlist state.
- `src/app/code/_components/code-new-agent-content.jsx` posts to `submitAgentForReviewAction()` and only exposes advanced runtime templates/cards when the creator is allowlisted.
- `src/app/code/_components/creator-guardrail-preview.jsx` gives creator-facing precheck guidance before submission, but explicitly remains advisory; the server action and admin review remain the source of truth.
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
- Requires a visible decision-oriented LLM step for `workflow_automation`.
- Requires creator endpoint disclosure in public/runtime-facing text for `creator_endpoint`.
- Rejects workflow copy that promises unsupported external actions when no webhook step is present.
- Normalizes and validates advanced runtime endpoint URLs as public HTTPS URLs, rejecting localhost/private-IP style endpoints through the shared workflow URL safety check.
- Creates the agent as `draft`, creates the review version/assets, then transitions the agent to `submitted` only after required records are in place.
- Cleans up the draft agent on failed version or advanced-asset creation paths.
- Generates a stored security precheck after submission and redirects with `precheck=completed` or `precheck=failed`. A failed generation is surfaced, but it does not publish the agent.

Resubmission stays controlled:

- `resubmitAgentChangesAction()` requires creator access and ownership.
- Only `submitted`, `in_review`, and `rejected` agents are editable.
- A correction summary of at least 10 characters is required.
- The submitted runtime/execution mode must match the persisted active version.
- Advanced-runtime disclosure/external-action checks are re-run against edited listing copy.
- The `resubmit_creator_agent_changes` RPC sets the agent back to `submitted`, so corrections re-enter admin review rather than bypassing it.
- A new security precheck is generated after resubmission.

## Admin Control

Admin publication remains explicit in `src/server/admin/actions.ts`:

- `reviewAgentAction()` requires admin access.
- `start_review` only moves `submitted -> in_review`.
- Final decisions only run from `in_review`.
- `approve` rejects `forbidden_beta`, requires an active version, and verifies the runtime is enabled.
- `approve` requires a latest security precheck whose status is `passed` or `warning`, whose suggested risk is not `blocked`, and whose recommended action is neither `block_publication` nor `request_changes`.
- `approve` also requires `run_enabled` for every runtime except `static_guided`.
- `workflow_automation` approval requires the workflow row and every referenced webhook endpoint to be approved.
- `creator_endpoint` approval requires both the endpoint config and underlying creator API endpoint to be approved.
- Non-basic runtimes require a latest `security_reviews` row with `passed` or `waived` for the relevant asset.
- Every review decision writes `admin_reviews` and `audit_logs`.

Admin queue loading in `src/server/admin/review-queue.ts` only pulls `submitted` and `in_review` agents, while the broader admin agent-management list excludes archived agents. The queue also attaches `AgentManifestV1` plus the latest stored security precheck so `/code/admin` and `/code/admin/ops` can route review work into `P0/P1/P2/P3` without changing the approval state automatically.

Review routing is advisory for operators:

- `P0` routes missing/blocked prechecks or hard publication blockers.
- `P1` routes security review, runtime/asset, or operational blockers.
- `P2` routes creator-facing clarification or changes.
- `P3` routes standard review.

The routing hint can block the admin UI path indirectly through the same server approval checks, but it never approves or rejects an agent by itself.

## Marketplace Visibility

Marketplace reads in `src/server/marketplace/agents.ts` query only:

```text
agents.status = approved
```

After loading approved rows, marketplace code also filters out agents whose runtime setting is missing, disabled, or not `run_enabled` unless the runtime is `static_guided`.

The submission action never writes `approved`; only admin review or admin moderation restore can do that. This preserves the intended closed-beta sequence:

```text
creator submission -> security precheck -> submitted -> admin start review -> in_review -> admin approval -> approved marketplace listing
```

Suspended and archived agents are also kept out of normal public discovery by status filtering and management flows.

## Findings

No P0/P1 guardrail gap was found in the audited code paths. Creator submission and resubmission do not directly publish agents, approval is blocked by server-side precheck/runtime/asset/security gates, and marketplace visibility is still admin-controlled.

Residual risks to keep visible:

- The UI contains preview cards and creator guardrail previews, but these are not publication controls. Keep future preview work separate from approval state transitions.
- Advanced runtime exposure is guarded in both UI and server action. Any future runtime added to creator forms should follow the same pattern: creator allowlist, runtime setting, asset approval, and security review before approval.
- The code has legacy fallbacks for missing contract columns/RPC signatures. They are compatibility paths, not publication bypasses, but they should remain documented when old environments are still supported.
- If security precheck generation fails after submission, the agent can still be in `submitted`, but admin approval is blocked until a valid precheck exists or is regenerated from admin review.

## Validation

Because this pass changed documentation only, validate with the configured loop command and the repository validation sequence:

```bash
npm run agent:validate
npm run lint
npm run typecheck
npm run build
```
