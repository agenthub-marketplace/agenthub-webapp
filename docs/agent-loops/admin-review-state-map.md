# Admin Review State Map

## Task

Name: Admin review state map

Owner: Local Codex loop

Date: 2026-06-10

## Objective

Map the creator submission and admin review lifecycle. Produce documentation that makes valid states and transitions explicit before any future feature work.

## Allowed Scope

- Read `AGENTS.md`.
- Read creator/admin review docs and source files.
- Edit documentation under `docs/agent-loops/`.

## Forbidden Scope

- Do not change admin review behavior.
- Do not change creator submission behavior.
- Do not modify schema, migrations, RLS, Edge Functions, or data.
- Do not add dependencies.
- Do not commit, push, deploy, or run package installation.

## Loop Or State Machine Fit

Use a loop to produce the map.

The product should be represented as a state machine:

```text
draft -> submitted -> changes_requested -> submitted -> approved -> published
```

Additional states should be explicit when present:

```text
rejected
suspended
restored
archived
```

## Acceptance Criteria

- [x] Identify creator-facing states.
- [x] Identify admin-facing transitions.
- [x] Identify invalid or risky transitions to preserve.
- [x] Document whether source and docs agree.
- [x] Run the configured validation command.
- [x] Show `git status --short` at the end.

## Validation

```bash
npm run agent:validate
```

## Source Files Reviewed

- `src/server/agents/actions.ts`
- `src/server/agents/creator-agents.ts`
- `src/server/admin/actions.ts`
- `src/server/admin/review-queue.ts`
- `src/app/code/admin/review/page.js`
- `src/app/code/admin/agents/page.js`
- `src/app/code/_components/code-console-ui.jsx`
- `src/app/code/_components/code-edit-agent-content.jsx`
- `src/app/creator/agents/new/new-agent-content.jsx`
- `src/types/agent.ts`
- `docs/AGENTHUB_CURRENT_STATE.md`
- `supabase/migrations/0001_beta_schema.sql` (read only)
- `supabase/migrations/20260521165400_creator_resubmission_after_changes.sql` (read only)
- `supabase/migrations/20260521181817_add_creator_resubmission_changelog.sql` (read only)
- `supabase/migrations/20260528193801_archive_suspended_agents.sql` (read only)

## Persisted Agent States

The persisted `agents.status` state set is:

```text
draft
submitted
in_review
approved
rejected
suspended
archived
```

This is defined in `src/types/agent.ts` and the latest status constraint in
`supabase/migrations/20260528193801_archive_suspended_agents.sql`. The initial
schema did not include `archived`, but the archive migration expands the check
constraint.

There is no separate persisted `changes_requested`, `published`, or `restored`
agent status:

- `changes_requested` is represented as `agents.status = 'in_review'` plus the
  latest `admin_reviews.decision = 'in_review'` with non-empty notes.
- `published` is the product label for `agents.status = 'approved'`.
- `restored` is an admin action that moves `suspended -> approved`.

## Creator-Facing State Map

```text
new form
  -> draft (temporary insert during submission)
  -> submitted
  -> in_review
  -> in_review + admin feedback notes ("changes requested")
  -> submitted (creator resubmits changes)
  -> approved ("published" in marketplace)
  -> suspended (visible to creator/admin, removed from public marketplace)
  -> approved (admin restore)
  -> archived (hidden from creator/admin lists that exclude archived)

submitted or in_review
  -> rejected
  -> submitted (creator edits and resubmits)
```

Creator entry points and guards:

- Initial submission is `submitAgentForReviewAction` in
  `src/server/agents/actions.ts`. It inserts an agent as `draft`, creates the
  active version and runtime assets, then updates the agent to `submitted`.
- Creator risk `forbidden_beta` is rejected before submission.
- Creator resubmission is `resubmitAgentChangesAction`. It only accepts agents
  in `submitted`, `in_review`, or `rejected`, requires a changes summary of at
  least 10 characters, preserves the existing runtime type/execution mode, and
  returns the agent to `submitted`.
- Creator UI treats `submitted`, `in_review`, and `rejected` as editable through
  `canEditAgent` in `src/app/code/_components/code-console-ui.jsx`.
- Creator lists exclude archived agents in `getCreatorAgentsForUser` and
  `getCreatorAgentForCodeDetail`.

Creator-facing labels:

- `submitted`: submitted / waiting for admin.
- `in_review`: admin has taken the item into review.
- `in_review` plus latest admin review notes: "Modifications demandees".
- `approved`: approved/published and eligible for marketplace discovery.
- `rejected`: refused, but still editable for resubmission.
- `suspended`: temporarily removed from publication by admin.
- `archived`: no longer listed in standard creator/admin management views.

## Admin-Facing Transition Map

Review queue transitions live in `reviewAgentAction`:

| From | Admin decision/action | To | Guard |
| --- | --- | --- | --- |
| `submitted` | `start_review` | `in_review` | Agent must currently be `submitted`. |
| `in_review` | `changes` | `in_review` | Notes must be at least 10 characters. |
| `in_review` | `approve` | `approved` | Runtime enabled, risk not `forbidden_beta`, active version present, runtime assets approved when required, security review passed or waived when required. |
| `in_review` | `reject` | `rejected` | Agent must currently be `in_review`. |

Publication moderation transitions live in `moderateAgentPublicationAction`:

| From | Admin moderation action | To | Guard |
| --- | --- | --- | --- |
| `approved` | `suspend` | `suspended` | Agent must currently be `approved`. |
| `suspended` | `restore` | `approved` | Agent must currently be `suspended`, have an active version, and not be `forbidden_beta`. |
| `suspended` | `archive` | `archived` | Agent must currently be `suspended`. |

