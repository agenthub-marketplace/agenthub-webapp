# Workspace Fluidity Review Report

Date: 2026-06-10

Updated: 2026-06-11

## Scope

This pass inspected the workspace flow without changing product behavior. It read the current state doc, the workspace loop task, the loop runner docs, workspace routes, workspace action components, run endpoints, rental access loading, and verified review submission.

No P0/P1 runtime defect was fixed in this pass.

The 2026-06-11 update inspected the shared workspace recipe layer after the
second adapter increment. It documents the current state of recipe blocks,
runtime-specific next actions, disabled runtime guidance, and creator-hosted
disclosure.

## Flow Map

- Workspace entry redirects:
  - `src/app/workspace/page.js` redirects to `/agenthub/workspace`.
  - `src/app/workspace/[rentalId]/page.js` redirects to `/agenthub/workspace/[rentalId]`.
  - `src/app/en/workspace/*` stays on the English workspace route.
- Workspace list:
  - `src/app/agenthub/workspace/page.js`
  - `src/app/en/workspace/page.js`
  - Both load `getUserRentals()` and `getUserPaymentOrders()`.
- Workspace detail:
  - `src/app/agenthub/workspace/[rentalId]/page.js`
  - `src/app/en/workspace/[rentalId]/page.js`
  - Both gate access through `getUserRentalById()`, `rental.accessOpen`, runtime flags, agent status, and server env.
- Workspace runners:
  - `WorkspaceRunActions.jsx` -> `POST /api/agent-runs`
  - `DocumentWorkspaceActions.jsx` -> `POST /api/agent-documents/upload`, then `POST /api/agent-runs/document`
  - `WorkflowWorkspaceActions.jsx` -> `POST /api/agent-runs/workflow`, then polling
  - `CreatorEndpointWorkspaceActions.jsx` -> `POST /api/agent-runs/endpoint`
- Run history:
  - `getUserAgentRuns()` reads latest `agent_runs` and joins linked `agent_run_files`.
- Verified review:
  - Workspace forms call `submitRentalReviewAction()`.
  - The action validates access ownership, reviewable status, one-review uniqueness, and self-review guardrails.

## Developer-Friction Observations

1. Workspace detail behavior now shares the main recipe UI, but the route files
   still duplicate loading and gate plumbing.

   FR and EN detail pages both pass `workspaceRecipe` into
   `WorkspaceAgentExperience`, so recipe blocks and next actions are rendered by
   the same component. The remaining friction is upstream: each locale route
   still wires rental loading, runner enablement, and history props. Future
   runtime changes should keep using the shared contract rather than adding new
   locale-specific UI decisions.

2. Runtime eligibility logic is repeated across page and endpoint boundaries.

   The detail pages compute runner enablement from env flags, runtime settings, contract fields, agent status, and data policy. Each API endpoint then revalidates its own variant of the same eligibility. The duplication is defensible for server-side security, but developers need a single diagnostic checklist before changing workspace behavior.

3. Disabled runtime states are more actionable, but still need smoke coverage.

   The workspace contract now exposes `disabledReason` and
   `workspaceRecipe.nextActions`. When execution is disabled, the readiness
   summary shows a concrete unblock action instead of only an empty runner or
   generic dead end. This still needs visual smoke on a real
   `/agenthub/workspace/[rentalId]` for assistant, workflow, and creator endpoint
   agents.

4. Runtime-specific next actions are present at the recipe level.

   `src/server/workspace/recipe.ts` now produces short localized next actions
   for assistant, document, workflow, and creator endpoint runtimes. The shared
   `WorkspaceAgentExperience` renders those actions in the global readiness
   summary. This gives users a clearer "what do I do next?" path before the
   runtime-specific runner controls.

5. Creator-hosted and hybrid execution is visible without exposing sensitive
   internals.

   Creator endpoint and workflow runtimes continue to rely on the manifest trust
   boundary. The workspace recipe surfaces trust warnings and disclosure copy,
   while endpoint URLs, raw payloads, and secrets remain server-only.

6. Review success navigation may surprise workspace testers.

   `submitRentalReviewAction()` accepts workspace return paths for errors, but after a successful review it redirects to the public agent page when the agent slug is available. That preserves current behavior, yet testers running the workspace flow may expect to remain on the workspace review tab. Do not change this without an explicit product decision, because reviews also affect public listing visibility.

7. The local loop runner is present and bounded, but it is recursive for this environment.

   `npm run agent:workspace` shells into `codex exec` with the task file and then runs `npm run agent:validate`. That is useful for local human-driven loops. From an already-running Codex delegation, a manual report pass is lower risk than spawning another Codex agent that may edit the same dirty worktree.

## Safe Next Step

Run a visual smoke test with a user that owns active accesses for:

- one assistant/runtime `llm_prompt`;
- one `workflow_automation` agent;
- one `creator_endpoint` agent;
- one disabled runtime case if available.

For each rental detail page, confirm:

- recipe blocks render before history/empty states;
- "Prochaines actions" or "Next actions" appears in the readiness summary;
- disabled runtimes show an actionable unblock reason;
- creator-hosted disclosure appears without endpoint URL or payload details;
- runner history remains scoped to the access.

For now, keep this pass as documentation output and validate with:

```bash
npm run agent:validate
```