Admin queue/list visibility:

- `getAdminReviewQueue` includes only `submitted` and `in_review`.
- `getAdminAgentManagementList` includes non-archived agents and exposes
  publication moderation for `approved` and `suspended`.
- Public read policy and marketplace queries depend on `status = 'approved'`;
  therefore `suspended`, `archived`, `submitted`, `in_review`, `rejected`, and
  `draft` must not be public marketplace states.

## Runtime And Asset Gates Before Approval

Approval is intentionally more than a status update:

- All approvals require a runtime setting row with `enabled = true`.
- `forbidden_beta` can never be approved.
- `workflow_automation` approval requires the workflow config to be approved,
  referenced webhook endpoints to be approved, and a passed or waived security
  review for the workflow asset.
- `creator_endpoint` approval requires the endpoint config and creator API
  endpoint to be approved, plus a passed or waived security review.
- `document_file` is treated as a sensitive runtime for security-review gating
  in admin approval logic, even though normal creator submission currently
  restricts direct new submissions to `llm_prompt`, `workflow_automation`, or
  `creator_endpoint`.
- `llm_prompt` and `static_guided` do not require a security review by default.

Asset approval actions are separate from final agent approval:

- `approveWorkflowAutomationAssetsAction` can approve workflow assets only while
  the agent is `submitted` or `in_review`.
- `approveCreatorEndpointAssetsAction` can approve creator endpoint assets only
  while the agent is `submitted` or `in_review`.
- Endpoint moderation can independently move creator webhook/API endpoints to
  `approved`, `rejected`, or `suspended`.

## Review Routing Overlay

`AgentManifestV1.reviewRouting` is an orchestration overlay, not a persisted
state.

It does not add new transitions to the admin state machine. It gives the admin
console and Codex loops a deterministic first action:

```text
P0 -> block publication or request creator changes before approval
P1 -> clear security review, runtime ops, asset approval, or stale precheck
P2 -> ask creator for clarification while preserving the existing state
P3 -> proceed with standard human review
```

Owners are advisory:

```text
admin
creator
platform_ops
security_reviewer
```

State-machine invariants still win:

- `reviewRouting.nextAction = approve_assets` never approves the agent itself.
- `reviewRouting.nextAction = run_security_review` never passes the review.
- `reviewRouting.nextAction = request_creator_changes` still uses
  `agents.status = in_review` plus admin review notes.
- `reviewRouting.nextAction = review_standard` still requires explicit admin
  action before `approved`.
- `reviewRouting.blocksApproval = true` is an approval guard, not a DB status.

Loop usage:

- Start with `/code/admin` or `/code/admin/ops` routing counts.
- Pick P0/P1 before broad UI polish.
- Use this state map to verify the proposed fix preserves legal transitions.
- Do not introduce `changes_requested`, `published`, or `restored` as persisted
  states merely to satisfy routing labels.

## Invalid Or Risky Transitions To Preserve

These transitions are currently blocked and should remain blocked unless a
future product change explicitly redesigns the state machine:

- Creator cannot publish, approve, reject, suspend, restore, or archive an
  agent.
- Creator cannot submit or resubmit `forbidden_beta`.
- Creator cannot change runtime type or execution mode during resubmission.
- Admin cannot approve directly from `submitted`; `start_review` must first move
  the agent to `in_review`.
- Admin cannot request changes or reject from `submitted`; the agent must be
  `in_review`.
- Admin cannot approve `forbidden_beta`.
- Admin cannot approve sensitive runtime agents before required runtime assets
  and security reviews pass or are waived.
- Admin cannot suspend non-approved agents.
- Admin cannot restore non-suspended agents.
- Admin cannot archive non-suspended agents.
- Archived agents should not be restored through the current UI/action path.
- `changes_requested` should not be introduced as a DB status without a full
  migration and compatibility plan, because current code encodes it as
  `in_review` plus latest admin feedback notes.
- `published` should not be introduced as a DB status without replacing the
  existing marketplace/public-read invariant that `approved` means published.

## Source And Docs Agreement

The source and docs mostly agree on the business flow, with vocabulary drift:

- `docs/AGENTHUB_CURRENT_STATE.md` says admin review supports request changes,
  approve, reject, suspend, and restore. This matches source behavior.
- The initial task sketch names
  `draft -> submitted -> changes_requested -> submitted -> approved -> published`.
  Source uses `in_review` instead of `changes_requested`, and `approved` instead
  of `published`.
- The task sketch lists `restored` as an additional state. Source implements
  restore as an action, not a persisted state.
- The task sketch lists `archived`; source supports `archived`, but only through
  `suspended -> archived`.
- `creator-submission-guardrails.md` uses `under_review`; source uses
  `in_review`.

Recommended canonical terminology for future work:

```text
draft -> submitted -> in_review -> approved
                         |   |
                         |   -> rejected
                         |
                         -> in_review with feedback notes
                              -> submitted

approved -> suspended -> approved
                    |
                    -> archived
```

Product/UI aliases should be documented as labels, not persisted states:

- "changes requested" = `in_review` with latest admin review notes.
- "published" = `approved`.
- "restored" = transition `suspended -> approved`.

## Future Feature Notes

Before adding future admin-review features, keep state transitions explicit and
server-guarded:

- Add any new persisted state first to the DB constraint, TypeScript status
  union, admin review decision constraint if needed, labels, queue queries, and
  public visibility rules.
- Decide whether a new state is creator-editable, admin-reviewable,
  marketplace-visible, rentable, workspace-runnable, and review-eligible.
- Keep audit logs for admin actions and avoid silent status writes from client
  components.
- Avoid conflating admin feedback with state unless the product intentionally
  migrates away from the current `in_review` plus notes model.
